"use client";

import { useState } from "react";
import {
  formatClockFromDate,
  formatDateTime,
  formatTime,
  getCheckinWindowStatus,
  getScheduleWindow
} from "@/lib/date";
import type { ScheduleWithCheckin } from "@/lib/types";

type CheckinCardProps = {
  item: ScheduleWithCheckin;
  checkinDate: string;
  isSubmitting: boolean;
  onCheckin: (scheduleId: string) => void;
  onSubmitMissedReason: (scheduleId: string, reason: string) => void;
};

export function CheckinCard({
  item,
  checkinDate,
  isSubmitting,
  onCheckin,
  onSubmitMissedReason
}: CheckinCardProps) {
  const [reason, setReason] = useState("");
  const isDone = item.checkin?.status === "checked";
  const isMissed = item.checkin?.status === "missed";
  const windowStatus = getCheckinWindowStatus(checkinDate, item.reminder_time);
  const { startsAt, endsAt } = getScheduleWindow(checkinDate, item.reminder_time);
  const canCheckin = !item.checkin && windowStatus === "open";
  const isTooEarly = !item.checkin && windowStatus === "too_early";
  const isTooLate = !item.checkin && windowStatus === "too_late";
  const trimmedReason = reason.trim();

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
          className={
            isDone
              ? "rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200"
              : isMissed
                ? "rounded-full bg-red-50 px-3 py-1 text-sm font-semibold text-red-700 ring-1 ring-red-200"
                : "rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700 ring-1 ring-amber-200"
          }
        >
          {isDone ? "已打卡" : isMissed ? "已记录原因" : "未打卡"}
        </span>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        可打卡时间 {formatClockFromDate(startsAt)} - {formatClockFromDate(endsAt)}
      </p>

      {isDone && item.checkin ? (
        <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
          实际打卡 {formatDateTime(item.checkin.checked_at)}
        </p>
      ) : null}

      {isMissed && item.checkin ? (
        <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm leading-6 text-red-800 ring-1 ring-red-100">
          <p className="font-semibold">超时未打卡</p>
          <p>{item.checkin.note}</p>
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
            已超过打卡时间，请填写原因。
          </p>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">原因</span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-2 min-h-24 w-full resize-none rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              placeholder="例如：外出忘记带药、睡过了、身体不舒服..."
            />
          </label>
          <button
            type="button"
            disabled={isSubmitting || !trimmedReason}
            onClick={() => onSubmitMissedReason(item.id, trimmedReason)}
            className="h-12 w-full rounded-lg bg-red-600 px-4 text-base font-bold text-white shadow-sm active:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
          >
            {isSubmitting ? "正在提交..." : "提交原因"}
          </button>
        </div>
      ) : null}
    </article>
  );
}
