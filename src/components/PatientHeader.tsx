"use client";

import { useRouter } from "next/navigation";
import { formatChineseDate } from "@/lib/date";
import { signOutCurrentUser } from "@/lib/auth";

type PatientHeaderProps = {
  title: string;
  subtitle?: string;
};

export function PatientHeader({ title, subtitle }: PatientHeaderProps) {
  const router = useRouter();

  async function handleSignOut() {
    await signOutCurrentUser();
    router.replace("/login");
  }

  return (
    <header className="rounded-lg bg-white p-5 shadow-soft ring-1 ring-brand-100">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-brand-700">嘉嘉</p>
          <h1 className="text-3xl font-bold tracking-normal text-slate-950">
            {title}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {subtitle ?? formatChineseDate()}
          </p>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="h-10 shrink-0 rounded-lg bg-brand-50 px-3 text-sm font-semibold text-brand-700 ring-1 ring-brand-100 active:bg-brand-100"
        >
          退出
        </button>
      </div>
    </header>
  );
}
