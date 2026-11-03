import type { StudentStatus } from "@/lib/permissions";
import { t } from "@/lib/strings";

const STYLES: Record<StudentStatus, string> = {
  AUTHORIZED: "bg-green-100 text-green-800",
  DENIED: "bg-red-100 text-red-800",
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFLICT: "bg-purple-100 text-purple-800",
};

export function StatusBadge({ status }: { status: StudentStatus }) {
  return (
    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}>
      {t.status[status]}
    </span>
  );
}
