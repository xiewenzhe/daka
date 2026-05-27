"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { NotificationSetup } from "@/components/NotificationSetup";
import { TodayCheckinList } from "@/components/TodayCheckinList";
import { formatChineseDate, getLocalDateString } from "@/lib/date";
import { getCurrentProfile, signOutCurrentUser } from "@/lib/auth";
import {
  createDemoCheckin,
  createDemoMissedReason,
  getDemoCheckins,
  getDemoSchedules
} from "@/lib/demoData";
import { hasSupabaseConfig, supabase } from "@/lib/supabaseClient";
import type { Checkin, MedicineSchedule, ScheduleWithCheckin } from "@/lib/types";

const scheduleOrder = ["morning", "noon", "evening"];

export default function PatientAppPage() {
  const router = useRouter();
  const today = useMemo(() => getLocalDateString(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<ScheduleWithCheckin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

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

    if (!hasSupabaseConfig) {
      const schedules = getDemoSchedules(user.id);
      const checkins = getDemoCheckins(user.id, today, today);
      const checkinBySchedule = new Map(
        checkins.map((checkin) => [checkin.schedule_id, checkin])
      );
      setItems(
        sortSchedules(schedules).map((schedule) => ({
          ...schedule,
          checkin: checkinBySchedule.get(schedule.id) ?? null
        }))
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
          .eq("checkin_date", today)
          .returns<Checkin[]>()
      ]);

    if (schedulesError || checkinsError) {
      setMessage(schedulesError?.message ?? checkinsError?.message ?? "读取失败");
      setIsLoading(false);
      return;
    }

    const checkinBySchedule = new Map(
      (checkins ?? []).map((checkin) => [checkin.schedule_id, checkin])
    );

    const merged = sortSchedules(schedules ?? [])
      .map((schedule) => ({
        ...schedule,
        checkin: checkinBySchedule.get(schedule.id) ?? null
      }));

    setItems(merged);
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
      return;
    }

    const { data, error } = await supabase
      .from("checkins")
      .insert({
        user_id: userId,
        schedule_id: scheduleId,
        checkin_date: today,
        status: "checked"
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

  return (
    <main className="min-h-dvh bg-brand-50">
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
