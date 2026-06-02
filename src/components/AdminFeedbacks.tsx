"use client";

import { useState } from "react";
import { formatDateTime } from "@/lib/date";
import type { Feedback, FeedbackReply } from "@/lib/types";

type AdminFeedbacksProps = {
  feedbacks: Feedback[];
  replies: FeedbackReply[];
  patientName: string;
  onReply: (
    feedbackId: string,
    content: string,
    parentReplyId?: string | null
  ) => Promise<boolean>;
};

type ReplyTarget =
  | { kind: "feedback"; id: string }
  | { kind: "reply"; id: string };

export function AdminFeedbacks({
  feedbacks,
  replies,
  patientName,
  onReply
}: AdminFeedbacksProps) {
  return (
    <section className="rounded-lg bg-white p-4 shadow-soft ring-1 ring-brand-100">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-brand-700">朋友反馈</p>
          <h2 className="mt-1 text-lg font-bold text-slate-950">建议对话</h2>
        </div>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-bold text-brand-700 ring-1 ring-brand-100">
          {feedbacks.length}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {feedbacks.length === 0 ? (
          <p className="rounded-lg bg-brand-50 px-3 py-3 text-sm text-slate-600 ring-1 ring-brand-100">
            暂时还没有收到建议。
          </p>
        ) : (
          feedbacks.map((feedback) => (
            <FeedbackThread
              key={feedback.id}
              feedback={feedback}
              patientName={patientName}
              replies={replies
                .filter((reply) => reply.feedback_id === feedback.id)
                .sort((a, b) => a.created_at.localeCompare(b.created_at))}
              onReply={onReply}
            />
          ))
        )}
      </div>
    </section>
  );
}

function FeedbackThread({
  feedback,
  patientName,
  replies,
  onReply
}: {
  feedback: Feedback;
  patientName: string;
  replies: FeedbackReply[];
  onReply: (
    feedbackId: string,
    content: string,
    parentReplyId?: string | null
  ) => Promise<boolean>;
}) {
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);

  return (
    <article className="rounded-lg bg-brand-50 px-3 py-3 ring-1 ring-brand-100">
      <div className="rounded-lg bg-white px-3 py-3 ring-1 ring-brand-100">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-slate-900">{patientName}</p>
          <p className="shrink-0 text-xs text-slate-500">
            {formatDateTime(feedback.created_at)}
          </p>
        </div>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
          {feedback.content}
        </p>
        <button
          type="button"
          onClick={() => setReplyTarget({ kind: "feedback", id: feedback.id })}
          className="mt-2 text-xs font-bold text-brand-700"
        >
          回复这条
        </button>
      </div>

      {replyTarget?.kind === "feedback" ? (
        <InlineReplyForm
          placeholder={`回复${patientName}的反馈...`}
          onCancel={() => setReplyTarget(null)}
          onSubmit={async (content) => {
            const ok = await onReply(feedback.id, content, null);
            if (ok) {
              setReplyTarget(null);
            }
            return ok;
          }}
        />
      ) : null}

      {replies.length > 0 ? (
        <div className="mt-3 space-y-2">
          {replies.map((reply) => {
            const isAdmin = reply.sender_role === "admin";
            const canReply = !isAdmin;

            return (
              <div key={reply.id}>
                <div
                  className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[88%] rounded-lg px-3 py-2 ring-1 ${
                      isAdmin
                        ? "bg-brand-600 text-white ring-brand-600"
                        : "bg-white text-slate-800 ring-brand-100"
                    }`}
                  >
                    <p
                      className={`text-xs font-semibold ${
                        isAdmin ? "text-brand-50" : "text-brand-700"
                      }`}
                    >
                      {isAdmin ? "管理员" : patientName}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6">
                      {reply.content}
                    </p>
                    <div className="mt-1 flex items-center justify-between gap-3">
                      {canReply ? (
                        <button
                          type="button"
                          onClick={() =>
                            setReplyTarget({ kind: "reply", id: reply.id })
                          }
                          className="text-xs font-bold text-brand-700"
                        >
                          回复这条
                        </button>
                      ) : (
                        <span />
                      )}
                      <p
                        className={`text-right text-[11px] ${
                          isAdmin ? "text-brand-50" : "text-slate-500"
                        }`}
                      >
                        {formatDateTime(reply.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
                {replyTarget?.kind === "reply" && replyTarget.id === reply.id ? (
                  <InlineReplyForm
                    placeholder={`回复${patientName}这条消息...`}
                    onCancel={() => setReplyTarget(null)}
                    onSubmit={async (content) => {
                      const ok = await onReply(feedback.id, content, reply.id);
                      if (ok) {
                        setReplyTarget(null);
                      }
                      return ok;
                    }}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </article>
  );
}

function InlineReplyForm({
  placeholder,
  onCancel,
  onSubmit
}: {
  placeholder: string;
  onCancel: () => void;
  onSubmit: (content: string) => Promise<boolean>;
}) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    const trimmedContent = content.trim();

    if (!trimmedContent) {
      setError("回复内容不能为空。");
      return;
    }

    setIsSubmitting(true);
    setError("");
    const ok = await onSubmit(trimmedContent);
    setIsSubmitting(false);

    if (ok) {
      setContent("");
    }
  }

  return (
    <div className="mt-2 rounded-lg bg-white p-3 ring-1 ring-brand-100">
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        rows={3}
        placeholder={placeholder}
        className="w-full resize-none rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-10 rounded-lg bg-white text-sm font-bold text-slate-600 ring-1 ring-slate-200"
        >
          取消
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || !content.trim()}
          className="h-10 rounded-lg bg-brand-600 px-4 text-sm font-bold text-white shadow-soft disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isSubmitting ? "回复中..." : "发送回复"}
        </button>
      </div>
    </div>
  );
}
