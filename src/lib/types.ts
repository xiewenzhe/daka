export type UserRole = "admin" | "patient";

export type Profile = {
  id: string;
  display_name: string | null;
  role: UserRole;
  created_at: string;
};

export type MedicineSchedule = {
  id: string;
  user_id: string;
  label: "morning" | "noon" | "evening" | string;
  display_name: string;
  reminder_time: string;
  enabled: boolean;
  created_at: string;
};

export type Checkin = {
  id: string;
  user_id: string;
  schedule_id: string;
  checkin_date: string;
  status: "checked" | "missed";
  checkin_type: "normal" | "makeup";
  actual_taken_at: string | null;
  checked_at: string;
  note: string | null;
  created_at: string;
};

export type ScheduleWithCheckin = MedicineSchedule & {
  checkin: Checkin | null;
};

export type DailyCheckinSummary = {
  date: string;
  checkedCount: number;
  missedCount: number;
  totalCount: number;
};

export type WeeklyStats = {
  completedCount: number;
  missedCount: number;
  totalCount: number;
  completionRate: number;
  streakDays: number;
  dailySummaries: DailyCheckinSummary[];
};

export type AdminNotification = {
  id: string;
  admin_id: string;
  patient_id: string;
  checkin_id: string | null;
  message: string;
  read_at: string | null;
  created_at: string;
};
