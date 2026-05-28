"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CelebrationToast } from "@/components/CelebrationToast";
import { MonthlyCheckinCalendar } from "@/components/MonthlyCheckinCalendar";
import { NotificationSetup } from "@/components/NotificationSetup";
import { TodayCheckinList } from "@/components/TodayCheckinList";
import { WeeklyStatsSummary } from "@/components/WeeklyStatsSummary";
import {
  formatChineseDate,
  formatClock,
  getMonthStartLocalDateString,
  getLocalDateString,
  getRecentLocalDateStrings
} from "@/lib/date";
import { getCurrentProfile, signOutCurrentUser } from "@/lib/auth";
import {
  clearDemoCheckinsForDate,
  createDemoCheckin,
  createDemoAdminNotification,
  createDemoMakeupCheckin,
  createDemoMissedReason,
  getDemoCheckins,
  getDemoSchedules
} from "@/lib/demoData";
import { buildWeeklyStats } from "@/lib/stats";
import { hasSupabaseConfig, supabase } from "@/lib/supabaseClient";
import type {
  Checkin,
  MedicineSchedule,
  ScheduleWithCheckin,
  WeeklyStats
} from "@/lib/types";

const scheduleOrder = ["morning", "noon", "evening"];

export default function PatientAppPage() {
  const router = useRouter();
  const today = useMemo(() => getLocalDateString(), []);
  const last7Days = useMemo(() => getRecentLocalDateStrings(7), []);
  const monthStart = useMemo(() => getMonthStartLocalDateString(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [profileStartDate, setProfileStartDate] = useState<string | null>(null);
  const [items, setItems] = useState<ScheduleWithCheckin[]>([]);
  const [schedules, setSchedules] = useState<MedicineSchedule[]>([]);
  const [monthCheckins, setMonthCheckins] = useState<Checkin[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [celebrationMessage, setCelebrationMessage] = useState("");

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
    setProfileStartDate(profile.created_at.slice(0, 10));
    const statsStartDate =
      profile.created_at.slice(0, 10) > last7Days[0]
        ? profile.created_at.slice(0, 10)
        : last7Days[0];
    const queryStartDate = [statsStartDate, monthStart].sort()[0];

    if (!hasSupabaseConfig) {
      const schedules = getDemoSchedules(user.id);
      const checkins = getDemoCheckins(user.id, queryStartDate, today);
      const checkinBySchedule = new Map(
        checkins
          .filter((checkin) => checkin.checkin_date === today)
          .map((checkin) => [checkin.schedule_id, checkin])
      );
      const orderedSchedules = sortSchedules(schedules);
      setSchedules(orderedSchedules);
      setMonthCheckins(
        checkins.filter((checkin) => checkin.checkin_date >= monthStart)
      );
      setItems(
        orderedSchedules.map((schedule) => ({
          ...schedule,
          checkin: checkinBySchedule.get(schedule.id) ?? null
        }))
      );
      setWeeklyStats(
        buildWeeklyStats(orderedSchedules, checkins, {
          startDate: statsStartDate
        })
      );
      setIsLoading(false);
      return;
    }

    const [{ data: schedules, error: schedulesError }, { data: checkins, error: checkinsError }] =
      await Promise.all([
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
          .gte("checkin_date", queryStartDate)
          .lte("checkin_date", today)
          .returns<Checkin[]>()
      ]);

    if (schedulesError || checkinsError) {
      setMessage(schedulesError?.message ?? checkinsError?.message ?? "读取失败");
      setIsLoading(false);
      return;
    }

    const checkinBySchedule = new Map(
      (checkins ?? [])
        .filter((checkin) => checkin.checkin_date === today)
        .map((checkin) => [checkin.schedule_id, checkin])
    );

    const orderedSchedules = sortSchedules(schedules ?? []);
    setSchedules(orderedSchedules);
    setMonthCheckins(
      (checkins ?? []).filter((checkin) => checkin.checkin_date >= monthStart)
    );
    const merged = orderedSchedules.map((schedule) => ({
        ...schedule,
        checkin: checkinBySchedule.get(schedule.id) ?? null
      }));

    setItems(merged);
    setWeeklyStats(
      buildWeeklyStats(orderedSchedules, checkins ?? [], {
        startDate: statsStartDate
      })
    );
    setIsLoading(false);
  }

  async function handleCheckin(scheduleId: string) {
    if (!userId) {
      return;
    }

    setSubmittingId(scheduleId);
    setMessage("");

    if (!hasSupabaseConfig) {
      const { data, error } = createDemoCheckin(userId, scheduleId, today);
      setSubmittingId(null);

      if (error) {
        setMessage(error);
        return;
      }

      setItems((current) =>
        current.map((item) =>
          item.id === scheduleId ? { ...item, checkin: data } : item
        )
      );
      const schedule = items.find((item) => item.id === scheduleId);
      if (data && schedule) {
        createDemoAdminNotification(data, schedule.display_name);
      }
      showCelebration("嘉嘉真棒！要开开心心哦~");
      await loadToday();
      return;
    }

    const { data, error } = await supabase
      .from("checkins")
      .insert({
        user_id: userId,
        schedule_id: scheduleId,
        checkin_date: today,
        status: "checked",
        checkin_type: "normal"
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

    setItems((current) =>
      current.map((item) =>
        item.id === scheduleId ? { ...item, checkin: data } : item
      )
    );
    await createAdminNotification(data, scheduleId);
    showCelebration("嘉嘉真棒！要开开心心哦~");
    await loadToday();
  }

  async function handleMakeupCheckin(
    scheduleId: string,
    actualTakenAt: string,
    note: string
  ) {
    if (!userId) {
      return;
    }

    setSubmittingId(scheduleId);
    setMessage("");

    if (!hasSupabaseConfig) {
      const { data, error } = createDemoMakeupCheckin(
        userId,
        scheduleId,
        today,
        actualTakenAt,
        note
      );
      setSubmittingId(null);

      if (error) {
        setMessage(error);
        return;
      }

      const schedule = items.find((item) => item.id === scheduleId);
      if (data && schedule) {
        createDemoAdminNotification(data, schedule.display_name);
      }
      showCelebration("嘉嘉公主虽迟但到！嘿嘿~");
      await loadToday();
      return;
    }

    const { data, error } = await supabase
      .from("checkins")
      .insert({
        user_id: userId,
        schedule_id: scheduleId,
        checkin_date: today,
        status: "checked",
        checkin_type: "makeup",
        actual_taken_at: actualTakenAt,
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
    showCelebration("嘉嘉公主虽迟但到！嘿嘿~");
    await loadToday();
  }

  function showCelebration(nextMessage: string) {
    setCelebrationMessage(nextMessage);
    window.setTimeout(() => {
      setCelebrationMessage("");
    }, 3200);
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

  async function handleSubmitMissedReason(scheduleId: string, reason: string) {
    if (!userId) {
      return;
    }

    setSubmittingId(scheduleId);
    setMessage("");

    if (!hasSupabaseConfig) {
      const { data, error } = createDemoMissedReason(
        userId,
        scheduleId,
        today,
        reason
      );
      setSubmittingId(null);

      if (error) {
        setMessage(error);
        return;
      }

      setItems((current) =>
        current.map((item) =>
          item.id === scheduleId ? { ...item, checkin: data } : item
        )
      );
      return;
    }

    const { data, error } = await supabase
      .from("checkins")
      .insert({
        user_id: userId,
        schedule_id: scheduleId,
        checkin_date: today,
        status: "missed",
        note: reason
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

    setItems((current) =>
      current.map((item) =>
        item.id === scheduleId ? { ...item, checkin: data } : item
      )
    );
  }

  async function handleSignOut() {
    await signOutCurrentUser();
    router.replace("/login");
  }

  async function handleClearDemoToday() {
    if (!userId) {
      return;
    }

    clearDemoCheckinsForDate(userId, today);
    setCelebrationMessage("");
    setMessage("今天的本地演示打卡记录已清空，可以重新测试。");
    await loadToday();
  }

  return (
    <main className="min-h-dvh bg-brand-50">
      <CelebrationToast
        message={celebrationMessage}
        onClose={() => setCelebrationMessage("")}
      />
      <div className="mx-auto w-full max-w-md px-5 py-6">
      <header className="rounded-lg bg-white p-5 shadow-soft ring-1 ring-brand-100">
        <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-brand-700">嘉嘉</p>
          <h1 className="text-3xl font-bold tracking-normal text-slate-950">
            今日喝药打卡
          </h1>
          <p className="mt-2 text-sm text-slate-600">{formatChineseDate()}</p>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="h-10 shrink-0 rounded-lg bg-brand-50 px-3 text-sm font-semibold text-brand-700 ring-1 ring-brand-100 active:bg-brand-100"
        >
          退出
        </button>
        </div>
      </header>

      <NotificationSetup />

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
        ) : (
          <TodayCheckinList
            items={items}
            checkinDate={today}
            submittingId={submittingId}
            onCheckin={handleCheckin}
            onSubmitMissedReason={handleSubmitMissedReason}
            onMakeupCheckin={handleMakeupCheckin}
          />
        )}
      </section>

      {weeklyStats ? (
        <div className="mt-5">
          <WeeklyStatsSummary stats={weeklyStats} />
        </div>
      ) : null}

      {schedules.length > 0 ? (
        <div className="mt-5">
          <MonthlyCheckinCalendar
            schedules={schedules}
            checkins={monthCheckins}
            startDate={profileStartDate}
          />
        </div>
      ) : null}

      {message ? (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-800 ring-1 ring-amber-200">
          {message}
        </p>
      ) : null}
      </div>
    </main>
  );
}

function sortSchedules(schedules: MedicineSchedule[]) {
  return [...schedules].sort((a, b) => {
    const aIndex = scheduleOrder.indexOf(a.label);
    const bIndex = scheduleOrder.indexOf(b.label);

    if (aIndex === -1 || bIndex === -1) {
      return a.reminder_time.localeCompare(b.reminder_time);
    }

    return aIndex - bIndex;
  });
}
