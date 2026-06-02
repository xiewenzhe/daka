"use client";

import { useEffect, useMemo, useState } from "react";
import {
  encouragementTypeLabels,
  encouragementTypes,
  getEncouragementDisplayType,
  normalizeEncouragementList
} from "@/lib/encouragement";
import type { EncouragementMessage, EncouragementType } from "@/lib/types";

type EncouragementManagerProps = {
  messages: EncouragementMessage[];
  isSaving: boolean;
  onCreate: (type: EncouragementType, content: string) => Promise<boolean>;
  onUpdate: (
    id: string,
    updates: Pick<EncouragementMessage, "content">
  ) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
};

export function EncouragementManager({
  messages,
  isSaving,
  onCreate,
  onUpdate,
  onDelete
}: EncouragementManagerProps) {
  const [selectedType, setSelectedType] =
    useState<EncouragementType>("normal");
  const [newContent, setNewContent] = useState("");
  const normalizedMessages = useMemo(
    () => normalizeEncouragementList(messages),
    [messages]
  );
  const visibleMessages = useMemo(
    () =>
      normalizedMessages
        .filter((message) => getEncouragementDisplayType(message) === selectedType)
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [normalizedMessages, selectedType]
  );

  async function handleCreate() {
    const trimmedContent = newContent.trim();

    if (!trimmedContent) {
      return;
    }

    const isSuccess = await onCreate(selectedType, trimmedContent);

    if (isSuccess) {
      setNewContent("");
    }
  }

  return (
    <section className="rounded-lg bg-white p-4 shadow-soft ring-1 ring-brand-100">
      <p className="text-sm font-semibold text-brand-700">鼓励语管理</p>
      <h2 className="mt-1 text-lg font-bold text-slate-950">打卡提示</h2>

      <div className="mt-4 space-y-3 rounded-lg bg-brand-50 p-3 ring-1 ring-brand-100">
        <label className="block">
          <span className="text-xs font-bold text-slate-600">鼓励语类型</span>
          <select
            value={selectedType}
            onChange={(event) =>
              setSelectedType(event.target.value as EncouragementType)
            }
            className="mt-1 h-11 w-full rounded-lg border border-brand-100 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
          >
            {encouragementTypes.map((type) => (
              <option key={type} value={type}>
                {encouragementTypeLabels[type]}（
                {
                  normalizedMessages.filter(
                    (message) => getEncouragementDisplayType(message) === type
                  ).length
                }）
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-bold text-slate-600">鼓励语内容</span>
          <textarea
            value={newContent}
            onChange={(event) => setNewContent(event.target.value)}
            rows={2}
            maxLength={160}
            placeholder={`新增${encouragementTypeLabels[selectedType]}鼓励语`}
            className="mt-1 w-full resize-none rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
          />
        </label>

        <button
          type="button"
          disabled={isSaving || !newContent.trim()}
          onClick={handleCreate}
          className="h-11 w-full rounded-lg bg-brand-600 px-4 text-sm font-bold text-white active:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          新增鼓励语
        </button>
      </div>

      <div className="mt-4 space-y-2">
        <h3 className="text-sm font-bold text-slate-900">
          {encouragementTypeLabels[selectedType]}鼓励语
        </h3>
        {visibleMessages.length === 0 ? (
          <p className="rounded-lg bg-brand-50 px-3 py-3 text-sm text-slate-600 ring-1 ring-brand-100">
            这一类还没有鼓励语。
          </p>
        ) : (
          visibleMessages.map((message) => (
            <EncouragementRow
              key={message.id}
              message={message}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </section>
  );
}

function EncouragementRow({
  message,
  onUpdate,
  onDelete
}: {
  message: EncouragementMessage;
  onUpdate: EncouragementManagerProps["onUpdate"];
  onDelete: EncouragementManagerProps["onDelete"];
}) {
  const [content, setContent] = useState(message.content);
  const [isEditing, setIsEditing] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    setContent(message.content);
    setIsEditing(false);
  }, [message.content, message.id]);

  async function handleSave() {
    const trimmedContent = content.trim();

    if (!trimmedContent) {
      return;
    }

    setIsBusy(true);
    const isSuccess = await onUpdate(message.id, { content: trimmedContent });
    setIsBusy(false);

    if (isSuccess) {
      setIsEditing(false);
    }
  }

  async function handleDelete() {
    setIsBusy(true);
    await onDelete(message.id);
    setIsBusy(false);
  }

  return (
    <article className="rounded-lg bg-brand-50 p-3 ring-1 ring-brand-100">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={2}
              maxLength={160}
              className="w-full resize-none rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
          ) : (
            <p className="break-words text-sm font-semibold leading-6 text-slate-800">
              {message.content}
            </p>
          )}
        </div>

        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            title={isEditing ? "保存" : "编辑"}
            disabled={isBusy || (isEditing && !content.trim())}
            onClick={isEditing ? handleSave : () => setIsEditing(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-sm font-black text-brand-700 ring-1 ring-brand-100 active:bg-brand-50 disabled:text-slate-300"
          >
            {isEditing ? "✓" : "✎"}
          </button>
          <button
            type="button"
            title="删除"
            disabled={isBusy}
            onClick={handleDelete}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-sm font-black text-red-700 ring-1 ring-red-100 active:bg-red-100 disabled:text-slate-300"
          >
            ×
          </button>
        </div>
      </div>
    </article>
  );
}
