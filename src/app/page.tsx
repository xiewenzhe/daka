import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-brand-50">
      <section className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-8">
        <div className="rounded-lg bg-white p-6 shadow-soft ring-1 ring-brand-100">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-lg bg-brand-100 text-3xl font-black text-brand-700">
            嘉
          </div>
          <h1 className="text-4xl font-black tracking-normal text-slate-950">
            嘉嘉的专属打卡网站
          </h1>
          <div className="mt-6 grid grid-cols-3 gap-2">
            {["09:00", "15:00", "21:00"].map((time) => (
              <div
                key={time}
                className="rounded-lg bg-brand-50 px-3 py-3 text-center ring-1 ring-brand-100"
              >
                <p className="text-sm font-bold text-brand-700">{time}</p>
              </div>
            ))}
          </div>
        <Link
          href="/login"
          className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-lg bg-brand-600 px-4 text-base font-semibold text-white shadow-sm active:bg-brand-700"
        >
          去登录
        </Link>
        </div>
      </section>
    </main>
  );
}
