"use client";

import { useEffect, useState } from "react";
import type { MedicineSchedule } from "@/lib/types";

type MedicinePlanEditorProps = {
  schedules: MedicineSchedule[];
  isSaving: boolean;
  onSave: (plans: Record<string, string>) => Promise<void>;
};

export function MedicinePlanEditor({
  schedules,
  isSaving,
  onSave
}: MedicinePlanEditorProps) {
  const [plans, setPlans] = useState(() =>
    schedules.reduce<Record<string, string>>((result, schedule) => {
      result[schedule.id] = schedule.medicine_plan ?? "";
      return result;
    }, {})
  );
  const [localMessage, setLocalMessage] = useState("");

  useEffect(() => {
    setPlans(
      schedules.reduce<Record<string, string>>((result, schedule) => {
        result[schedule.id] = schedule.medicine_plan ?? "";
        return result;
      }, {})
    );
  }, [schedules]);

  async function handleSave() {
    setLocalMessage("");
    await onSave(plans);
    setLocalMessage("喝药安排已保存。");
  }

  return (
    <section className="rounded-lg bg-white p-4 shadow-soft ring-1 ring-brand-100">
      <p className="text-sm font-semibold text-brand-700">喝药安排</p>
      <h2 className="mt-1 text-xl font-bold text-slate-950">早中晚要喝什么</h2>

      <div className="mt-4 space-y-3">
        {schedules.map((schedule) => (
          <label key={schedule.id} className="block">
            <span className="text-sm font-bold text-slate-700">
              {schedule.display_name}
            </span>
            <textarea
              value={plans[schedule.id] ?? ""}
              onChange={(event) =>
                setPlans((current) => ({
                  ...current,
                  [schedule.id]: event.target.value
                }))
              }
              rows={2}
              maxLength={160}
              placeholder="例如：饭后喝药，一次一粒。"
              className="mt-2 w-full resize-none rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-sm leading-6 text-slate-900 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
          </label>
        ))}
      </div>

      <button
        type="button"
        disabled={isSaving || schedules.length === 0}
        onClick={handleSave}
        className="mt-4 h-11 w-full rounded-lg bg-brand-600 px-4 text-sm font-bold text-white shadow-sm active:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {isSaving ? "保存中..." : "保存喝药安排"}
      </button>

      {localMessage ? (
        <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm font-bold text-brand-700 ring-1 ring-brand-100">
          {localMessage}
        </p>
      ) : null}
    </section>
  );
}
