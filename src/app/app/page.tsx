"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CelebrationToast } from "@/components/CelebrationToast";
import { DailyMoodSelector } from "@/components/DailyMoodSelector";
import { NotificationSetup } from "@/components/NotificationSetup";
import { PatientHeader } from "@/components/PatientHeader";
import { PatientNav } from "@/components/PatientNav";
import { TodayCheckinList } from "@/components/TodayCheckinList";
import {
  normalizeEncouragementList,
  pickEncouragement
} from "@/lib/encouragement";
import {
  formatClock,
  getLocalDateString,
  getRecentLocalDateStrings
} from "@/lib/date";
import { getCurrentProfile } from "@/lib/auth";
import {
  clearDemoCheckinsForDate,
  createDemoAdminNotification,
  createDemoCheckin,
  createDemoMakeupCheckin,
  createDemoMissedReason,
  getDemoCheckins,
  getDemoEncouragementMessages,
  getDemoDailyMood,
  getDemoPauseDay,
  getDemoPauseDays,
  getDemoSchedules,
  saveDemoDailyMood
} from "@/lib/demoData";
import {
  readFileAsDataUrl,
  sortSchedules,
  uploadCheckinPhoto
} from "@/lib/patientHelpers";
import { buildWeeklyStats } from "@/lib/stats";
import { hasSupabaseConfig, supabase } from "@/lib/supabaseClient";
import type {
  Checkin,
  DailyMood,
  EncouragementMessage,
  MedicineSchedule,
  PauseDay,
  ScheduleWithCheckin,
  WeeklyStats
} from "@/lib/types";

