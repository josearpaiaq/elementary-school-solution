import { describe, expect, it } from "vitest";
import { answeredAfter, groupReminderText, whatsappShareUrl } from "@/lib/reminders";

const request = {
  title: "Visita al Museo",
  eventDate: new Date("2026-11-08T15:00:00Z"),
  deadline: new Date("2026-11-06T05:59:00Z"),
};

describe("group reminder message", () => {
  const text = groupReminderText({ classroom: "3°A", pending: 4, total: 25, request, baseUrl: "https://escuela.test" });

  it("includes classroom, counts, title, dates and the guardian link", () => {
    expect(text).toContain("Recordatorio 3°A");
    expect(text).toContain("Faltan 4 de 25 autorizaciones");
    expect(text).toContain("*Visita al Museo*");
    expect(text).toContain("8 nov 2026");
    expect(text).toContain("Fecha límite: 5 nov 2026");
    expect(text).not.toContain("..");
    expect(text).toContain("📋");
    expect(text).toContain("https://escuela.test/family");
  });

  it("opens WhatsApp with the whole message encoded", () => {
    const url = whatsappShareUrl(text);
    const prefix = "https://api.whatsapp.com/send?text=";
    expect(url.startsWith(prefix)).toBe(true);
    expect(decodeURIComponent(url.slice(prefix.length))).toBe(text);
  });
});

describe("answeredAfter", () => {
  const at = new Date("2026-11-04T12:00:00Z");
  it("counts each student once, only for answers after the reminder", () => {
    expect(
      answeredAfter(at, [
        { studentId: "a", respondedAt: new Date("2026-11-04T11:00:00Z") },
        { studentId: "b", respondedAt: new Date("2026-11-04T13:00:00Z") },
        { studentId: "b", respondedAt: new Date("2026-11-04T14:00:00Z") },
        { studentId: "c", respondedAt: new Date("2026-11-05T09:00:00Z") },
      ]),
    ).toBe(2);
  });
});
