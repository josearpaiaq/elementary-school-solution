"use server";

import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { parseCsv } from "@/lib/csv";
import { prisma } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";

const COLUMNS = ["classroom", "student_name", "guardian_name", "guardian_phone"] as const;

export async function importCsv(formData: FormData) {
  await requirePermission("students:import");
  const file = formData.get("file");
  if (!(file instanceof File)) redirect("/import?error=1");

  const [header = [], ...rows] = parseCsv(await file.text());
  const names = header.map((h) => h.trim().toLowerCase());
  const index = Object.fromEntries(COLUMNS.map((c) => [c, names.indexOf(c)])) as Record<(typeof COLUMNS)[number], number>;
  if (Object.values(index).some((i) => i < 0)) redirect("/import?error=1");

  let imported = 0;
  let skipped = 0;
  for (const row of rows) {
    const classroomName = row[index.classroom]?.trim();
    const studentName = row[index.student_name]?.trim();
    const guardianName = row[index.guardian_name]?.trim();
    const phone = normalizePhone(row[index.guardian_phone] ?? "");
    if (!classroomName || !studentName || !guardianName || !phone) {
      skipped++;
      continue;
    }

    const classroom = await prisma.classroom.upsert({
      where: { name: classroomName },
      create: { name: classroomName },
      update: {},
    });
    const guardian = await prisma.guardian.upsert({
      where: { phone },
      create: { name: guardianName, phone },
      update: { name: guardianName },
    });
    const student =
      (await prisma.student.findFirst({ where: { name: studentName, classroomId: classroom.id } })) ??
      (await prisma.student.create({ data: { name: studentName, classroomId: classroom.id } }));
    await prisma.studentGuardian.upsert({
      where: { studentId_guardianId: { studentId: student.id, guardianId: guardian.id } },
      create: { studentId: student.id, guardianId: guardian.id },
      update: {},
    });
    imported++;
  }
  redirect(`/import?imported=${imported}&skipped=${skipped}`);
}
