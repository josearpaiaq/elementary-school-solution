// The seed wipes every table, so it refuses to run against a non-local database.
import "../scripts/assert-local-db";
import type { Classroom, Guardian } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createInvitation } from "@/lib/invitations";
import { hashPassword } from "@/lib/password";
import { savePhoto } from "@/lib/photos";

const FIRST_NAMES = ["Ana", "Luis", "Sofía", "Mateo", "Valentina", "Diego", "Camila", "Santiago", "Regina", "Emiliano", "Ximena", "Leonardo", "María", "Pablo", "Renata", "Andrés", "Fernanda", "Daniel", "Lucía", "Iker", "Paula"];
const SURNAMES = ["García", "Hernández", "López", "Martínez", "González", "Pérez", "Rodríguez", "Sánchez", "Ramírez", "Torres", "Flores", "Rivera", "Gómez", "Díaz", "Cruz", "Morales", "Reyes", "Jiménez", "Ruiz", "Vargas", "Castillo", "Ortiz", "Mendoza"];
const ADULT_NAMES = ["Laura", "Jorge", "Patricia", "Ricardo", "Carmen", "Miguel", "Gabriela", "Roberto", "Alejandra", "Fernando", "Mónica", "Héctor", "Claudia", "Arturo", "Verónica", "Raúl", "Silvia"];
const RELATIONSHIPS = ["Abuela", "Abuelo", "Tía", "Tío", "Niñera"];

const STUDENTS_PER_CLASSROOM = 25;
const pick = <T,>(list: T[], i: number) => list[i % list.length];

