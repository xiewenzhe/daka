"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FeedbackBox } from "@/components/FeedbackBox";
import { PatientHeader } from "@/components/PatientHeader";
import { PatientNav } from "@/components/PatientNav";
import { getCurrentProfile } from "@/lib/auth";
import { createDemoFeedback } from "@/lib/demoData";
import { hasSupabaseConfig, supabase } from "@/lib/supabaseClient";

export default function PatientFeedbackPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
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

    const { error } = await supabase.from("feedbacks").insert(
      links.map((link) => ({
        patient_id: userId,
        admin_id: link.admin_id,
        content: trimmedContent
      }))
    );
    setIsSubmittingFeedback(false);

    if (error) {
      setMessage(error.message);
      return false;
    }

    setMessage("建议已提交给管理员。");
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

        {message ? (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-800 ring-1 ring-amber-200">
            {message}
          </p>
        ) : null}
      </div>
    </main>
  );
}
