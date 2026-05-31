"use client";

import { useEffect, useState } from "react";

type DailyMoodSelectorProps = {
  selectedMood: string | null;
  onMoodChange: (mood: string | null) => void;
  isLoading?: boolean;
};

const moodOptions = ["开心 😊", "一般 🙂", "有点累 😴", "烦躁 😠"];

export function DailyMoodSelector({
  selectedMood,
  onMoodChange,
  isLoading
}: DailyMoodSelectorProps) {
  const [isSaving, setIsSaving] = useState(false);

  const handleMoodSelect = async (mood: string) => {
    const newMood = selectedMood === mood ? null : mood;
    setIsSaving(true);
    onMoodChange(newMood);
    setIsSaving(false);
  };

  return (
    <div className="rounded-lg bg-white p-4 shadow-soft ring-1 ring-brand-100">
      <p className="text-sm font-semibold text-slate-700">今天的心情</p>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {moodOptions.map((mood) => (
          <button
            key={mood}
            type="button"
            disabled={isLoading || isSaving}
            onClick={() => handleMoodSelect(mood)}
            className={`h-10 shrink-0 rounded-full px-4 text-sm font-bold ring-1 transition-all ${
              selectedMood === mood
                ? "bg-brand-600 text-white ring-brand-600"
                : "bg-brand-50 text-slate-700 ring-brand-100 hover:bg-brand-100"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {mood}
          </button>
        ))}
      </div>
    </div>
  );
}
