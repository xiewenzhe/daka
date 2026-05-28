"use client";

import { useState } from "react";
import {
  dateTimeLocalToIso,
  formatClockFromDate,
  formatDateTime,
  formatTime,
  getDateTimeLocalValue,
  getCheckinWindowStatus,
  getScheduleRuntimeStatus,
  getScheduleWindow
} from "@/lib/date";
import type { ScheduleWithCheckin } from "@/lib/types";

type CheckinCardProps = {
  item: ScheduleWithCheckin;
  checkinDate: string;
  isSubmitting: boolean;
  onCheckin: (scheduleId: string) => void;
  onSubmitMissedReason: (scheduleId: string, reason: string) => void;
  onMakeupCheckin: (
    scheduleId: string,
    actualTakenAt: string,
    note: string
  ) => void;
};

export function CheckinCard({
  item,
  checkinDate,
  isSubmitting,
  onCheckin,
  onMakeupCheckin
}: CheckinCardProps) {
  const [makeupTime, setMakeupTime] = useState(getDateTimeLocalValue());
  const [note, setNote] = useState("");
  const isDone = item.checkin?.status === "checked";
  const windowStatus = getCheckinWindowStatus(checkinDate, item.reminder_time);
  const runtimeStatus = getScheduleRuntimeStatus(
    checkinDate,
    item.reminder_time,
    item.checkin
  );
  const { startsAt, endsAt } = getScheduleWindow(checkinDate, item.reminder_time);
  const canCheckin = !item.checkin && windowStatus === "open";
  const isTooEarly = !item.checkin && windowStatus === "too_early";
  const isTooLate = !item.checkin && windowStatus === "too_late";
  const trimmedNote = note.trim();
  const isMakeup = item.checkin?.checkin_type === "makeup";
  const statusMeta = getStatusMeta(runtimeStatus, canCheckin);

  return (
    <article className="rounded-lg bg-white p-4 shadow-soft ring-1 ring-brand-100">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-950">{item.display_name}</h2>
          <p className="mt-1 text-sm text-slate-500">
            计划时间 {formatTime(item.reminder_time)}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-semibold ring-1 ${statusMeta.className}`}
        >
          {statusMeta.label}
        </span>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        可打卡时间 {formatClockFromDate(startsAt)} - {formatClockFromDate(endsAt)}
      </p>

      {isDone && item.checkin ? (
        <div className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm leading-6 text-emerald-800 ring-1 ring-emerald-100">
          <p className="font-semibold">
            {isMakeup ? "补打卡" : "正常打卡"}
          </p>
          <p>
            实际喝药{" "}
            {formatDateTime(item.checkin.actual_taken_at ?? item.checkin.checked_at)}
          </p>
          {item.checkin.note ? <p>{item.checkin.note}</p> : null}
        </div>
      ) : null}

      {!item.checkin && canCheckin ? (
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => onCheckin(item.id)}
          className="mt-5 h-12 w-full rounded-lg bg-brand-600 px-4 text-base font-bold text-white shadow-sm active:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
        >
          {isSubmitting ? "正在记录..." : "我已喝药"}
        </button>
      ) : null}

      {isTooEarly ? (
        <button
          type="button"
          disabled
          className="mt-5 h-12 w-full cursor-not-allowed rounded-lg bg-slate-200 px-4 text-base font-bold text-slate-500"
        >
          还没到打卡时间
        </button>
      ) : null}

      {isTooLate ? (
        <div className="mt-5 space-y-3">
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm leading-6 text-red-800 ring-1 ring-red-100">
            已超时未打卡，可以补打卡。
          </p>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              实际喝药时间
            </span>
            <input
              type="datetime-local"
              value={makeupTime}
              onChange={(event) => setMakeupTime(event.target.value)}
              className="mt-2 h-12 w-full rounded-lg border border-brand-100 bg-brand-50 px-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">备注</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="mt-2 min-h-24 w-full resize-none rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              placeholder="例如：忘记点击，实际已经喝了。"
            />
          </label>
          <button
            type="button"
            disabled={isSubmitting || !makeupTime}
            onClick={() =>
              onMakeupCheckin(item.id, dateTimeLocalToIso(makeupTime), trimmedNote)
            }
            className="h-12 w-full rounded-lg bg-red-600 px-4 text-base font-bold text-white shadow-sm active:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
          >
            {isSubmitting ? "正在补打卡..." : "补打卡"}
          </button>
        </div>
      ) : null}
    </article>
  );
}

function getStatusMeta(status: string, canCheckin: boolean) {
  if (status === "checked") {
    return {
      label: "已打卡",
      className: "bg-emerald-50 text-emerald-700 ring-emerald-200"
    };
  }

  if (status === "makeup") {
    return {
      label: "补打卡",
      className: "bg-emerald-50 text-emerald-700 ring-emerald-200"
    };
  }

  if (status === "missed") {
    return {
      label: "已超时未打卡",
      className: "bg-red-50 text-red-700 ring-red-200"
    };
  }

  return {
    label: canCheckin ? "可打卡" : "未到时间",
    className: "bg-amber-50 text-amber-700 ring-amber-200"
  };
}
