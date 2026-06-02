"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PatientHeader } from "@/components/PatientHeader";
import { PatientNav } from "@/components/PatientNav";
import { PatientPhotoWall } from "@/components/PatientPhotoWall";
import { getCurrentProfile } from "@/lib/auth";
import { getLocalDateString } from "@/lib/date";
import { getDemoCheckins, getDemoSchedules } from "@/lib/demoData";
import { sortSchedules } from "@/lib/patientHelpers";
import { hasSupabaseConfig, supabase } from "@/lib/supabaseClient";
import type { Checkin, MedicineSchedule } from "@/lib/types";

export default function PatientPhotosPage() {
  const router = useRouter();
  const today = useMemo(() => getLocalDateString(), []);
  const [schedules, setSchedules] = useState<MedicineSchedule[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadPhotos() {
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

    const startDate = profile.created_at.slice(0, 10);

    if (!hasSupabaseConfig) {
      setSchedules(sortSchedules(getDemoSchedules(user.id)));
      setCheckins(getDemoCheckins(user.id, startDate, today));
      setIsLoading(false);
      return;
    }

    const [
      { data: schedulesData, error: schedulesError },
      { data: checkinsData, error: checkinsError }
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
        .not("photo_url", "is", null)
        .gte("checkin_date", startDate)
        .lte("checkin_date", today)
        .order("checked_at", { ascending: false })
        .returns<Checkin[]>()
    ]);

    if (schedulesError || checkinsError) {
      setMessage(schedulesError?.message ?? checkinsError?.message ?? "读取照片失败");
      setIsLoading(false);
      return;
    }

    setSchedules(sortSchedules(schedulesData ?? []));
    setCheckins(checkinsData ?? []);
    setIsLoading(false);
  }

  return (
    <main className="min-h-dvh bg-brand-50">
      <div className="mx-auto w-full max-w-md px-5 py-6">
        <PatientHeader title="打卡照片墙" />
        <PatientNav />

        <div className="mt-6">
          {isLoading ? (
            <div className="rounded-lg bg-white p-4 text-sm text-slate-600 shadow-soft ring-1 ring-brand-100">
              正在读取照片墙...
            </div>
          ) : (
            <PatientPhotoWall checkins={checkins} schedules={schedules} />
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
