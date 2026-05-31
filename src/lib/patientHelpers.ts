import { supabase } from "@/lib/supabaseClient";
import type { MedicineSchedule } from "@/lib/types";

const scheduleOrder = ["morning", "noon", "evening"];

export function sortSchedules(schedules: MedicineSchedule[]) {
  return [...schedules].sort((a, b) => {
    const aIndex = scheduleOrder.indexOf(a.label);
    const bIndex = scheduleOrder.indexOf(b.label);

    if (aIndex === -1 || bIndex === -1) {
      return a.reminder_time.localeCompare(b.reminder_time);
    }

    return aIndex - bIndex;
  });
}

export async function uploadCheckinPhoto(photoFile?: File | null) {
  if (!photoFile) {
    return null;
  }

  const extension = photoFile.name.split(".").pop() ?? "jpg";
  const path = `${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from("checkin-photos")
    .upload(path, photoFile, {
      cacheControl: "3600",
      upsert: false
    });

  if (error) {
    return null;
  }

  const { data } = supabase.storage.from("checkin-photos").getPublicUrl(path);
  return data.publicUrl;
}

export function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
