export function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function getRecentLocalDateStrings(days: number, baseDate = new Date()) {
  return Array.from({ length: days }, (_, index) => {
    const offset = index - days + 1;
    return getLocalDateString(addDays(baseDate, offset));
  });
}

export function getMonthLocalDateStrings(baseDate = new Date()) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return Array.from({ length: daysInMonth }, (_, index) =>
    getLocalDateString(new Date(year, month, index + 1))
  );
}

export function getMonthStartLocalDateString(baseDate = new Date()) {
  return getLocalDateString(
    new Date(baseDate.getFullYear(), baseDate.getMonth(), 1)
  );
}

export function formatChineseDate(date = new Date()) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long"
  }).format(date);
}

export function formatShortChineseDate(dateString: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric"
  }).format(new Date(`${dateString}T00:00:00`));
}

export function formatChineseMonth(date = new Date()) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long"
  }).format(date);
}

export function formatTime(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value.slice(0, 5);
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));
}

export function formatClock(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));
}

export function getDateTimeLocalValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

export function dateTimeLocalToIso(value: string) {
  return new Date(value).toISOString();
}

export type CheckinWindowStatus = "too_early" | "open" | "too_late";

export function getScheduleWindow(
  dateString: string,
  reminderTime: string,
  windowMinutes = 60
) {
  const [hour = "0", minute = "0"] = reminderTime.split(":");
  const scheduledAt = new Date(`${dateString}T00:00:00`);
  scheduledAt.setHours(Number(hour), Number(minute), 0, 0);

  const startsAt = new Date(scheduledAt);
  startsAt.setMinutes(scheduledAt.getMinutes() - windowMinutes);

  const endsAt = new Date(scheduledAt);
  endsAt.setMinutes(scheduledAt.getMinutes() + windowMinutes);

  return { scheduledAt, startsAt, endsAt };
}

export function getCheckinWindowStatus(
  dateString: string,
  reminderTime: string,
  now = new Date()
): CheckinWindowStatus {
  const { startsAt, endsAt } = getScheduleWindow(dateString, reminderTime);

  if (now < startsAt) {
    return "too_early";
  }

  if (now > endsAt) {
    return "too_late";
  }

  return "open";
}

export function formatClockFromDate(value: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(value);
}

export type ScheduleRuntimeStatus =
  | "not_due"
  | "checked"
  | "makeup"
  | "missed";

export function getScheduleRuntimeStatus(
  dateString: string,
  reminderTime: string,
  checkin?: { status: string; checkin_type?: string | null } | null,
  now = new Date()
): ScheduleRuntimeStatus {
  if (checkin?.status === "checked") {
    return checkin.checkin_type === "makeup" ? "makeup" : "checked";
  }

  const { endsAt } = getScheduleWindow(dateString, reminderTime);

  return now > endsAt ? "missed" : "not_due";
}
