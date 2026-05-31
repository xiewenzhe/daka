"use client";

import { formatDateTime } from "@/lib/date";
import type { Feedback } from "@/lib/types";

type AdminFeedbacksProps = {
  feedbacks: Feedback[];
  patientName: string;
};

export function AdminFeedbacks({ feedbacks, patientName }: AdminFeedbacksProps) {
  return (
    <section className="rounded-lg bg-white p-4 shadow-soft ring-1 ring-brand-100">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-brand-700">朋友反馈</p>
          <h2 className="mt-1 text-lg font-bold text-slate-950">建议箱</h2>
        </div>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-bold text-brand-700 ring-1 ring-brand-100">
          {feedbacks.length}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        {feedbacks.length === 0 ? (
          <p className="rounded-lg bg-brand-50 px-3 py-3 text-sm text-slate-600 ring-1 ring-brand-100">
            暂时还没有收到建议。
          </p>
        ) : (
          feedbacks.map((feedback) => (
            <article
              key={feedback.id}
              className="rounded-lg bg-brand-50 px-3 py-3 ring-1 ring-brand-100"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-slate-900">{patientName}</p>
                <p className="shrink-0 text-xs text-slate-500">
                  {formatDateTime(feedback.created_at)}
                </p>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {feedback.content}
              </p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
