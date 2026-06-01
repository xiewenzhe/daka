"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AchievementSummary } from "@/components/AchievementSummary";
import { SwitchableCalendar } from "@/components/SwitchableCalendar";
import { PatientHeader } from "@/components/PatientHeader";
import { PatientNav } from "@/components/PatientNav";
import { WeeklyStatsSummary } from "@/components/WeeklyStatsSummary";
import {
  getLocalDateString,
  getMonthStartLocalDateString,
  getRecentLocalDateStrings
} from "@/lib/date";
import { getCurrentProfile } from "@/lib/auth";
import {
  getDemoCheckins,
  getDemoDailyMoods,
  getDemoPauseDays,
  getDemoSchedules
} from "@/lib/demoData";
import { sortSchedules } from "@/lib/patientHelpers";
import { buildWeeklyStats } from "@/lib/stats";
import { hasSupabaseConfig, supabase } from "@/lib/supabaseClient";
import type {
  Checkin,
  DailyMood,
  MedicineSchedule,
  PauseDay,
  WeeklyStats
} from "@/lib/types";

export default function PatientStatsPage() {
  const router = useRouter();
  const today = useMemo(() => getLocalDateString(), []);
  const monthStart = useMemo(() => getMonthStartLocalDateString(), []);
  const last7Days = useMemo(() => getRecentLocalDateStrings(7), []);
  const [profileStartDate, setProfileStartDate] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<MedicineSchedule[]>([]);
  const [monthCheckins, setMonthCheckins] = useState<Checkin[]>([]);
  const [monthMoods, setMonthMoods] = useState<DailyMood[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadStats() {
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

    const statsStartDate =
      profile.created_at.slice(0, 10) > last7Days[0]
        ? profile.created_at.slice(0, 10)
        : last7Days[0];
    const queryStartDate = [statsStartDate, monthStart].sort()[0];
    setProfileStartDate(profile.created_at.slice(0, 10));

    if (!hasSupabaseConfig) {
      const orderedSchedules = sortSchedules(getDemoSchedules(user.id));
      const checkins = getDemoCheckins(user.id, queryStartDate, today);
      const dailyMoods = getDemoDailyMoods(user.id, queryStartDate, today);
      const pauseDays = getDemoPauseDays(user.id, statsStartDate, today);
      setSchedules(orderedSchedules);
      setMonthMoods(
        dailyMoods.filter((dailyMood) => dailyMood.mood_date >= monthStart)
      );
      setMonthCheckins(
        checkins.filter((checkin) => checkin.checkin_date >= monthStart)
      );
      setWeeklyStats(
        buildWeeklyStats(orderedSchedules, checkins, {
          startDate: statsStartDate,
          pauseDates: pauseDays.map((pause) => pause.pause_date)
        })
      );
      setIsLoading(false);
      return;
    }

    const [
      { data: schedulesData, error: schedulesError },
      { data: checkins, error: checkinsError },
      { data: pauseDays, error: pauseDaysError },
      { data: dailyMoods, error: dailyMoodsError }
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
        .gte("checkin_date", queryStartDate)
        .lte("checkin_date", today)
        .returns<Checkin[]>(),
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
        .gte("mood_date", queryStartDate)
        .lte("mood_date", today)
        .returns<DailyMood[]>()
    ]);

    if (schedulesError || checkinsError || pauseDaysError || dailyMoodsError) {
      setMessage(
        schedulesError?.message ??
          checkinsError?.message ??
          pauseDaysError?.message ??
          dailyMoodsError?.message ??
          "读取统计失败"
      );
      setIsLoading(false);
      return;
    }

    const orderedSchedules = sortSchedules(schedulesData ?? []);
    setSchedules(orderedSchedules);
    setMonthCheckins(
      (checkins ?? []).filter((checkin) => checkin.checkin_date >= monthStart)
    );
    setMonthMoods(
      (dailyMoods ?? []).filter((dailyMood) => dailyMood.mood_date >= monthStart)
    );
    setWeeklyStats(
      buildWeeklyStats(orderedSchedules, checkins ?? [], {
        startDate: statsStartDate,
        pauseDates: (pauseDays ?? []).map((pause) => pause.pause_date)
      })
    );
    setIsLoading(false);
  }

  return (
    <main className="min-h-dvh bg-brand-50">
      <div className="mx-auto w-full max-w-md px-5 py-6">
        <PatientHeader title="打卡统计" />
        <PatientNav />

        <div className="mt-6 space-y-5">
          {isLoading ? (
            <div className="rounded-lg bg-white p-4 text-sm text-slate-600 shadow-soft ring-1 ring-brand-100">
              正在读取统计...
            </div>
          ) : (
            <>
              {weeklyStats ? <WeeklyStatsSummary stats={weeklyStats} /> : null}
              {weeklyStats ? <AchievementSummary stats={weeklyStats} /> : null}
              {schedules.length > 0 ? (
                <SwitchableCalendar
                  schedules={schedules}
                  checkins={monthCheckins}
                  dailyMoods={monthMoods}
                  startDate={profileStartDate}
                  calendarType="checkin"
                />
              ) : null}
            </>
          )}
        </div>

        {message ? (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-800 ring-1 ring-amber-200">
            {message}
          </p>
        ) : null}
      </div>
    </main>
  );
}
