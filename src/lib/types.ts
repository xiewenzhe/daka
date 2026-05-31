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
  medicine_plan: string | null;
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
  mood: string | null;
  photo_url: string | null;
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

export type Feedback = {
  id: string;
  patient_id: string;
  admin_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
};

export type EncouragementType =
  | "normal"
  | "makeup"
  | "streak_3"
  | "streak_7"
  | "streak_14";

export type EncouragementMessage = {
  id: string;
  patient_id: string;
  type: EncouragementType;
  content: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type PauseDay = {
  id: string;
  user_id: string;
  pause_date: string;
  reason: string | null;
  created_at: string;
};
