-- CreateTable
CREATE TABLE "GroupReminder" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "sentById" TEXT NOT NULL,
    "pendingCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GroupReminder_requestId_classroomId_createdAt_idx" ON "GroupReminder"("requestId", "classroomId", "createdAt");

-- AddForeignKey
ALTER TABLE "GroupReminder" ADD CONSTRAINT "GroupReminder_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PermissionRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupReminder" ADD CONSTRAINT "GroupReminder_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupReminder" ADD CONSTRAINT "GroupReminder_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
