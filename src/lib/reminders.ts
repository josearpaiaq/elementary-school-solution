import { formatDate, t } from "@/lib/strings";

type ReminderInput = {
  classroom: string;
  pending: number;
  total: number;
  request: { title: string; eventDate: Date; deadline: Date };
  baseUrl: string;
};

/** Message for a classroom's WhatsApp group. Counts only: the group is visible to every family. */
export function groupReminderText({ classroom, pending, total, request, baseUrl }: ReminderInput): string {
  return t.reminder.message({
    classroom,
    pending,
    total,
    title: request.title,
    eventDate: formatDate(request.eventDate),
    deadline: formatDate(request.deadline),
    url: `${baseUrl}/family`,
  });
}

/**
 * Opens WhatsApp (app or web) with the text ready to send; no WhatsApp API involved.
 * api.whatsapp.com is used directly because wa.me's redirect corrupts emojis.
 */
export function whatsappShareUrl(text: string): string {
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
}

/** Students who answered after a reminder, counted once each. */
export function answeredAfter(reminderAt: Date, responses: { studentId: string; respondedAt: Date }[]): number {
  return new Set(responses.filter((r) => r.respondedAt > reminderAt).map((r) => r.studentId)).size;
}
