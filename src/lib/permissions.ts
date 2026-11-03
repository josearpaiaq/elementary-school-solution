export type Decision = "AUTHORIZED" | "DENIED";
export type StudentStatus = Decision | "PENDING" | "CONFLICT";
export type RequestStatus = "DRAFT" | "OPEN" | "CLOSED";

/** Authorized when at least one guardian says yes and none says no; disagreement is a conflict. */
export function studentStatus(decisions: string[]): StudentStatus {
  const yes = decisions.includes("AUTHORIZED");
  const no = decisions.includes("DENIED");
  if (yes && no) return "CONFLICT";
  if (yes) return "AUTHORIZED";
  if (no) return "DENIED";
  return "PENDING";
}

export function canRespond(request: { status: string; deadline: Date }, now: Date): boolean {
  return request.status === "OPEN" && now <= request.deadline;
}
