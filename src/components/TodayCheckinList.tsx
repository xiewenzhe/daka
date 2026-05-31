"use client";

import { CheckinCard } from "@/components/CheckinCard";
import type { ScheduleWithCheckin } from "@/lib/types";

type TodayCheckinListProps = {
  items: ScheduleWithCheckin[];
  checkinDate: string;
  submittingId: string | null;
  onCheckin: (
    scheduleId: string,
    mood?: string | null,
    photoFile?: File | null
  ) => void;
  onSubmitMissedReason: (scheduleId: string, reason: string) => void;
  onMakeupCheckin: (
    scheduleId: string,
    actualTakenAt: string,
    note: string,
    mood?: string | null,
    photoFile?: File | null
  ) => void;
};

export function TodayCheckinList({
  items,
  checkinDate,
  submittingId,
  onCheckin,
  onSubmitMissedReason,
  onMakeupCheckin
}: TodayCheckinListProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg bg-white p-4 text-sm leading-6 text-slate-600 shadow-soft ring-1 ring-brand-100">
        还没有喝药计划。请先在 Supabase 中为 patient 初始化三条
        medicine_schedules。
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <CheckinCard
          key={item.id}
          item={item}
          checkinDate={checkinDate}
          isSubmitting={submittingId === item.id}
          onCheckin={onCheckin}
          onCheckinWithMood={onCheckin}
          onSubmitMissedReason={onSubmitMissedReason}
          onMakeupCheckin={onMakeupCheckin}
        />
      ))}
    </div>
  );
}
