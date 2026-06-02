import { demoAdminProfile, getDemoFeedbacks } from "@/lib/demoData";
import type { FeedbackReply, UserRole } from "@/lib/types";

const DEMO_FEEDBACK_REPLIES_KEY = "daka_demo_feedback_replies";

export function getDemoFeedbackReplies(feedbackIds?: string[]) {
  const raw = localStorage.getItem(DEMO_FEEDBACK_REPLIES_KEY);

  if (!raw) {
    return [];
  }

  try {
    const replies = (JSON.parse(raw) as FeedbackReply[]).map((reply) => ({
      ...reply,
      parent_reply_id: reply.parent_reply_id ?? null
    }));

    if (!feedbackIds) {
      return replies;
    }

    const idSet = new Set(feedbackIds);
    return replies.filter((reply) => idSet.has(reply.feedback_id));
  } catch {
    return [];
  }
}

export function createDemoFeedbackReply(
  feedbackId: string,
  senderId: string,
  senderRole: UserRole,
  content: string,
  parentReplyId: string | null = null
) {
  const trimmedContent = content.trim();

  if (!trimmedContent) {
    return { data: null, error: "回复内容不能为空。" };
  }

  const feedback = getDemoFeedbacks().find((item) => item.id === feedbackId);

  if (!feedback) {
    return { data: null, error: "没有找到这条反馈。" };
  }

  const senderBelongsToFeedback =
    (senderRole === "patient" && senderId === feedback.patient_id) ||
    (senderRole === "admin" &&
      (senderId === feedback.admin_id || senderId === demoAdminProfile.id));

  if (!senderBelongsToFeedback) {
    return { data: null, error: "当前账号不能回复这条反馈。" };
  }

  const now = new Date().toISOString();
  const next: FeedbackReply = {
    id: `demo-feedback-reply-${Date.now()}`,
    feedback_id: feedbackId,
    parent_reply_id: parentReplyId,
    sender_id: senderId,
    sender_role: senderRole,
    content: trimmedContent,
    created_at: now
  };

  localStorage.setItem(
    DEMO_FEEDBACK_REPLIES_KEY,
    JSON.stringify([...getDemoFeedbackReplies(), next])
  );

  return { data: next, error: null };
}
