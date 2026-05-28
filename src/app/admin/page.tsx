"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminNotifications } from "@/components/AdminNotifications";
import { AdminTodayStatus } from "@/components/AdminTodayStatus";
import { WeeklyStatsSummary } from "@/components/WeeklyStatsSummary";
import {
  formatChineseDate,
  getLocalDateString,
  getRecentLocalDateStrings
} from "@/lib/date";
import { getCurrentProfile, signOutCurrentUser } from "@/lib/auth";
import {
  demoPatientProfile,
  getDemoAdminNotifications,
  getDemoCheckins,
  getDemoSchedules
} from "@/lib/demoData";
import { buildWeeklyStats } from "@/lib/stats";
import { hasSupabaseConfig, supabase } from "@/lib/supabaseClient";
import type {
  AdminNotification,
  Checkin,
  MedicineSchedule,
  Profile,
  ScheduleWithCheckin,
  WeeklyStats
} from "@/lib/types";

const scheduleOrder = ["morning", "noon", "evening"];

type CareLinkRow = {
  patient_id: string;
};

export default function AdminPage() {
  const router = useRouter();
  const today = useMemo(() => getLocalDateString(), []);
  const last7Days = useMemo(() => getRecentLocalDateStrings(7), []);
  const [patient, setPatient] = useState<Profile | null>(null);
  const [todayItems, setTodayItems] = useState<ScheduleWithCheckin[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
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
      const statsStartDate =
        demoPatientProfile.created_at.slice(0, 10) > last7Days[0]
          ? demoPatientProfile.created_at.slice(0, 10)
          : last7Days[0];
      const checkins = getDemoCheckins(
        demoPatientProfile.id,
        statsStartDate,
        today
      );
      buildDashboard(demoPatientProfile, orderedSchedules, checkins, statsStartDate);
      setNotifications(getDemoAdminNotifications().slice(0, 10));
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
      { data: notificationsData, error: notificationsError }
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
        .from("admin_notifications")
        .select("*")
        .eq("admin_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10)
        .returns<AdminNotification[]>()
    ]);

    if (patientError || schedulesError || notificationsError || !patientProfile) {
      setMessage(
        patientError?.message ??
          schedulesError?.message ??
          notificationsError?.message ??
          "读取管理员数据失败"
      );
      setIsLoading(false);
      return;
    }

    const statsStartDate =
      patientProfile.created_at.slice(0, 10) > last7Days[0]
        ? patientProfile.created_at.slice(0, 10)
        : last7Days[0];

    const { data: checkins, error: checkinsError } = await supabase
      .from("checkins")
      .select("*")
      .eq("user_id", link.patient_id)
      .gte("checkin_date", statsStartDate)
      .lte("checkin_date", today)
      .returns<Checkin[]>();

    if (checkinsError) {
      setMessage(checkinsError.message);
      setIsLoading(false);
      return;
    }

    buildDashboard(
      patientProfile,
      sortSchedules(schedules ?? []),
      checkins ?? [],
      statsStartDate
    );
    setNotifications(notificationsData ?? []);
    setIsLoading(false);
  }

  function buildDashboard(
    targetPatient: Profile,
    orderedSchedules: MedicineSchedule[],
    checkins: Checkin[],
    statsStartDate: string
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

    setWeeklyStats(
      buildWeeklyStats(orderedSchedules, checkins, {
        startDate: statsStartDate
      })
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
              checkinDate={today}
              items={todayItems}
            />
            <AdminNotifications notifications={notifications} />
            {weeklyStats ? <WeeklyStatsSummary stats={weeklyStats} /> : null}
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