function avatarSvg(name: string, hue: number): string {
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="hsl(${hue},55%,55%)"/><text x="50%" y="50%" font-family="sans-serif" font-size="80" fill="#fff" text-anchor="middle" dominant-baseline="central">${initials}</text></svg>`;
}

async function main() {
  await prisma.$transaction([
    prisma.groupReminder.deleteMany(),
    prisma.invitation.deleteMany(),
    prisma.pickupEvent.deleteMany(),
    prisma.pickupApproval.deleteMany(),
    prisma.permissionResponse.deleteMany(),
    prisma.requestClassroom.deleteMany(),
    prisma.permissionRequest.deleteMany(),
    prisma.pickupAuthorization.deleteMany(),
    prisma.pickupPerson.deleteMany(),
    prisma.photo.deleteMany(),
    prisma.studentGuardian.deleteMany(),
    prisma.student.deleteMany(),
    prisma.guardian.deleteMany(),
    prisma.classroom.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const admin = await prisma.user.create({
    data: { login: "admin@escuela.test", name: "Sofía (Coordinación)", passwordHash: hashPassword("admin123"), role: "ADMIN" },
  });

  // Hashing is slow on purpose, so seeded accounts share one hash per role.
  const teacherHash = hashPassword("maestra123");
  const guardianHash = hashPassword("tutor123");
  const pickupHash = hashPassword("autorizado123");

  const classrooms: Classroom[] = [];
  for (let grade = 1; grade <= 6; grade++) {
    for (const group of ["A", "B"]) {
      const n = classrooms.length + 1;
      const teacher = await prisma.user.create({
        data: {
          login: `maestra${n}@escuela.test`,
          name: `Maestra ${pick(ADULT_NAMES, n * 3)} ${pick(SURNAMES, n * 5)}`,
          passwordHash: teacherHash,
          role: "TEACHER",
        },
      });
      classrooms.push(await prisma.classroom.create({ data: { name: `${grade}°${group}`, teacherId: teacher.id } }));
    }
  }

  let guardianCount = 0;
  const newGuardian = async (surname: string) => {
    guardianCount++;
    const name = `${pick(ADULT_NAMES, guardianCount)} ${surname}`;
    const phone = `+5255${String(10000000 + guardianCount)}`;
    // Every 10th guardian has not activated an account yet.
    const user =
      guardianCount % 10 === 0
        ? null
        : await prisma.user.create({ data: { login: phone, name, passwordHash: guardianHash, role: "GUARDIAN" } });
    return prisma.guardian.create({ data: { name, phone, userId: user?.id } });
  };

  const primaryByStudent: Guardian[] = [];
  let pickupCount = 0;
  for (const [c, classroom] of classrooms.entries()) {
    for (let k = 0; k < STUDENTS_PER_CLASSROOM; k++) {
      const i = c * STUDENTS_PER_CLASSROOM + k;
      // Some students are siblings of a student in the previous classroom and share their guardian.
      const isSibling = k === 3 && c > 0;
      const family = isSibling ? i - STUDENTS_PER_CLASSROOM : i;
      const surname = pick(SURNAMES, family * 7);
      const primary = isSibling ? primaryByStudent[family] : await newGuardian(surname);
      primaryByStudent[i] = primary;
      const guardianIds = [primary.id];
      if (!isSibling && i % 2 === 0) guardianIds.push((await newGuardian(pick(SURNAMES, i * 11 + 1))).id);

      const student = await prisma.student.create({
        data: {
          name: `${pick(FIRST_NAMES, i * 13)} ${surname} ${pick(SURNAMES, i * 3 + 2)}`,
          classroomId: classroom.id,
          guardians: { create: guardianIds.map((guardianId) => ({ guardianId })) },
        },
      });

      if (isSibling) {
        // The family's existing pickup person is also authorized for the sibling.
        const familyPerson = await prisma.pickupPerson.findFirst({ where: { addedByGuardianId: primary.id } });
        if (familyPerson) {
          await prisma.pickupAuthorization.create({ data: { pickupPersonId: familyPerson.id, studentId: student.id } });
        }
      } else if (i % 3 === 0) {
        pickupCount++;
        const name = `${pick(ADULT_NAMES, i + 5)} ${surname}`;
        const phone = `+5256${String(10000000 + pickupCount)}`;
        const hasAccount = pickupCount % 2 === 1;
        const user = hasAccount
          ? await prisma.user.create({ data: { login: phone, name, passwordHash: pickupHash, role: "PICKUP" } })
          : null;
        await prisma.pickupPerson.create({
          data: {
            name,
            phone,
            relationship: pick(RELATIONSHIPS, i),
            photoId: await savePhoto(Buffer.from(avatarSvg(name, (i * 47) % 360)), "image/svg+xml"),
            userId: user?.id,
            addedByGuardianId: primary.id,
            authorizations: { create: { studentId: student.id } },
          },
        });
      }
    }
  }

  const hour = 60 * 60 * 1000;
  const thirdGrade = classrooms.filter((c) => c.name.startsWith("3°"));
  const request = await prisma.permissionRequest.create({
    data: {
      title: "Visita al Museo de Historia Natural",
      description: "Salida en autobús escolar de 9:00 a 13:00. Llevar lunch, gorra y agua.",
      eventDate: new Date(Date.now() + 5 * 24 * hour),
      deadline: new Date(Date.now() + 36 * hour),
      status: "OPEN",
      publishedAt: new Date(),
      classrooms: { create: thirdGrade.map((c) => ({ classroomId: c.id })) },
    },
  });

  const students = await prisma.student.findMany({
    where: { classroomId: { in: thirdGrade.map((c) => c.id) } },
    include: { guardians: { include: { guardian: true } } },
    orderBy: { name: "asc" },
  });
  // Partial answers, skipping the first student so the demo guardian has something to sign.
  for (const [j, student] of students.entries()) {
    const [first, second] = student.guardians.map((g) => g.guardian).filter((g) => g.userId);
    const answers: [Guardian | undefined, string | null][] = [
      [first, j === 0 || j % 5 === 4 ? null : j % 5 === 3 ? "DENIED" : "AUTHORIZED"],
    ];
    if (j === 1) answers.push([second, "DENIED"]); // one conflict
    for (const [guardian, decision] of answers) {
      if (guardian && decision) {
        await prisma.permissionResponse.create({
          data: { requestId: request.id, studentId: student.id, guardianId: guardian.id, decision },
        });
      }
    }
  }

  // Demo accounts: a 3°A family with an active account and a pickup person.
  const demoStudent = await prisma.student.findFirstOrThrow({
    where: {
      classroom: { name: "3°A" },
      guardians: { some: { guardian: { userId: { not: null } } } },
      pickupAuthorizations: { some: { pickupPerson: { userId: { not: null } } } },
    },
    include: {
      guardians: { include: { guardian: true } },
      pickupAuthorizations: { include: { pickupPerson: true } },
    },
    orderBy: { name: "asc" },
  });
  const demoGuardian = demoStudent.guardians.map((g) => g.guardian).find((g) => g.userId)!;
  const demoPickup = demoStudent.pickupAuthorizations.map((a) => a.pickupPerson).find((p) => p.userId)!;
  const invitee = await prisma.guardian.findFirstOrThrow({
    where: { userId: null, students: { some: { student: { classroom: { name: "3°A" } } } } },
  });
  const inviteCode = await createInvitation({ guardianId: invitee.id }, admin.id);

  const local = (phone: string) => phone.replace("+52", "");
  console.log(`
Seeded ${classrooms.length} classrooms, ${classrooms.length * STUDENTS_PER_CLASSROOM} students, ${guardianCount} guardians, ${pickupCount} pickup people, 1 open request.

Demo accounts
  Coordinación   admin@escuela.test / admin123
  Maestra 3°A    maestra5@escuela.test / maestra123
  Tutor          ${local(demoGuardian.phone)} / tutor123   (${demoGuardian.name}, ${demoStudent.name})
  Autorizado     ${local(demoPickup.phone!)} / autorizado123   (${demoPickup.name}, ${demoPickup.relationship})

Invitation to try /activate
  Código ${inviteCode}  ·  celular ${local(invitee.phone)}  (${invitee.name})
`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
