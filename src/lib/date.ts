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

export function formatTime(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value.slice(0, 5);
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));
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
