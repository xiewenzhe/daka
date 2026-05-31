"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminAnalytics } from "@/components/AdminAnalytics";
import { AdminFeedbacks } from "@/components/AdminFeedbacks";
import { AdminNotifications } from "@/components/AdminNotifications";
import { AdminTodayStatus } from "@/components/AdminTodayStatus";
import { EncouragementManager } from "@/components/EncouragementManager";
import { WeeklyStatsSummary } from "@/components/WeeklyStatsSummary";
import { buildAdminAnalysis } from "@/lib/analytics";
import type { AdminAnalysis } from "@/lib/analytics";
import {
  formatChineseDate,
  getLocalDateString,
  getRecentLocalDateStrings
} from "@/lib/date";
import { getCurrentProfile, signOutCurrentUser } from "@/lib/auth";
import {
  createDemoEncouragementMessage,
  deleteDemoEncouragementMessage,
  demoPatientProfile,
  getDemoAdminNotifications,
  getDemoCheckins,
  getDemoEncouragementMessages,
  getDemoFeedbacks,
  getDemoPauseDays,
  getDemoSchedules,
  updateDemoEncouragementMessage
} from "@/lib/demoData";
import { buildWeeklyStats } from "@/lib/stats";
import { hasSupabaseConfig, supabase } from "@/lib/supabaseClient";
import type {
  AdminNotification,
  Checkin,
  EncouragementMessage,
  EncouragementType,
  Feedback,
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
  const last30Days = useMemo(() => getRecentLocalDateStrings(30), []);
  const [patient, setPatient] = useState<Profile | null>(null);
  const [todayItems, setTodayItems] = useState<ScheduleWithCheckin[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null);
  const [analysis, setAnalysis] = useState<AdminAnalysis | null>(null);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [encouragements, setEncouragements] = useState<EncouragementMessage[]>([]);
  const [isSavingEncouragement, setIsSavingEncouragement] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "today" | "messages" | "analysis" | "encouragement"
  >("today");
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
      const analysisStartDate =
        demoPatientProfile.created_at.slice(0, 10) > last30Days[0]
          ? demoPatientProfile.created_at.slice(0, 10)
          : last30Days[0];
      const checkins = getDemoCheckins(
        demoPatientProfile.id,
        analysisStartDate,
        today
      );
      const pauseDays = getDemoPauseDays(
        demoPatientProfile.id,
        analysisStartDate,
        today
      );
      buildDashboard(
        demoPatientProfile,
        orderedSchedules,
        checkins,
        statsStartDate,
        pauseDays.map((pause) => pause.pause_date)
      );
      setAnalysis(
        buildAdminAnalysis(orderedSchedules, checkins, {
          startDate: analysisStartDate,
          pauseDates: pauseDays.map((pause) => pause.pause_date)
        })
      );
      setNotifications(getDemoAdminNotifications().slice(0, 10));
      setFeedbacks(getDemoFeedbacks().slice(0, 10));
      setEncouragements(getDemoEncouragementMessages(demoPatientProfile.id));
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
      { data: notificationsData, error: notificationsError },
      { data: feedbacksData, error: feedbacksError },
      { data: encouragementsData, error: encouragementsError }
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
        .returns<AdminNotification[]>(),
      supabase
        .from("feedbacks")
        .select("*")
        .eq("admin_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10)
        .returns<Feedback[]>(),
      supabase
        .from("encouragement_messages")
        .select("*")
        .eq("patient_id", link.patient_id)
        .order("created_at", { ascending: false })
        .returns<EncouragementMessage[]>()
    ]);

    if (
      patientError ||
      schedulesError ||
      notificationsError ||
      feedbacksError ||
      encouragementsError ||
      !patientProfile
    ) {
      setMessage(
        patientError?.message ??
          schedulesError?.message ??
          notificationsError?.message ??
          feedbacksError?.message ??
          encouragementsError?.message ??
          "读取管理员数据失败"
      );
      setIsLoading(false);
      return;
    }

    const statsStartDate =
      patientProfile.created_at.slice(0, 10) > last7Days[0]
        ? patientProfile.created_at.slice(0, 10)
        : last7Days[0];
    const analysisStartDate =
      patientProfile.created_at.slice(0, 10) > last30Days[0]
        ? patientProfile.created_at.slice(0, 10)
        : last30Days[0];

    const [
      { data: checkins, error: checkinsError },
      { data: pauseDays, error: pauseDaysError }
    ] = await Promise.all([
      supabase
        .from("checkins")
        .select("*")
        .eq("user_id", link.patient_id)
        .gte("checkin_date", analysisStartDate)
        .lte("checkin_date", today)
        .returns<Checkin[]>(),
      supabase
        .from("pause_days")
        .select("*")
        .eq("user_id", link.patient_id)
        .gte("pause_date", analysisStartDate)
        .lte("pause_date", today)
        .returns<Array<{ pause_date: string }>>()
    ]);

    if (checkinsError || pauseDaysError) {
      setMessage(checkinsError?.message ?? pauseDaysError?.message ?? "读取失败");
      setIsLoading(false);
      return;
    }

    const orderedSchedules = sortSchedules(schedules ?? []);
    const pauseDates = (pauseDays ?? []).map((pause) => pause.pause_date);
    buildDashboard(
      patientProfile,
      orderedSchedules,
      checkins ?? [],
      statsStartDate,
      pauseDates
    );
    setAnalysis(
      buildAdminAnalysis(orderedSchedules, checkins ?? [], {
        startDate: analysisStartDate,
        pauseDates
      })
    );
    setNotifications(notificationsData ?? []);
    setFeedbacks(feedbacksData ?? []);
    setEncouragements(encouragementsData ?? []);
    setIsLoading(false);
  }

  function buildDashboard(
    targetPatient: Profile,
    orderedSchedules: MedicineSchedule[],
    checkins: Checkin[],
    statsStartDate: string,
    pauseDates: string[] = []
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
        startDate: statsStartDate,
        pauseDates
      })
    );
  }

  async function handleCreateEncouragement(
    type: EncouragementType,
    content: string
  ) {
    if (!patient) {
      return;
    }

    setIsSavingEncouragement(true);
    setMessage("");

    if (!hasSupabaseConfig) {
      createDemoEncouragementMessage(patient.id, type, content);
      setIsSavingEncouragement(false);
      setMessage("鼓励语已新增。");
      await loadAdminDashboard();
      return;
    }

    const { error } = await supabase.from("encouragement_messages").insert({
      patient_id: patient.id,
      type,
      content: content.trim(),
      enabled: true
    });

    setIsSavingEncouragement(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("鼓励语已新增。");
    await loadAdminDashboard();
  }

  async function handleUpdateEncouragement(
    id: string,
    updates: Partial<Pick<EncouragementMessage, "content" | "enabled" | "type">>
  ) {
    setIsSavingEncouragement(true);
    setMessage("");

    if (!hasSupabaseConfig) {
      updateDemoEncouragementMessage(id, updates);
      setIsSavingEncouragement(false);
      setMessage("鼓励语已更新。");
      await loadAdminDashboard();
      return;
    }

    const { error } = await supabase
      .from("encouragement_messages")
      .update({
        ...updates,
        content: updates.content?.trim(),
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

    setIsSavingEncouragement(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("鼓励语已更新。");
    await loadAdminDashboard();
  }

  async function handleDeleteEncouragement(id: string) {
    setIsSavingEncouragement(true);
    setMessage("");

    if (!hasSupabaseConfig) {
      deleteDemoEncouragementMessage(id);
      setIsSavingEncouragement(false);
      setMessage("鼓励语已删除。");
      await loadAdminDashboard();
      return;
    }

    const { error } = await supabase
      .from("encouragement_messages")
      .delete()
      .eq("id", id);

    setIsSavingEncouragement(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("鼓励语已删除。");
    await loadAdminDashboard();
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

      <div className="mt-3 grid grid-cols-4 gap-2">
        {[
          ["today", "今日"],
          ["messages", "消息"],
          ["analysis", "分析"],
          ["encouragement", "鼓励语"]
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() =>
              setActiveTab(key as "today" | "messages" | "analysis" | "encouragement")
            }
            className={`h-10 rounded-lg px-2 text-sm font-bold ring-1 ${
              activeTab === key
                ? "bg-brand-600 text-white ring-brand-600"
                : "bg-white text-brand-700 ring-brand-100 active:bg-brand-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {isLoading ? (
          <div className="rounded-lg bg-white p-4 text-sm text-slate-600 shadow-soft ring-1 ring-brand-100">
            正在读取管理员看板...
          </div>
        ) : patient ? (
          <>
            {activeTab === "today" ? (
              <AdminTodayStatus
                patientName={patient.display_name ?? "朋友"}
                checkinDate={today}
                items={todayItems}
              />
            ) : null}
            {activeTab === "messages" ? (
              <>
                <AdminNotifications notifications={notifications} />
                <AdminFeedbacks
                  feedbacks={feedbacks}
                  patientName={patient.display_name ?? "朋友"}
                />
              </>
            ) : null}
            {activeTab === "analysis" ? (
              <>
                {analysis ? <AdminAnalytics analysis={analysis} /> : null}
                {weeklyStats ? <WeeklyStatsSummary stats={weeklyStats} /> : null}
              </>
            ) : null}
            {activeTab === "encouragement" ? (
              <EncouragementManager
                messages={encouragements}
                isSaving={isSavingEncouragement}
                onCreate={handleCreateEncouragement}
                onUpdate={handleUpdateEncouragement}
                onDelete={handleDeleteEncouragement}
              />
            ) : null}
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
