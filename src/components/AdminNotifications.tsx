"use client";

import { formatDateTime } from "@/lib/date";
import type { AdminNotification } from "@/lib/types";

type AdminNotificationsProps = {
  notifications: AdminNotification[];
};

export function AdminNotifications({ notifications }: AdminNotificationsProps) {
  return (
    <section className="rounded-lg bg-white p-4 shadow-soft ring-1 ring-brand-100">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-slate-950">站内通知</h2>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-bold text-brand-700 ring-1 ring-brand-100">
          {notifications.length}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        {notifications.length === 0 ? (
          <p className="rounded-lg bg-brand-50 px-3 py-3 text-sm text-slate-600 ring-1 ring-brand-100">
            暂时没有新的打卡通知。
          </p>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className="rounded-lg bg-brand-50 px-3 py-3 ring-1 ring-brand-100"
            >
              <p className="text-sm font-semibold text-slate-900">
                {notification.message}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {formatDateTime(notification.created_at)}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
