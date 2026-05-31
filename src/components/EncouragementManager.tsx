"use client";

import { useState } from "react";
import {
  encouragementTypeLabels,
  encouragementTypes
} from "@/lib/encouragement";
import type { EncouragementMessage, EncouragementType } from "@/lib/types";

type EncouragementManagerProps = {
  messages: EncouragementMessage[];
  isSaving: boolean;
  onCreate: (type: EncouragementType, content: string) => Promise<void>;
  onUpdate: (
    id: string,
    updates: Partial<Pick<EncouragementMessage, "content" | "enabled" | "type">>
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export function EncouragementManager({
  messages,
  isSaving,
  onCreate,
  onUpdate,
  onDelete
}: EncouragementManagerProps) {
  const [type, setType] = useState<EncouragementType>("normal");
  const [content, setContent] = useState("");
  const visibleMessages = messages.filter((message) => message.type === type);

  async function handleCreate() {
    if (!content.trim()) {
      return;
    }

    await onCreate(type, content);
    setContent("");
  }

  return (
    <section className="rounded-lg bg-white p-4 shadow-soft ring-1 ring-brand-100">
      <p className="text-sm font-semibold text-brand-700">鼓励语管理</p>
      <h2 className="mt-1 text-lg font-bold text-slate-950">
        打卡提示
      </h2>

      <div className="mt-4 space-y-3 rounded-lg bg-brand-50 p-3 ring-1 ring-brand-100">
        <select
          value={type}
          onChange={(event) => setType(event.target.value as EncouragementType)}
          className="h-11 w-full rounded-lg border border-brand-100 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
        >
          {encouragementTypes.map((item) => (
            <option key={item} value={item}>
              {encouragementTypeLabels[item]}
            </option>
          ))}
        </select>
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={2}
          maxLength={160}
          placeholder={`新增${encouragementTypeLabels[type]}鼓励语`}
          className="w-full resize-none rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
        />
        <button
          type="button"
          disabled={isSaving || !content.trim()}
          onClick={handleCreate}
          className="h-11 w-full rounded-lg bg-brand-600 px-4 text-sm font-bold text-white active:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          新增鼓励语
        </button>
      </div>

      <div className="mt-4 space-y-2">
        <h3 className="text-sm font-bold text-slate-900">
          {encouragementTypeLabels[type]}鼓励语
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
              isSaving={isSaving}
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
  isSaving,
  onUpdate,
  onDelete
}: {
  message: EncouragementMessage;
  isSaving: boolean;
  onUpdate: EncouragementManagerProps["onUpdate"];
  onDelete: EncouragementManagerProps["onDelete"];
}) {
  const [content, setContent] = useState(message.content);
  const [type, setType] = useState<EncouragementType>(message.type);

  return (
    <article className="rounded-lg bg-brand-50 p-3 ring-1 ring-brand-100">
      <select
        value={type}
        onChange={(event) => {
          const nextType = event.target.value as EncouragementType;
          setType(nextType);
          onUpdate(message.id, { type: nextType });
        }}
        className="h-10 w-full rounded-lg border border-brand-100 bg-white px-3 text-sm font-bold text-slate-800 outline-none"
      >
        {encouragementTypes.map((item) => (
          <option key={item} value={item}>
            {encouragementTypeLabels[item]}
          </option>
        ))}
      </select>
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        rows={2}
        className="mt-2 w-full resize-none rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm leading-6 outline-none"
      />
      <div className="mt-2 grid grid-cols-3 gap-2">
        <button
          type="button"
          disabled={isSaving || !content.trim()}
          onClick={() => onUpdate(message.id, { content })}
          className="h-10 rounded-lg bg-white px-3 text-sm font-bold text-brand-700 ring-1 ring-brand-100 active:bg-brand-50 disabled:text-slate-300"
        >
          保存
        </button>
        <button
          type="button"
          disabled={isSaving}
          onClick={() => onUpdate(message.id, { enabled: !message.enabled })}
          className={`h-10 rounded-lg px-3 text-sm font-bold ring-1 ${
            message.enabled
              ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
              : "bg-slate-100 text-slate-500 ring-slate-200"
          }`}
        >
          {message.enabled ? "已启用" : "已禁用"}
        </button>
        <button
          type="button"
          disabled={isSaving}
          onClick={() => onDelete(message.id)}
          className="h-10 rounded-lg bg-red-50 px-3 text-sm font-bold text-red-700 ring-1 ring-red-100 active:bg-red-100 disabled:text-slate-300"
        >
          删除
        </button>
      </div>
    </article>
  );
}
