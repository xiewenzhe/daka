"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FeedbackBox } from "@/components/FeedbackBox";
import { PatientHeader } from "@/components/PatientHeader";
import { PatientNav } from "@/components/PatientNav";
import { getCurrentProfile } from "@/lib/auth";
import { formatDateTime } from "@/lib/date";
import {
  createDemoFeedback,
  getDemoFeedbacks
} from "@/lib/demoData";
import {
  createDemoFeedbackReply,
  getDemoFeedbackReplies
} from "@/lib/demoFeedbackReplies";
import { hasSupabaseConfig, supabase } from "@/lib/supabaseClient";
import type { Feedback, FeedbackReply } from "@/lib/types";

export default function PatientFeedbackPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [feedbackReplies, setFeedbackReplies] = useState<FeedbackReply[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadFeedbackPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadFeedbackPage() {
    const { user, profile } = await getCurrentProfile();

    if (!user || !profile) {
      router.replace("/login");
      return;
    }

    if (profile.role !== "patient") {
      router.replace("/admin");
      return;
    }

    setUserId(user.id);

    if (!hasSupabaseConfig) {
      const demoFeedbacks = getDemoFeedbacks()
        .filter((feedback) => feedback.patient_id === user.id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
      setFeedbacks(demoFeedbacks);
      setFeedbackReplies(
        getDemoFeedbackReplies(demoFeedbacks.map((feedback) => feedback.id))
      );
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("feedbacks")
      .select("*")
      .eq("patient_id", user.id)
      .order("created_at", { ascending: false })
      .returns<Feedback[]>();

    if (error) {
      setMessage(error.message);
      setIsLoading(false);
      return;
    }

    const loadedFeedbacks = data ?? [];
    setFeedbacks(loadedFeedbacks);

    if (loadedFeedbacks.length > 0) {
      const { data: repliesData, error: repliesError } = await supabase
        .from("feedback_replies")
        .select("*")
        .in(
          "feedback_id",
          loadedFeedbacks.map((feedback) => feedback.id)
        )
        .order("created_at", { ascending: true })
        .returns<FeedbackReply[]>();

      if (repliesError) {
        setMessage(repliesError.message);
      } else {
        setFeedbackReplies(repliesData ?? []);
      }
    } else {
      setFeedbackReplies([]);
    }

    setIsLoading(false);
  }

  async function handleSubmitFeedback(content: string) {
    if (!userId) {
      return false;
    }

    const trimmedContent = content.trim();

    if (!trimmedContent) {
      setMessage("建议内容不能为空。");
      return false;
    }

    setIsSubmittingFeedback(true);
    setMessage("");

    if (!hasSupabaseConfig) {
      const { error } = createDemoFeedback(userId, trimmedContent);
      setIsSubmittingFeedback(false);

      if (error) {
        setMessage(error);
        return false;
      }

      const demoFeedbacks = getDemoFeedbacks()
        .filter((feedback) => feedback.patient_id === userId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
      setFeedbacks(demoFeedbacks);
      setFeedbackReplies(
        getDemoFeedbackReplies(demoFeedbacks.map((feedback) => feedback.id))
      );
      setMessage("建议已提交给管理员。");
      return true;
    }

    const { data: links, error: linksError } = await supabase
      .from("care_links")
      .select("admin_id")
      .eq("patient_id", userId)
      .returns<Array<{ admin_id: string }>>();

    if (linksError) {
      setIsSubmittingFeedback(false);
      setMessage(linksError.message);
      return false;
    }

    if (!links || links.length === 0) {
      setIsSubmittingFeedback(false);
      setMessage("还没有绑定管理员，暂时不能提交建议。");
      return false;
    }

    const { data, error } = await supabase
      .from("feedbacks")
      .insert(
        links.map((link) => ({
          patient_id: userId,
          admin_id: link.admin_id,
          content: trimmedContent
        }))
      )
      .select("*")
      .returns<Feedback[]>();
    setIsSubmittingFeedback(false);

    if (error) {
      setMessage(error.message);
      return false;
    }

    setFeedbacks((current) => [...(data ?? []), ...current]);
    setMessage("建议已提交给管理员。");
    return true;
  }

  async function handleReplyFeedback(
    feedbackId: string,
    content: string,
    parentReplyId: string
  ) {
    if (!userId) {
      return false;
    }

    const trimmedContent = content.trim();

    if (!trimmedContent) {
      setMessage("回复内容不能为空。");
      return false;
    }

    setMessage("");

    if (!hasSupabaseConfig) {
      const { data, error } = createDemoFeedbackReply(
        feedbackId,
        userId,
        "patient",
        trimmedContent,
        parentReplyId
      );

      if (error) {
        setMessage(error);
        return false;
      }

      if (data) {
        setFeedbackReplies((current) => [...current, data]);
      }

      setMessage("回复已发送。");
      return true;
    }

    const { data, error } = await supabase
      .from("feedback_replies")
      .insert({
        feedback_id: feedbackId,
        parent_reply_id: parentReplyId,
        sender_id: userId,
        sender_role: "patient",
        content: trimmedContent
      })
      .select("*")
      .single<FeedbackReply>();

    if (error) {
      setMessage(error.message);
      return false;
    }

    if (data) {
      setFeedbackReplies((current) => [...current, data]);
    }

    setMessage("回复已发送。");
    return true;
  }

  return (
    <main className="min-h-dvh bg-brand-50">
      <div className="mx-auto w-full max-w-md px-5 py-6">
        <PatientHeader title="反馈建议" />
        <PatientNav />

        <div className="mt-6">
          {isLoading ? (
            <div className="rounded-lg bg-white p-4 text-sm text-slate-600 shadow-soft ring-1 ring-brand-100">
              正在准备反馈箱...
            </div>
          ) : (
            <FeedbackBox
              isSubmitting={isSubmittingFeedback}
              onSubmit={handleSubmitFeedback}
            />
          )}
        </div>

        {!isLoading ? (
          <section className="mt-5 rounded-lg bg-white p-4 shadow-soft ring-1 ring-brand-100">
            <p className="text-sm font-semibold text-brand-700">历史反馈</p>
            <h2 className="mt-1 text-lg font-bold text-slate-950">之前的对话</h2>
            {feedbacks.length === 0 ? (
              <p className="mt-3 rounded-lg bg-brand-50 px-3 py-3 text-sm text-slate-600 ring-1 ring-brand-100">
                还没有提交过反馈。
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {feedbacks.map((feedback) => (
                  <PatientFeedbackThread
                    key={feedback.id}
                    feedback={feedback}
                    replies={feedbackReplies
                      .filter((reply) => reply.feedback_id === feedback.id)
                      .sort((a, b) => a.created_at.localeCompare(b.created_at))}
                    onReply={handleReplyFeedback}
                  />
                ))}
              </div>
            )}
          </section>
        ) : null}

        {message ? (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-800 ring-1 ring-amber-200">
            {message}
          </p>
        ) : null}
      </div>
    </main>
  );
}

function PatientFeedbackThread({
  feedback,
  replies,
  onReply
}: {
  feedback: Feedback;
  replies: FeedbackReply[];
  onReply: (
    feedbackId: string,
    content: string,
    parentReplyId: string
  ) => Promise<boolean>;
}) {
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);

  return (
    <article className="rounded-lg bg-brand-50 px-3 py-3 ring-1 ring-brand-100">
      <div className="rounded-lg bg-white px-3 py-3 ring-1 ring-brand-100">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-slate-900">我提交的反馈</p>
          <p className="shrink-0 text-xs text-slate-500">
            {formatDateTime(feedback.created_at)}
          </p>
        </div>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">
          {feedback.content}
        </p>
      </div>

      {replies.length > 0 ? (
        <div className="mt-3 space-y-2">
          {replies.map((reply) => {
            const isPatient = reply.sender_role === "patient";
            const canReply = !isPatient;

            return (
              <div key={reply.id}>
                <div
                  className={`flex ${
                    isPatient ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[88%] rounded-lg px-3 py-2 ring-1 ${
                      isPatient
                        ? "bg-brand-600 text-white ring-brand-600"
                        : "bg-white text-slate-800 ring-brand-100"
                    }`}
                  >
                    <p
                      className={`text-xs font-semibold ${
                        isPatient ? "text-brand-50" : "text-brand-700"
                      }`}
                    >
                      {isPatient ? "我" : "管理员"}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6">
                      {reply.content}
                    </p>
                    <div className="mt-1 flex items-center justify-between gap-3">
                      {canReply ? (
                        <button
                          type="button"
                          onClick={() => setReplyTargetId(reply.id)}
                          className="text-xs font-bold text-brand-700"
                        >
                          回复这条
                        </button>
                      ) : (
                        <span />
                      )}
                      <p
                        className={`text-right text-[11px] ${
                          isPatient ? "text-brand-50" : "text-slate-500"
                        }`}
                      >
                        {formatDateTime(reply.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
                {replyTargetId === reply.id ? (
                  <InlineReplyForm
                    placeholder="回复管理员这条消息..."
                    onCancel={() => setReplyTargetId(null)}
                    onSubmit={async (content) => {
                      const ok = await onReply(feedback.id, content, reply.id);
                      if (ok) {
                        setReplyTargetId(null);
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
          {isSubmitting ? "发送中..." : "发送回复"}
        </button>
      </div>
    </div>
  );
}