export default function PatientAppPage() {
  const router = useRouter();
  const today = useMemo(() => getLocalDateString(), []);
  const last7Days = useMemo(() => getRecentLocalDateStrings(7), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<ScheduleWithCheckin[]>([]);
  const [encouragements, setEncouragements] = useState<EncouragementMessage[]>([]);
  const [pauseDay, setPauseDay] = useState<PauseDay | null>(null);
  const [dailyMood, setDailyMood] = useState<DailyMood | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [celebrationMessage, setCelebrationMessage] = useState("");
  const [celebrationFireworks, setCelebrationFireworks] = useState(false);

  useEffect(() => {
    loadToday();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadToday() {
    setIsLoading(true);
    setMessage("");

    const { user, profile } = await getCurrentProfile();

    if (!user || !profile) {
      router.replace("/login");
      return;
    }

    if (profile.role !== "patient") {
      router.replace("/admin");
      return;
    }

    setUserId(user.id);
    const statsStartDate =
      profile.created_at.slice(0, 10) > last7Days[0]
        ? profile.created_at.slice(0, 10)
        : last7Days[0];

    if (!hasSupabaseConfig) {
      const schedules = sortSchedules(getDemoSchedules(user.id));
      if (!hasSavedMedicinePlans(schedules)) {
        router.replace("/app/plan");
        return;
      }
      const checkins = getDemoCheckins(user.id, statsStartDate, today);
      const pauseDays = getDemoPauseDays(user.id, statsStartDate, today);
      setEncouragements(
        normalizeEncouragementList(getDemoEncouragementMessages(user.id))
      );
      setDailyMood(getDemoDailyMood(user.id, today));
      setPauseDay(getDemoPauseDay(user.id, today));
      const todayItems = mergeTodayItems(schedules, checkins, today);
      setItems(todayItems);
      setWeeklyStats(
        buildWeeklyStats(schedules, checkins, {
          startDate: statsStartDate,
          pauseDates: pauseDays.map((pause) => pause.pause_date)
        })
      );
      setIsLoading(false);
      return;
    }

    const [
      { data: schedules, error: schedulesError },
      { data: checkins, error: checkinsError },
      { data: encouragementsData, error: encouragementsError },
      { data: pauseDays, error: pauseDaysError },
      { data: dailyMoodData, error: dailyMoodError }
    ] = await Promise.all([
      supabase
        .from("medicine_schedules")
        .select("*")
        .eq("user_id", user.id)
        .eq("enabled", true)
        .order("reminder_time", { ascending: true })
        .returns<MedicineSchedule[]>(),
      supabase
        .from("checkins")
        .select("*")
        .eq("user_id", user.id)
        .gte("checkin_date", statsStartDate)
        .lte("checkin_date", today)
        .returns<Checkin[]>(),
      supabase
        .from("encouragement_messages")
        .select("*")
        .eq("patient_id", user.id)
        .returns<EncouragementMessage[]>(),
      supabase
        .from("pause_days")
        .select("*")
        .eq("user_id", user.id)
          .gte("pause_date", statsStartDate)
          .lte("pause_date", today)
          .returns<PauseDay[]>(),
      supabase
        .from("daily_moods")
        .select("*")
        .eq("user_id", user.id)
        .eq("mood_date", today)
        .maybeSingle<DailyMood>()
    ]);

    if (
      schedulesError ||
      checkinsError ||
      encouragementsError ||
      pauseDaysError ||
      dailyMoodError
    ) {
      setMessage(
        schedulesError?.message ??
          checkinsError?.message ??
          encouragementsError?.message ??
          pauseDaysError?.message ??
          dailyMoodError?.message ??
          "读取失败"
      );
      setIsLoading(false);
      return;
    }

    const orderedSchedules = sortSchedules(schedules ?? []);
    if (!hasSavedMedicinePlans(orderedSchedules)) {
      router.replace("/app/plan");
      return;
    }
    setEncouragements(normalizeEncouragementList(encouragementsData ?? []));
    setDailyMood(dailyMoodData ?? null);
    setPauseDay(
      (pauseDays ?? []).find((pause) => pause.pause_date === today) ?? null
    );
    const todayItems = mergeTodayItems(orderedSchedules, checkins ?? [], today);
    setItems(todayItems);
    setWeeklyStats(
      buildWeeklyStats(orderedSchedules, checkins ?? [], {
        startDate: statsStartDate,
        pauseDates: (pauseDays ?? []).map((pause) => pause.pause_date)
      })
    );
    setIsLoading(false);
  }

  async function handleCheckin(
    scheduleId: string,
    mood?: string | null,
    photoFile?: File | null
  ) {
    if (!userId) {
      return;
    }

    setSubmittingId(scheduleId);
    setMessage("");

    if (!hasSupabaseConfig) {
      const photoUrl = photoFile ? await readFileAsDataUrl(photoFile) : null;
      const { data, error } = createDemoCheckin(
        userId,
        scheduleId,
        today,
        mood,
        photoUrl
      );
      setSubmittingId(null);

      if (error) {
        setMessage(error);
        return;
      }

      const schedule = items.find((item) => item.id === scheduleId);
      if (data && schedule) {
        createDemoAdminNotification(data, schedule.display_name);
        showCelebration(getSuccessMessage(scheduleId, data, false));
      }
      await loadToday();
      return;
    }

    const photoUrl = await uploadCheckinPhoto(photoFile);
    const { data, error } = await supabase
      .from("checkins")
      .insert({
        user_id: userId,
        schedule_id: scheduleId,
        checkin_date: today,
        status: "checked",
        checkin_type: "normal",
        mood,
        photo_url: photoUrl
      })
      .select("*")
      .single<Checkin>();

    setSubmittingId(null);

    if (error) {
      setMessage(
        error.code === "23505" ? "今天这个时间段已经打过卡了。" : error.message
      );
      await loadToday();
      return;
    }

    await createAdminNotification(data, scheduleId);
    showCelebration(getSuccessMessage(scheduleId, data, false));
    await loadToday();
  }

  async function handleMakeupCheckin(
    scheduleId: string,
    actualTakenAt: string,
    note: string,
    mood?: string | null,
    photoFile?: File | null
  ) {
    if (!userId) {
      return;
    }

    setSubmittingId(scheduleId);
    setMessage("");

    if (!hasSupabaseConfig) {
      const photoUrl = photoFile ? await readFileAsDataUrl(photoFile) : null;
      const { data, error } = createDemoMakeupCheckin(
        userId,
        scheduleId,
        today,
        actualTakenAt,
        note,
        mood,
        photoUrl
      );
      setSubmittingId(null);

      if (error) {
        setMessage(error);
        return;
      }

      const schedule = items.find((item) => item.id === scheduleId);
      if (data && schedule) {
        createDemoAdminNotification(data, schedule.display_name);
        showCelebration(getSuccessMessage(scheduleId, data, true));
      }
      await loadToday();
      return;
    }

    const photoUrl = await uploadCheckinPhoto(photoFile);
    const { data, error } = await supabase
      .from("checkins")
      .insert({
        user_id: userId,
        schedule_id: scheduleId,
        checkin_date: today,
        status: "checked",
        checkin_type: "makeup",
        actual_taken_at: actualTakenAt,
        mood,
        photo_url: photoUrl,
        note
      })
      .select("*")
      .single<Checkin>();

    setSubmittingId(null);

    if (error) {
      setMessage(
        error.code === "23505" ? "今天这个时间段已经记录过了。" : error.message
      );
      await loadToday();
      return;
    }

    await createAdminNotification(data, scheduleId);
    showCelebration(getSuccessMessage(scheduleId, data, true));
    await loadToday();
  }

  async function handleSubmitMissedReason(scheduleId: string, reason: string) {
    if (!userId) {
      return;
    }

    setSubmittingId(scheduleId);
    setMessage("");

    if (!hasSupabaseConfig) {
      const { error } = createDemoMissedReason(userId, scheduleId, today, reason);
      setSubmittingId(null);

      if (error) {
        setMessage(error);
        return;
      }

      await loadToday();
      return;
    }

    const { error } = await supabase.from("checkins").insert({
      user_id: userId,
      schedule_id: scheduleId,
      checkin_date: today,
      status: "missed",
      note: reason
    });

    setSubmittingId(null);

    if (error) {
      setMessage(
        error.code === "23505" ? "今天这个时间段已经记录过了。" : error.message
      );
      await loadToday();
      return;
    }

    await loadToday();
  }

  async function handleSaveDailyMood(mood: string, note: string) {
    if (!userId) {
      return false;
    }

    setMessage("");

    if (!hasSupabaseConfig) {
      saveDemoDailyMood(userId, today, mood, note);
      await loadToday();
      return true;
    }

    const { error } = await supabase.from("daily_moods").upsert(
      {
        user_id: userId,
        mood_date: today,
        mood,
        note: note.trim() || null,
        updated_at: new Date().toISOString()
      },
      { onConflict: "user_id,mood_date" }
    );

    if (error) {
      setMessage(error.message);
      return false;
    }

    await loadToday();
    return true;
  }

  function getSuccessMessage(
    scheduleId: string,
    checkin: Checkin,
    isMakeup: boolean
  ) {
    const completedCount = items.filter((item) =>
      item.id === scheduleId
        ? checkin.status === "checked"
        : item.checkin?.status === "checked"
    ).length;
    const isAllDone = items.length > 0 && completedCount === items.length;

    if (isAllDone) {
      const nextStreak = (weeklyStats?.streakDays ?? 0) + 1;
      const streakType =
        nextStreak === 14
          ? "streak_14"
          : nextStreak === 7
            ? "streak_7"
            : nextStreak === 3
              ? "streak_3"
              : null;

      return {
        message: streakType
          ? pickEncouragement(streakType, encouragements)
          : "嘉嘉真棒，一天打卡全部完成啦！",
        fireworks: true
      };
    }

    return {
      message: isMakeup
        ? pickEncouragement("makeup", encouragements)
        : pickEncouragement("normal", encouragements),
      fireworks: false
    };
  }

  function showCelebration(next: { message: string; fireworks: boolean }) {
    setCelebrationFireworks(next.fireworks);
    setCelebrationMessage(next.message);
  }

  async function createAdminNotification(checkin: Checkin, scheduleId: string) {
    const schedule = items.find((item) => item.id === scheduleId);
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user || !schedule) {
      return;
    }

    const { data: links } = await supabase
      .from("care_links")
      .select("admin_id")
      .eq("patient_id", user.id)
      .returns<Array<{ admin_id: string }>>();

    if (!links || links.length === 0) {
      return;
    }

    const clock = formatClock(checkin.actual_taken_at ?? checkin.checked_at);
    const typeText = checkin.checkin_type === "makeup" ? "补打卡" : "打卡";

    await supabase.from("admin_notifications").insert(
      links.map((link) => ({
        admin_id: link.admin_id,
        patient_id: user.id,
        checkin_id: checkin.id,
        message: `嘉嘉已完成${schedule.display_name}${typeText}，时间 ${clock}`
      }))
    );
  }

  async function handleClearDemoToday() {
    if (!userId) {
      return;
    }

    clearDemoCheckinsForDate(userId, today);
    setCelebrationMessage("");
    setCelebrationFireworks(false);
    setMessage("今天的本地演示打卡记录已清空，可以重新测试。");
    await loadToday();
  }

  return (
    <main className="min-h-dvh bg-brand-50">
      <CelebrationToast
        message={celebrationMessage}
        fireworks={celebrationFireworks}
        onClose={() => {
          setCelebrationMessage("");
          setCelebrationFireworks(false);
        }}
      />
      <div className="mx-auto w-full max-w-md px-5 py-6">
        <PatientHeader title="今日喝药打卡" />
        <PatientNav />
        <NotificationSetup />

        <div className="mt-5">
          <DailyMoodSelector
            selectedMood={dailyMood?.mood ?? null}
            selectedNote={dailyMood?.note ?? null}
            onMoodSave={handleSaveDailyMood}
            isLoading={isLoading}
          />
        </div>

        {!hasSupabaseConfig ? (
          <button
            type="button"
            onClick={handleClearDemoToday}
            className="mt-5 h-11 w-full rounded-lg bg-white px-4 text-sm font-bold text-brand-700 shadow-sm ring-1 ring-brand-100 active:bg-brand-50"
          >
            清空今天演示记录
          </button>
        ) : null}

        <section className="mt-6">
          {isLoading ? (
            <div className="rounded-lg bg-white p-4 text-sm text-slate-600 shadow-soft ring-1 ring-brand-100">
              正在读取今天的打卡状态...
            </div>
          ) : pauseDay ? (
            <div className="rounded-lg bg-amber-50 p-4 text-sm leading-6 text-amber-800 shadow-soft ring-1 ring-amber-200">
              今天已开启暂停模式，不会计入漏打卡。
              {pauseDay.reason ? ` 原因：${pauseDay.reason}` : null}
            </div>
          ) : (
            <TodayCheckinList
              key={items
                .map((item) => `${item.id}:${item.checkin?.id ?? "empty"}`)
                .join("|")}
              items={items}
              checkinDate={today}
              submittingId={submittingId}
              onCheckin={handleCheckin}
              onSubmitMissedReason={handleSubmitMissedReason}
              onMakeupCheckin={handleMakeupCheckin}
            />
          )}
        </section>

        {message ? (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-800 ring-1 ring-amber-200">
            {message}
          </p>
        ) : null}
      </div>
    </main>
  );
}

function mergeTodayItems(
  schedules: MedicineSchedule[],
  checkins: Checkin[],
  today: string
) {
  const checkinBySchedule = new Map(
    checkins
      .filter((checkin) => checkin.checkin_date === today)
      .map((checkin) => [checkin.schedule_id, checkin])
  );

  return schedules.map((schedule) => ({
    ...schedule,
    checkin: checkinBySchedule.get(schedule.id) ?? null
  }));
}

function hasSavedMedicinePlans(schedules: MedicineSchedule[]) {
  return (
    schedules.length > 0 &&
    schedules.every((schedule) => schedule.medicine_plan?.trim())
  );
}
