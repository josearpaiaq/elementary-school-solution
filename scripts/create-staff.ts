/**
 * Creates (or resets the password of) a staff account and, for teachers, assigns
 * their classrooms. Use it to bootstrap production, where the demo seed must not run.
 *
 *   npm run create-staff -- ADMIN coordinacion@escuela.mx "Sofía Ramírez"
 *   npm run create-staff -- TEACHER maestra.ana@escuela.mx "Ana López" "1°A,1°B"
 *
 * The password is asked interactively so it doesn't end up in the shell history.
 */
import { createInterface } from "node:readline";
import { prisma } from "@/lib/db";
import { MIN_PASSWORD_LENGTH } from "@/lib/invitations";
import { hashPassword } from "@/lib/password";

function askHidden(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const output = rl as unknown as { _writeToOutput: (s: string) => void };
  const write = output._writeToOutput.bind(rl);
  output._writeToOutput = (s) => write(s.startsWith(question) ? s : "");
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    }),
  );
}

async function main() {
  const [role, rawEmail, name, classroomList = ""] = process.argv.slice(2);
  if (!["ADMIN", "TEACHER"].includes(role) || !rawEmail?.includes("@") || !name) {
    throw new Error('Usage: npm run create-staff -- <ADMIN|TEACHER> <email> "<name>" ["1°A,1°B"]');
  }
  const email = rawEmail.trim().toLowerCase();
  const classroomNames = classroomList.split(",").map((c) => c.trim()).filter(Boolean);

  const password = await askHidden(`Password for ${email}: `);
  if (password.length < MIN_PASSWORD_LENGTH) throw new Error(`Password must have at least ${MIN_PASSWORD_LENGTH} characters`);

  const user = await prisma.user.upsert({
    where: { login: email },
    create: { login: email, name, role, passwordHash: hashPassword(password) },
    update: { name, role, passwordHash: hashPassword(password) },
  });
  for (const classroomName of classroomNames) {
    await prisma.classroom.upsert({
      where: { name: classroomName },
      create: { name: classroomName, teacherId: user.id },
      update: { teacherId: user.id },
    });
  }
  console.log(`${role} ${email} ready${classroomNames.length ? `, classrooms: ${classroomNames.join(", ")}` : ""}.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
