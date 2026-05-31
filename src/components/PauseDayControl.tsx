"use client";

import { useState } from "react";
import type { PauseDay } from "@/lib/types";

type PauseDayControlProps = {
  pauseDay: PauseDay | null;
  isSaving: boolean;
  onSave: (reason: string) => Promise<void>;
  onCancel: () => Promise<void>;
};

export function PauseDayControl({
  pauseDay,
  isSaving,
  onSave,
  onCancel
}: PauseDayControlProps) {
  const [reason, setReason] = useState(pauseDay?.reason ?? "");

  return (
    <section className="rounded-lg bg-white p-4 shadow-soft ring-1 ring-brand-100">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-brand-700">暂停模式</p>
          <h2 className="mt-1 text-xl font-bold text-slate-950">
            今天暂时不打卡
          </h2>
        </div>
        {pauseDay ? (
          <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-bold text-amber-700 ring-1 ring-amber-200">
            已暂停
          </span>
        ) : null}
      </div>

      <textarea
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        rows={2}
        maxLength={120}
        placeholder="可选：今天为什么暂停，比如医生调整、外出等。"
        className="mt-4 w-full resize-none rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-sm leading-6 text-slate-900 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
      />

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={isSaving}
          onClick={() => onSave(reason)}
          className="h-11 rounded-lg bg-brand-600 px-3 text-sm font-bold text-white active:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {pauseDay ? "更新暂停" : "今天暂停"}
        </button>
        <button
          type="button"
          disabled={isSaving || !pauseDay}
          onClick={onCancel}
          className="h-11 rounded-lg bg-white px-3 text-sm font-bold text-slate-700 ring-1 ring-brand-100 active:bg-brand-50 disabled:cursor-not-allowed disabled:text-slate-300"
        >
          取消暂停
        </button>
      </div>
    </section>
  );
}
