"use client";

import { useEffect, useState } from "react";

type DailyMoodSelectorProps = {
  selectedMood: string | null;
  selectedNote?: string | null;
  onMoodSave: (mood: string, note: string) => Promise<boolean>;
  isLoading?: boolean;
};

const moodOptions = [
  "超乖 🥰",
  "开心 😊",
  "正常 🙂",
  "有点累 😴",
  "烦躁 😠",
  "哭哭 😭"
];

export function DailyMoodSelector({
  selectedMood,
  selectedNote,
  onMoodSave,
  isLoading
}: DailyMoodSelectorProps) {
  const [draftMood, setDraftMood] = useState(selectedMood ?? "");
  const [draftNote, setDraftNote] = useState(selectedNote ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setDraftMood(selectedMood ?? "");
  }, [selectedMood]);

  useEffect(() => {
    setDraftNote(selectedNote ?? "");
  }, [selectedNote]);

  const handleMoodSave = async () => {
    if (!draftMood) {
      setMessage("请先选择一个心情。");
      return;
    }

    setIsSaving(true);
    setMessage("");
    const isSuccess = await onMoodSave(draftMood, draftNote);
    setIsSaving(false);

    if (isSuccess) {
      setMessage("今日心情已保存。");
    }
  };

  return (
    <div className="rounded-lg bg-white p-4 shadow-soft ring-1 ring-brand-100">
      <p className="text-sm font-semibold text-brand-700">今天的心情</p>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {moodOptions.map((mood) => (
          <button
            key={mood}
            type="button"
            disabled={isLoading || isSaving}
            onClick={() => setDraftMood(mood)}
            className={`h-10 shrink-0 rounded-full px-4 text-sm font-bold ring-1 transition-all ${
              draftMood === mood
                ? "bg-brand-600 text-white ring-brand-600"
                : "bg-brand-50 text-slate-700 ring-brand-100 hover:bg-brand-100"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {mood}
          </button>
        ))}
      </div>
      <label className="mt-3 block">
        <span className="text-xs font-bold text-slate-600">随心记</span>
        <textarea
          value={draftNote}
          onChange={(event) => setDraftNote(event.target.value)}
          rows={3}
          maxLength={300}
          placeholder="可以记一点今天的小事、心情变化，或者想说的话。"
          className="mt-1 w-full resize-none rounded-lg border border-brand-100 bg-brand-50 px-3 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
        />
        <span className="mt-1 block text-right text-xs text-slate-400">
          {draftNote.length}/300
        </span>
      </label>
      <button
        type="button"
        disabled={isLoading || isSaving || !draftMood}
        onClick={handleMoodSave}
        className="mt-3 h-11 w-full rounded-lg bg-brand-600 px-4 text-sm font-bold text-white shadow-sm active:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {isSaving ? "保存中..." : selectedMood ? "更新今日心情" : "保存今日心情"}
      </button>
      {message ? (
        <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm font-bold text-brand-700 ring-1 ring-brand-100">
          {message}
        </p>
      ) : null}
    </div>
  );
}
