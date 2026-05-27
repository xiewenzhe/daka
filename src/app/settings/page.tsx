"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import {
  demoPatientProfile,
  getDemoSchedules,
  updateDemoScheduleTime
} from "@/lib/demoData";
import { formatTime } from "@/lib/date";
import { hasSupabaseConfig, supabase } from "@/lib/supabaseClient";
import type { MedicineSchedule, Profile } from "@/lib/types";

type CareLinkRow = {
  patient_id: string;
};

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<MedicineSchedule[]>([]);
  const [times, setTimes] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSettings() {
    setIsLoading(true);
    setMessage("");

    const { user, profile: currentProfile } = await getCurrentProfile();

    if (!user || !currentProfile) {
      router.replace("/login");
      return;
    }

    if (currentProfile.role !== "admin") {
      router.replace("/app");
      return;
    }

    setProfile(currentProfile);

    if (!hasSupabaseConfig) {
      const demoSchedules = getDemoSchedules(demoPatientProfile.id);
      setPatientId(demoPatientProfile.id);
      setSchedules(sortSchedules(demoSchedules));
      setTimes(toTimeMap(demoSchedules));
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
      setMessage("还没有绑定嘉嘉账号，请先执行 seed.sql。");
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("medicine_schedules")
      .select("*")
      .eq("user_id", link.patient_id)
      .eq("enabled", true)
      .order("reminder_time", { ascending: true })
      .returns<MedicineSchedule[]>();

    if (error) {
      setMessage(error.message);
      setIsLoading(false);
      return;
    }

    setPatientId(link.patient_id);
    setSchedules(sortSchedules(data ?? []));
    setTimes(toTimeMap(data ?? []));
    setIsLoading(false);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!profile || !patientId) {
      return;
    }

    setIsSaving(true);
    setMessage("");

    if (!hasSupabaseConfig) {
      const nextSchedules = schedules.map((schedule) => {
        const updated = updateDemoScheduleTime(schedule.id, times[schedule.id]);
        return updated ?? schedule;
      });
      setSchedules(sortSchedules(nextSchedules));
      setIsSaving(false);
      setMessage("已保存喝药时间。");
      return;
    }

    const updates = schedules.map((schedule) =>
      supabase
        .from("medicine_schedules")
        .update({ reminder_time: times[schedule.id] })
        .eq("id", schedule.id)
        .eq("user_id", patientId)
    );

    const results = await Promise.all(updates);
    const error = results.find((result) => result.error)?.error;

    setIsSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("已保存喝药时间。");
    await loadSettings();
  }

  return (
    <main className="min-h-dvh bg-brand-50">
      <div className="mx-auto w-full max-w-md px-5 py-6">
        <header className="rounded-lg bg-white p-5 shadow-soft ring-1 ring-brand-100">
          <p className="text-sm font-semibold text-brand-700">管理员设置</p>
          <h1 className="mt-1 text-3xl font-bold tracking-normal text-slate-950">
            修改喝药时间
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            保存后，嘉嘉的打卡窗口会按新时间重新计算。
          </p>
        </header>

        <section className="mt-5 rounded-lg bg-white p-4 shadow-soft ring-1 ring-brand-100">
          {isLoading ? (
            <p className="text-sm text-slate-600">正在读取设置...</p>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              {schedules.map((schedule) => (
                <label
                  key={schedule.id}
                  className="flex items-center justify-between gap-4 rounded-lg bg-brand-50 px-3 py-3 ring-1 ring-brand-100"
                >
                  <span className="font-semibold text-slate-900">
                    {schedule.display_name}
                  </span>
                  <input
                    type="time"
                    required
                    value={times[schedule.id] ?? formatTime(schedule.reminder_time)}
                    onChange={(event) =>
                      setTimes((current) => ({
                        ...current,
                        [schedule.id]: event.target.value
                      }))
                    }
                    className="h-11 rounded-lg border border-brand-100 bg-white px-3 text-base font-bold text-brand-700 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                  />
                </label>
              ))}

              <button
                type="submit"
                disabled={isSaving || schedules.length === 0}
                className="h-12 w-full rounded-lg bg-brand-600 px-4 text-base font-bold text-white shadow-sm active:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
              >
                {isSaving ? "正在保存..." : "保存时间"}
              </button>
            </form>
          )}
        </section>

        {message ? (
          <p className="mt-4 rounded-lg bg-white px-3 py-2 text-sm leading-6 text-slate-700 shadow-sm ring-1 ring-brand-100">
            {message}
          </p>
        ) : null}

        <Link
          href="/admin"
          className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-lg bg-white px-4 text-sm font-bold text-slate-700 ring-1 ring-brand-100 active:bg-brand-50"
        >
          返回管理员页面
        </Link>
      </div>
    </main>
  );
}

function toTimeMap(schedules: MedicineSchedule[]) {
  return schedules.reduce<Record<string, string>>((result, schedule) => {
    result[schedule.id] = formatTime(schedule.reminder_time);
    return result;
  }, {});
}

function sortSchedules(schedules: MedicineSchedule[]) {
  const order = ["morning", "noon", "evening"];

  return [...schedules].sort((a, b) => {
    const aIndex = order.indexOf(a.label);
    const bIndex = order.indexOf(b.label);

    if (aIndex === -1 || bIndex === -1) {
      return a.reminder_time.localeCompare(b.reminder_time);
    }

    return aIndex - bIndex;
  });
}
