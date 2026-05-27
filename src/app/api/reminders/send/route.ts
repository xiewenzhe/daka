import { NextResponse } from "next/server";
import webPush, { PushSubscription } from "web-push";
import { createSupabaseAdminClient } from "@/lib/supabaseServer";
import type { Checkin, MedicineSchedule } from "@/lib/types";

type NotificationToken = {
  id: string;
  user_id: string;
  token: string;
};

const reminderToleranceMinutes = 5;

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const receivedSecret =
    request.headers.get("x-cron-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!cronSecret || receivedSecret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

  if (!vapidPublicKey || !vapidPrivateKey) {
    return NextResponse.json(
      { error: "Missing VAPID keys" },
      { status: 500 }
    );
  }

  webPush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:admin@example.com",
    vapidPublicKey,
    vapidPrivateKey
  );

  const supabase = createSupabaseAdminClient();
  const nowParts = getShanghaiNowParts();
  const today = nowParts.date;

  const { data: schedules, error: schedulesError } = await supabase
    .from("medicine_schedules")
    .select("*")
    .eq("enabled", true)
    .returns<MedicineSchedule[]>();

  if (schedulesError) {
    return NextResponse.json({ error: schedulesError.message }, { status: 500 });
  }

  const dueSchedules = (schedules ?? []).filter((schedule) =>
    isReminderDue(schedule.reminder_time, nowParts.minutesOfDay)
  );

  if (dueSchedules.length === 0) {
    return NextResponse.json({ sent: 0, due: 0 });
  }

  const patientIds = Array.from(
    new Set(dueSchedules.map((schedule) => schedule.user_id))
  );
  const scheduleIds = dueSchedules.map((schedule) => schedule.id);

  const [{ data: checkins }, { data: tokens }] = await Promise.all([
    supabase
      .from("checkins")
      .select("*")
      .eq("checkin_date", today)
      .in("schedule_id", scheduleIds)
      .returns<Checkin[]>(),
    supabase
      .from("notification_tokens")
      .select("id,user_id,token")
      .eq("platform", "web-push")
      .in("user_id", patientIds)
      .returns<NotificationToken[]>()
  ]);

  const checkedScheduleIds = new Set(
    (checkins ?? [])
      .filter((checkin) => checkin.status === "checked")
      .map((checkin) => checkin.schedule_id)
  );
  const tokensByUser = new Map<string, NotificationToken[]>();

  (tokens ?? []).forEach((token) => {
    tokensByUser.set(token.user_id, [
      ...(tokensByUser.get(token.user_id) ?? []),
      token
    ]);
  });

  let sent = 0;

  for (const schedule of dueSchedules) {
    if (checkedScheduleIds.has(schedule.id)) {
      continue;
    }

    const userTokens = tokensByUser.get(schedule.user_id) ?? [];
    const payload = JSON.stringify({
      title: "嘉嘉，该喝药啦",
      body: `${schedule.display_name} ${schedule.reminder_time.slice(0, 5)} 的喝药时间到了。`,
      url: "/app"
    });

    for (const token of userTokens) {
      try {
        await webPush.sendNotification(
          JSON.parse(token.token) as PushSubscription,
          payload
        );
        sent += 1;
      } catch (error) {
        const statusCode =
          typeof error === "object" &&
          error !== null &&
          "statusCode" in error
            ? Number(error.statusCode)
            : 0;

        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("notification_tokens").delete().eq("id", token.id);
        }
      }
    }
  }

  return NextResponse.json({ sent, due: dueSchedules.length });
}

function isReminderDue(reminderTime: string, currentMinutesOfDay: number) {
  const [hour = "0", minute = "0"] = reminderTime.split(":");
  const reminderMinutes = Number(hour) * 60 + Number(minute);
  const diff = currentMinutesOfDay - reminderMinutes;

  return diff >= 0 && diff < reminderToleranceMinutes;
}

function getShanghaiNowParts() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date()).map((part) => [part.type, part.value])
  );

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutesOfDay: Number(parts.hour) * 60 + Number(parts.minute)
  };
}
