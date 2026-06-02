"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/app/plan", label: "安排" },
  { href: "/app", label: "打卡" },
  { href: "/app/stats", label: "统计" },
  { href: "/app/photos", label: "照片" },
  { href: "/app/feedback", label: "反馈" }
];

export function PatientNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-5 grid grid-cols-5 gap-2">
      {items.map((item) => {
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex h-11 items-center justify-center rounded-lg px-2 text-sm font-bold ring-1 transition ${
              isActive
                ? "bg-brand-600 text-white ring-brand-600"
                : "bg-white text-brand-700 ring-brand-100 active:bg-brand-50"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
