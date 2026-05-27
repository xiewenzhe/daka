"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentProfile, getRoleHome, signInWithAccount } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [account, setAccount] = useState("jiajia");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function redirectSignedInUser() {
      const { profile } = await getCurrentProfile();

      if (profile) {
        router.replace(getRoleHome(profile.role));
      }
    }

    redirectSignedInUser();
  }, [router]);

  async function handlePasswordLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");

    const { profile, error } = await signInWithAccount(account, password);
    setIsLoading(false);

    if (error) {
      setMessage(error);
      return;
    }

    if (profile) {
      router.replace(getRoleHome(profile.role));
    }
  }

  return (
    <main className="min-h-dvh bg-brand-50">
      <section className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-8">
        <div className="rounded-lg bg-white p-6 shadow-soft ring-1 ring-brand-100">
        <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-brand-100 text-2xl font-black text-brand-700">
          嘉
        </div>
        <h1 className="mt-5 text-3xl font-bold tracking-normal text-slate-950">
          喝药打卡
        </h1>

        <form onSubmit={handlePasswordLogin} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">账号</span>
            <input
              type="text"
              required
              value={account}
              onChange={(event) => setAccount(event.target.value)}
              className="mt-2 h-12 w-full rounded-lg border border-brand-100 bg-brand-50 px-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              placeholder="jiajia"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">密码</span>
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 h-12 w-full rounded-lg border border-brand-100 bg-brand-50 px-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              placeholder="请输入密码"
            />
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="h-12 w-full rounded-lg bg-brand-600 px-4 text-base font-bold text-white shadow-sm active:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
          >
            {isLoading ? "正在登录..." : "登录"}
          </button>
        </form>

        {message ? (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-800 ring-1 ring-amber-200">
            {message}
          </p>
        ) : null}
        </div>
      </section>
    </main>
  );
}
