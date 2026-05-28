import type { Checkin, MedicineSchedule, Profile } from "@/lib/types";

const DEMO_SESSION_KEY = "daka_demo_account";
const DEMO_CHECKINS_KEY = "daka_demo_checkins";
const DEMO_SCHEDULES_KEY = "daka_demo_schedules";
const DEMO_NOTIFICATIONS_KEY = "daka_demo_admin_notifications";
const DEMO_PASSWORD = "526120";

const defaultScheduleSeeds = [
  {
    id: "demo-schedule-morning",
    label: "morning",
    display_name: "早上",
    reminder_time: "09:00:00"
  },
  {
    id: "demo-schedule-noon",
    label: "noon",
    display_name: "中午",
    reminder_time: "15:00:00"
  },
  {
    id: "demo-schedule-evening",
    label: "evening",
    display_name: "晚上",
    reminder_time: "21:00:00"
  }
];

export const demoPatientProfile: Profile = {
  id: "demo-patient-jiajia",
  display_name: "嘉嘉",
  role: "patient",
  created_at: "2026-05-27T00:00:00.000Z"
};

export const demoAdminProfile: Profile = {
  id: "demo-admin",
  display_name: "管理员",
  role: "admin",
  created_at: "2026-05-27T00:00:00.000Z"
};

export function getDemoSchedules(userId = demoPatientProfile.id): MedicineSchedule[] {
  return readDemoSchedules().map((schedule) => ({
    ...schedule,
    user_id: userId
  }));
}

export function signInDemo(account: string, password: string) {
  const normalizedAccount = account.trim().toLowerCase();

  if (password !== DEMO_PASSWORD) {
    return { profile: null, error: "密码不正确" };
  }

  if (normalizedAccount === "jiajia") {
    localStorage.setItem(DEMO_SESSION_KEY, "jiajia");
    seedDemoHistory();
    return { profile: demoPatientProfile, error: null };
  }

  if (normalizedAccount === "admin") {
    localStorage.setItem(DEMO_SESSION_KEY, "admin");
    seedDemoHistory();
    return { profile: demoAdminProfile, error: null };
  }

  return { profile: null, error: "账号不存在。可用账号：jiajia 或 admin" };
}

export function getDemoSession() {
  const account = localStorage.getItem(DEMO_SESSION_KEY);

  if (account === "jiajia") {
    return {
      user: { id: demoPatientProfile.id },
      profile: demoPatientProfile
    };
  }

  if (account === "admin") {
    return {
      user: { id: demoAdminProfile.id },
      profile: demoAdminProfile
    };
  }

  return { user: null, profile: null };
}

export function signOutDemo() {
  localStorage.removeItem(DEMO_SESSION_KEY);
}

export function getDemoCheckins(userId: string, dateFrom?: string, dateTo?: string) {
  return readDemoCheckins().filter((checkin) => {
    if (checkin.user_id !== userId) {
      return false;
    }

    if (dateFrom && checkin.checkin_date < dateFrom) {
      return false;
    }

    if (dateTo && checkin.checkin_date > dateTo) {
      return false;
    }

    return true;
  });
}

export function clearDemoCheckinsForDate(userId: string, checkinDate: string) {
  const nextCheckins = readDemoCheckins().filter(
    (checkin) =>
      !(checkin.user_id === userId && checkin.checkin_date === checkinDate)
  );
  const nextNotifications = getDemoAdminNotifications().filter(
    (notification) => notification.patient_id !== userId
  );

  writeDemoCheckins(nextCheckins);
  localStorage.setItem(DEMO_NOTIFICATIONS_KEY, JSON.stringify(nextNotifications));
}

export function createDemoCheckin(
  userId: string,
  scheduleId: string,
  checkinDate: string
) {
  const checkins = readDemoCheckins();
  const existing = checkins.find(
    (checkin) =>
      checkin.user_id === userId &&
      checkin.schedule_id === scheduleId &&
      checkin.checkin_date === checkinDate
  );

  if (existing) {
    return { data: null, error: "今天这个时间段已经打过卡了。" };
  }

  const now = new Date().toISOString();
  const next: Checkin = {
    id: `demo-checkin-${scheduleId}-${checkinDate}`,
    user_id: userId,
    schedule_id: scheduleId,
    checkin_date: checkinDate,
    checkin_type: "normal",
    actual_taken_at: null,
    checked_at: now,
    status: "checked",
    note: null,
    created_at: now
  };

  writeDemoCheckins([...checkins, next]);
  return { data: next, error: null };
}

export function createDemoMakeupCheckin(
  userId: string,
  scheduleId: string,
  checkinDate: string,
  actualTakenAt: string,
  note: string
) {
  const checkins = readDemoCheckins();
  const existing = checkins.find(
    (checkin) =>
      checkin.user_id === userId &&
      checkin.schedule_id === scheduleId &&
      checkin.checkin_date === checkinDate
  );

  if (existing) {
    return { data: null, error: "今天这个时间段已经记录过了。" };
  }

  const now = new Date().toISOString();
  const next: Checkin = {
    id: `demo-makeup-${scheduleId}-${checkinDate}`,
    user_id: userId,
    schedule_id: scheduleId,
    checkin_date: checkinDate,
    status: "checked",
    checkin_type: "makeup",
    actual_taken_at: actualTakenAt,
    checked_at: now,
    note,
    created_at: now
  };

  writeDemoCheckins([...checkins, next]);
  return { data: next, error: null };
}

