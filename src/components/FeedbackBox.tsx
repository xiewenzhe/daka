"use client";

import { useState } from "react";
import type { FormEvent } from "react";

type FeedbackBoxProps = {
  isSubmitting: boolean;
  onSubmit: (content: string) => Promise<boolean>;
};

export function FeedbackBox({ isSubmitting, onSubmit }: FeedbackBoxProps) {
  const [content, setContent] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const ok = await onSubmit(content);

    if (ok) {
      setContent("");
    }
  }

  return (
    <section className="rounded-lg bg-white p-4 shadow-soft ring-1 ring-brand-100">
      <div>
        <p className="text-sm font-semibold text-brand-700">给管理员留言</p>
        <h2 className="mt-1 text-xl font-bold text-slate-950">反馈建议</h2>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          required
          rows={4}
          maxLength={300}
          placeholder="可以写提醒时间、页面使用感受，或者想加的小功能。"
          className="w-full resize-none rounded-lg border border-brand-100 bg-brand-50 px-3 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500">{content.length}/300</span>
          <button
            type="submit"
            disabled={isSubmitting || !content.trim()}
            className="h-11 rounded-lg bg-brand-600 px-5 text-sm font-bold text-white shadow-sm transition active:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSubmitting ? "提交中..." : "提交建议"}
          </button>
        </div>
      </form>
    </section>
  );
}
