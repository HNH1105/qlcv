// ĐÍCH: src/components/nhac-viec/ChiSoLink.tsx
"use client";
import Link from "next/link";
import { useNavProgress } from "@/components/providers/NavProgressProvider";

export default function ChiSoLink({ label, value, href, nhan }: { label: string; value: number; href: string; nhan?: "error" | "success" }) {
  const batDau = useNavProgress();
  const mau = nhan === "error" ? "text-error-600" : nhan === "success" ? "text-success-600" : "text-gray-800 dark:text-white/90";
  return (
    <Link href={href} onClick={batDau} className="block rounded-xl border border-gray-200 bg-white p-4 transition hover:border-brand-300 dark:border-white/[0.05] dark:bg-white/[0.03] dark:hover:border-brand-500/50">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${mau}`}>{value}</p>
    </Link>
  );
}