export function createDemoMissedReason(
  userId: string,
  scheduleId: string,
  checkinDate: string,
  reason: string
) {
  const checkins = readDemoCheckins();
  const existing = checkins.find(
    (checkin) =>
      checkin.user_id === userId &&
      checkin.schedule_id === scheduleId &&
      checkin.checkin_date === checkinDate
  );

  if (existing) {
    return { data: null, error: "今天这个时间段已经记录过了。" };
  }

  const now = new Date().toISOString();
  const next: Checkin = {
    id: `demo-missed-${scheduleId}-${checkinDate}`,
    user_id: userId,
    schedule_id: scheduleId,
    checkin_date: checkinDate,
    status: "missed",
    checkin_type: "normal",
    actual_taken_at: null,
    checked_at: now,
    note: reason,
    created_at: now
  };

  writeDemoCheckins([...checkins, next]);
  return { data: next, error: null };
}

export function createDemoAdminNotification(
  checkin: Checkin,
  scheduleName: string
) {
  const notifications = getDemoAdminNotifications();
  const clock = new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(checkin.actual_taken_at ?? checkin.checked_at));
  const typeText = checkin.checkin_type === "makeup" ? "补打卡" : "打卡";
  const next = {
    id: `demo-notification-${checkin.id}`,
    admin_id: demoAdminProfile.id,
    patient_id: demoPatientProfile.id,
    checkin_id: checkin.id,
    message: `嘉嘉已完成${scheduleName}${typeText}，时间 ${clock}`,
    read_at: null,
    created_at: new Date().toISOString()
  };

  localStorage.setItem(
    DEMO_NOTIFICATIONS_KEY,
    JSON.stringify([next, ...notifications])
  );
}

export function getDemoAdminNotifications() {
  const raw = localStorage.getItem(DEMO_NOTIFICATIONS_KEY);

  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as Array<{
      id: string;
      admin_id: string;
      patient_id: string;
      checkin_id: string | null;
      message: string;
      read_at: string | null;
      created_at: string;
    }>;
  } catch {
    return [];
  }
}

export function updateDemoScheduleTime(scheduleId: string, reminderTime: string) {
  const schedules = readDemoSchedules();
  const nextSchedules = schedules.map((schedule) =>
    schedule.id === scheduleId
      ? { ...schedule, reminder_time: normalizeTime(reminderTime) }
      : schedule
  );

  writeDemoSchedules(nextSchedules);
  return nextSchedules.find((schedule) => schedule.id === scheduleId) ?? null;
}

function readDemoSchedules(): MedicineSchedule[] {
  const raw = localStorage.getItem(DEMO_SCHEDULES_KEY);

  if (raw) {
    try {
      return (JSON.parse(raw) as MedicineSchedule[]).map((schedule) => ({
        ...schedule,
        reminder_time: normalizeTime(schedule.reminder_time)
      }));
    } catch {
      return createDefaultDemoSchedules();
    }
  }

  const schedules = createDefaultDemoSchedules();
  writeDemoSchedules(schedules);
  return schedules;
}

function writeDemoSchedules(schedules: MedicineSchedule[]) {
  localStorage.setItem(DEMO_SCHEDULES_KEY, JSON.stringify(schedules));
}

function createDefaultDemoSchedules(): MedicineSchedule[] {
  return defaultScheduleSeeds.map((schedule) => ({
    ...schedule,
    user_id: demoPatientProfile.id,
    reminder_time: normalizeTime(schedule.reminder_time),
    enabled: true,
    created_at: "2026-01-01T00:00:00.000Z"
  }));
}

function normalizeTime(value: string) {
  return value.length === 5 ? `${value}:00` : value;
}

function readDemoCheckins(): Checkin[] {
  const raw = localStorage.getItem(DEMO_CHECKINS_KEY);

  if (!raw) {
    return [];
  }

  try {
    return (JSON.parse(raw) as Checkin[]).map((checkin) => ({
      ...checkin,
      status: checkin.status ?? "checked",
      checkin_type: checkin.checkin_type ?? "normal",
      actual_taken_at: checkin.actual_taken_at ?? null
    }));
  } catch {
    return [];
  }
}

function writeDemoCheckins(checkins: Checkin[]) {
  localStorage.setItem(DEMO_CHECKINS_KEY, JSON.stringify(checkins));
}

function seedDemoHistory() {
  if (localStorage.getItem(DEMO_CHECKINS_KEY)) {
    return;
  }

  const schedules = getDemoSchedules();
  const now = new Date();
  const seeded: Checkin[] = [];

  for (let dayOffset = 1; dayOffset <= 10; dayOffset += 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - dayOffset);
    const dateString = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
    const count = dayOffset % 4;

    schedules.slice(0, count).forEach((schedule, index) => {
      const checkedAt = new Date(date);
      checkedAt.setHours(9 + index * 6, 5, 0, 0);
      seeded.push({
        id: `demo-history-${schedule.label}-${dateString}`,
        user_id: demoPatientProfile.id,
        schedule_id: schedule.id,
        checkin_date: dateString,
        status: "checked",
        checkin_type: "normal",
        actual_taken_at: null,
        checked_at: checkedAt.toISOString(),
        note: null,
        created_at: checkedAt.toISOString()
      });
    });
  }

  writeDemoCheckins(seeded);
}
