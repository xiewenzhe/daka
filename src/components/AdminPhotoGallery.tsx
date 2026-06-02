"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { formatClock } from "@/lib/date";
import type { Checkin, MedicineSchedule } from "@/lib/types";

type AdminPhotoGalleryProps = {
  checkins: Checkin[];
  schedules: MedicineSchedule[];
};

export function AdminPhotoGallery({
  checkins,
  schedules
}: AdminPhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Checkin | null>(null);
  const scheduleById = useMemo(
    () => new Map(schedules.map((schedule) => [schedule.id, schedule])),
    [schedules]
  );
  const photoCheckins = useMemo(
    () =>
      checkins
        .filter((checkin) => Boolean(checkin.photo_url))
        .sort((a, b) => b.checked_at.localeCompare(a.checked_at)),
    [checkins]
  );

  return (
    <section className="rounded-lg bg-white p-4 shadow-soft ring-1 ring-brand-100">
      <div>
        <p className="text-sm font-semibold text-brand-700">图片记录</p>
        <h2 className="mt-1 text-lg font-bold text-slate-950">打卡照片</h2>
      </div>

      {photoCheckins.length === 0 ? (
        <p className="mt-4 rounded-lg bg-brand-50 px-3 py-3 text-sm text-slate-600 ring-1 ring-brand-100">
          目前还没有带图片的打卡记录。
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {photoCheckins.map((checkin) => {
            const schedule = scheduleById.get(checkin.schedule_id);

            return (
              <button
                key={checkin.id}
                type="button"
                onClick={() => setSelectedPhoto(checkin)}
                className="overflow-hidden rounded-lg bg-brand-50 text-left ring-1 ring-brand-100 active:bg-brand-100"
              >
                <Image
                  src={checkin.photo_url ?? ""}
                  alt="打卡照片"
                  width={320}
                  height={220}
                  unoptimized
                  className="aspect-[4/3] w-full object-cover"
                />
                <div className="px-3 py-2">
                  <p className="text-sm font-black text-slate-900">
                    {formatDisplayDate(checkin.checkin_date)}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {schedule?.display_name ?? "打卡"} · {formatClock(checkin.checked_at)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedPhoto ? (
        <PhotoModal
          checkin={selectedPhoto}
          schedule={scheduleById.get(selectedPhoto.schedule_id)}
          onClose={() => setSelectedPhoto(null)}
        />
      ) : null}
    </section>
  );
}

function PhotoModal({
  checkin,
  schedule,
  onClose
}: {
  checkin: Checkin;
  schedule?: MedicineSchedule;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-8">
      <div className="max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-4 shadow-2xl ring-1 ring-brand-100">
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-brand-700">照片详情</p>
            <h3 className="mt-1 text-xl font-black text-slate-950">
              {formatDisplayDate(checkin.checkin_date)}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-lg font-black text-brand-700 ring-1 ring-brand-100 active:bg-brand-100"
            aria-label="关闭照片"
          >
            ×
          </button>
        </div>

        <Image
          src={checkin.photo_url ?? ""}
          alt="放大的打卡照片"
          width={900}
          height={900}
          unoptimized
          className="max-h-[58dvh] w-full rounded-lg object-contain ring-1 ring-brand-100"
        />

        <div className="mt-3 rounded-lg bg-brand-50 px-3 py-3 text-sm leading-6 text-slate-700 ring-1 ring-brand-100">
          <p className="font-bold text-slate-900">
            {schedule?.display_name ?? "打卡"} ·{" "}
            {checkin.checkin_type === "makeup" ? "补打卡" : "正常打卡"}
          </p>
          <p>记录时间：{formatClock(checkin.checked_at)}</p>
          {checkin.actual_taken_at ? (
            <p>实际喝药：{formatClock(checkin.actual_taken_at)}</p>
          ) : null}
          {checkin.note ? <p className="whitespace-pre-wrap">备注：{checkin.note}</p> : null}
        </div>
      </div>
    </div>
  );
}

function formatDisplayDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${year}年${Number(month)}月${Number(day)}日`;
}
