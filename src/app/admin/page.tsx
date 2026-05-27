"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminHistorySummary } from "@/components/AdminHistorySummary";
import { AdminTodayStatus } from "@/components/AdminTodayStatus";
import {
  formatChineseDate,
  getLocalDateString,
  getRecentLocalDateStrings
} from "@/lib/date";
import { getCurrentProfile, signOutCurrentUser } from "@/lib/auth";
import {
  demoPatientProfile,
  getDemoCheckins,
  getDemoSchedules
} from "@/lib/demoData";
import { hasSupabaseConfig, supabase } from "@/lib/supabaseClient";
import type {
  Checkin,
  DailyCheckinSummary,
  MedicineSchedule,
  Profile,
  ScheduleWithCheckin
} from "@/lib/types";

const scheduleOrder = ["morning", "noon", "evening"];

type CareLinkRow = {
  patient_id: string;
};

export default function AdminPage() {
  const router = useRouter();
  const today = useMemo(() => getLocalDateString(), []);
  const last7Days = useMemo(() => getRecentLocalDateStrings(7), []);
  const last30Days = useMemo(() => getRecentLocalDateStrings(30), []);
  const [patient, setPatient] = useState<Profile | null>(null);
  const [todayItems, setTodayItems] = useState<ScheduleWithCheckin[]>([]);
  const [sevenDaySummaries, setSevenDaySummaries] = useState<DailyCheckinSummary[]>(
    []
  );
  const [thirtyDayRate, setThirtyDayRate] = useState(0);
  const [totalThirtyDayCheckins, setTotalThirtyDayCheckins] = useState(0);
  const [totalThirtyDaySlots, setTotalThirtyDaySlots] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadAdminDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAdminDashboard() {
    setIsLoading(true);
    setMessage("");

    const { user, profile } = await getCurrentProfile();

    if (!user || !profile) {
      router.replace("/login");
      return;
    }

    if (profile.role !== "admin") {
      router.replace("/app");
      return;
    }

    if (!hasSupabaseConfig) {
      const orderedSchedules = sortSchedules(getDemoSchedules(demoPatientProfile.id));
      const checkins = getDemoCheckins(
        demoPatientProfile.id,
        last30Days[0],
        today
      );
      buildDashboard(demoPatientProfile, orderedSchedules, checkins);
      setIsLoading(false);
      return;
    }

    const { data: link, error: linkError } = await supabase
      .from("care_links")
      .select("patient_id")
      .eq("admin_id", user.id)
      .limit(1)
      .single<CareLinkRow>();

    if (linkError || !link) {
      setMessage("还没有绑定 patient。请先在 Supabase 里执行 seed.sql。");
      setIsLoading(false);
      return;
    }

    const [
      { data: patientProfile, error: patientError },
      { data: schedules, error: schedulesError },
      { data: checkins, error: checkinsError }
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .eq("id", link.patient_id)
        .single<Profile>(),
      supabase
        .from("medicine_schedules")
        .select("*")
        .eq("user_id", link.patient_id)
        .eq("enabled", true)
        .order("reminder_time", { ascending: true })
        .returns<MedicineSchedule[]>(),
      supabase
        .from("checkins")
        .select("*")
        .eq("user_id", link.patient_id)
        .gte("checkin_date", last30Days[0])
        .lte("checkin_date", today)
        .returns<Checkin[]>()
    ]);

    if (patientError || schedulesError || checkinsError) {
      setMessage(
        patientError?.message ??
          schedulesError?.message ??
          checkinsError?.message ??
          "读取管理员数据失败"
      );
      setIsLoading(false);
      return;
    }

    buildDashboard(patientProfile, sortSchedules(schedules ?? []), checkins ?? []);
    setIsLoading(false);
  }

  function buildDashboard(
    targetPatient: Profile,
    orderedSchedules: MedicineSchedule[],
    checkins: Checkin[]
  ) {
    const checkinsByScheduleToday = new Map(
      checkins
        .filter((checkin) => checkin.checkin_date === today)
        .map((checkin) => [checkin.schedule_id, checkin])
    );

    setPatient(targetPatient);
    setTodayItems(
      orderedSchedules.map((schedule) => ({
        ...schedule,
        checkin: checkinsByScheduleToday.get(schedule.id) ?? null
      }))
    );

    const checkinsByDate = checkins.reduce<Record<string, number>>(
      (result, checkin) => {
        if (checkin.status === "checked") {
          result[checkin.checkin_date] = (result[checkin.checkin_date] ?? 0) + 1;
        }
        return result;
      },
      {}
    );

    const totalCount = orderedSchedules.length || 3;
    setSevenDaySummaries(
      last7Days.map((date) => ({
        date,
        checkedCount: checkinsByDate[date] ?? 0,
        totalCount
      }))
    );

    const thirtyDayCheckins = last30Days.reduce(
      (sum, date) => sum + (checkinsByDate[date] ?? 0),
      0
    );
    const thirtyDaySlots = totalCount * last30Days.length;
    setTotalThirtyDayCheckins(thirtyDayCheckins);
    setTotalThirtyDaySlots(thirtyDaySlots);
    setThirtyDayRate(
      thirtyDaySlots > 0 ? Math.round((thirtyDayCheckins / thirtyDaySlots) * 100) : 0
    );
  }

  async function handleSignOut() {
    await signOutCurrentUser();
    router.replace("/login");
  }

  return (
    <main className="min-h-dvh bg-brand-50">
      <div className="mx-auto w-full max-w-md px-5 py-6">
      <header className="rounded-lg bg-white p-5 shadow-soft ring-1 ring-brand-100">
        <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-brand-700">管理员</p>
          <h1 className="mt-1 text-3xl font-bold tracking-normal text-slate-950">
            喝药记录
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

      <nav className="mt-5 flex gap-2">
        <Link
          href="/settings"
          className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-brand-700 ring-1 ring-brand-100 active:bg-brand-50"
        >
          设置
        </Link>
        <button
          type="button"
          onClick={loadAdminDashboard}
          className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-brand-700 ring-1 ring-brand-100 active:bg-brand-50"
        >
          刷新
        </button>
      </nav>

      <div className="mt-6 space-y-4">
        {isLoading ? (
          <div className="rounded-lg bg-white p-4 text-sm text-slate-600 shadow-soft ring-1 ring-brand-100">
            正在读取管理员看板...
          </div>
        ) : patient ? (
          <>
            <AdminTodayStatus
              patientName={patient.display_name ?? "朋友"}
              items={todayItems}
            />
            <AdminHistorySummary
              sevenDaySummaries={sevenDaySummaries}
              thirtyDayRate={thirtyDayRate}
              totalThirtyDayCheckins={totalThirtyDayCheckins}
              totalThirtyDaySlots={totalThirtyDaySlots}
            />
          </>
        ) : null}
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
