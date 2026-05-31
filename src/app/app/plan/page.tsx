"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MedicinePlanEditor } from "@/components/MedicinePlanEditor";
import { PatientHeader } from "@/components/PatientHeader";
import { PatientNav } from "@/components/PatientNav";
import { PauseDayControl } from "@/components/PauseDayControl";
import { getLocalDateString } from "@/lib/date";
import { getCurrentProfile } from "@/lib/auth";
import {
  getDemoPauseDay,
  getDemoSchedules,
  removeDemoPauseDay,
  saveDemoPauseDay,
  updateDemoSchedulePlan
} from "@/lib/demoData";
import { sortSchedules } from "@/lib/patientHelpers";
import { hasSupabaseConfig, supabase } from "@/lib/supabaseClient";
import type { MedicineSchedule, PauseDay } from "@/lib/types";

export default function PatientPlanPage() {
  const router = useRouter();
  const today = useMemo(() => getLocalDateString(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<MedicineSchedule[]>([]);
  const [pauseDay, setPauseDay] = useState<PauseDay | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [isSavingPause, setIsSavingPause] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadPlan() {
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
      setSchedules(sortSchedules(getDemoSchedules(user.id)));
      setPauseDay(getDemoPauseDay(user.id, today));
      setIsLoading(false);
      return;
    }

    const [
      { data: schedulesData, error: schedulesError },
      { data: pauseData, error: pauseError }
    ] = await Promise.all([
      supabase
        .from("medicine_schedules")
        .select("*")
        .eq("user_id", user.id)
        .eq("enabled", true)
        .order("reminder_time", { ascending: true })
        .returns<MedicineSchedule[]>(),
      supabase
        .from("pause_days")
        .select("*")
        .eq("user_id", user.id)
        .eq("pause_date", today)
        .maybeSingle<PauseDay>()
    ]);

    if (schedulesError || pauseError) {
      setMessage(schedulesError?.message ?? pauseError?.message ?? "读取安排失败");
      setIsLoading(false);
      return;
    }

    setSchedules(sortSchedules(schedulesData ?? []));
    setPauseDay(pauseData ?? null);
    setIsLoading(false);
  }

  async function handleSaveMedicinePlans(plans: Record<string, string>) {
    if (!userId) {
      return;
    }

    setIsSavingPlan(true);
    setMessage("");

    if (!hasSupabaseConfig) {
      schedules.forEach((schedule) => {
        updateDemoSchedulePlan(schedule.id, plans[schedule.id] ?? "");
      });
      setIsSavingPlan(false);
      setMessage("喝药安排已保存。");
      await loadPlan();
      return;
    }

    const results = await Promise.all(
      schedules.map((schedule) =>
        supabase
          .from("medicine_schedules")
          .update({ medicine_plan: plans[schedule.id]?.trim() || null })
          .eq("id", schedule.id)
          .eq("user_id", userId)
      )
    );
    const error = results.find((result) => result.error)?.error;
    setIsSavingPlan(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("喝药安排已保存。");
    await loadPlan();
  }

  async function handleSavePauseDay(reason: string) {
    if (!userId) {
      return;
    }

    setIsSavingPause(true);
    setMessage("");

    if (!hasSupabaseConfig) {
      saveDemoPauseDay(userId, today, reason);
      setIsSavingPause(false);
      setMessage("今天已设置为暂停，不会计入漏打卡。");
      await loadPlan();
      return;
    }

    const { error } = await supabase.from("pause_days").upsert(
      {
        user_id: userId,
        pause_date: today,
        reason: reason.trim() || null
      },
      { onConflict: "user_id,pause_date" }
    );
    setIsSavingPause(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("今天已设置为暂停，不会计入漏打卡。");
    await loadPlan();
  }

  async function handleCancelPauseDay() {
    if (!userId) {
      return;
    }

    setIsSavingPause(true);
    setMessage("");

    if (!hasSupabaseConfig) {
      removeDemoPauseDay(userId, today);
      setIsSavingPause(false);
      setMessage("已取消今天暂停。");
      await loadPlan();
      return;
    }

    const { error } = await supabase
      .from("pause_days")
      .delete()
      .eq("user_id", userId)
      .eq("pause_date", today);
    setIsSavingPause(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("已取消今天暂停。");
    await loadPlan();
  }

  return (
    <main className="min-h-dvh bg-brand-50">
      <div className="mx-auto w-full max-w-md px-5 py-6">
        <PatientHeader title="喝药安排" />
        <PatientNav />

        <div className="mt-6 space-y-5">
          {isLoading ? (
            <div className="rounded-lg bg-white p-4 text-sm text-slate-600 shadow-soft ring-1 ring-brand-100">
              正在读取安排...
            </div>
          ) : (
            <>
              {schedules.length > 0 ? (
                <MedicinePlanEditor
                  schedules={schedules}
                  isSaving={isSavingPlan}
                  onSave={handleSaveMedicinePlans}
                />
              ) : null}
              <PauseDayControl
                pauseDay={pauseDay}
                isSaving={isSavingPause}
                onSave={handleSavePauseDay}
                onCancel={handleCancelPauseDay}
              />
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
