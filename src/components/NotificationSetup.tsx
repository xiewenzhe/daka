"use client";

import { useState } from "react";
import { urlBase64ToUint8Array } from "@/lib/push";
import { hasSupabaseConfig, supabase } from "@/lib/supabaseClient";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export function NotificationSetup() {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!hasSupabaseConfig || !vapidPublicKey) {
    return null;
  }

  async function handleEnableNotifications() {
    const publicKey = vapidPublicKey;

    if (!publicKey) {
      setMessage("提醒配置未完成。");
      return;
    }

    setIsLoading(true);
    setMessage("");

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setMessage("当前浏览器不支持提醒。");
      setIsLoading(false);
      return;
    }

    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      setMessage("未开启通知权限。");
      setIsLoading(false);
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    const existingSubscription =
      await registration.pushManager.getSubscription();
    const subscription =
      existingSubscription ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      }));

    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (!session) {
      setMessage("请先登录后再开启提醒。");
      setIsLoading(false);
      return;
    }

    const response = await fetch("/api/notifications/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ subscription })
    });

    setIsLoading(false);
    setMessage(response.ok ? "提醒已开启。" : "开启提醒失败，请稍后再试。");
  }

  return (
    <section className="mt-5 rounded-lg bg-white p-4 shadow-soft ring-1 ring-brand-100">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-950">喝药提醒</h2>
          <p className="mt-1 text-sm text-slate-500">到时间会在手机上提醒。</p>
        </div>
        <button
          type="button"
          onClick={handleEnableNotifications}
          disabled={isLoading}
          className="h-10 shrink-0 rounded-lg bg-brand-600 px-3 text-sm font-bold text-white active:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
        >
          {isLoading ? "开启中" : "开启"}
        </button>
      </div>
      {message ? (
        <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700 ring-1 ring-brand-100">
          {message}
        </p>
      ) : null}
    </section>
  );
}
