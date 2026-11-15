"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { useEffect } from "react";
import { PRESS_SOFT, useMotionSafe } from "@/lib/motion";

const TABS = [
  { href: "/", label: "Forecast" },
  { href: "/evaluation", label: "How good is it?" },
];

/** Floating translucent header with segmented tabs. The pill springs between tabs; a soft fade marks the scroll edge. */
export function Header() {
  const path = usePathname();
  const { spring } = useMotionSafe();

  useEffect(() => {
    const onScroll = () => {
      document.documentElement.dataset.scrolled = window.scrollY > 8 ? "true" : "false";
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="material sticky top-0 z-20">
      <nav className="mx-auto flex w-full max-w-[1040px] items-center justify-between px-4 py-2.5 sm:px-6">
        <Link href="/" className="text-headline tracking-tight text-gradient">
          LookAhead
        </Link>
        <div role="tablist" className="flex rounded-full bg-hairline p-1">
          {TABS.map((t) => {
            const active = path === t.href;
            return (
              <motion.span key={t.href} whileTap={PRESS_SOFT} transition={spring} className="relative">
                {active && <motion.span layoutId="tab-pill" className="absolute inset-0 rounded-full bg-surface shadow-sm" transition={spring} />}
                <Link role="tab" aria-selected={active} href={t.href} className="relative block rounded-full px-3.5 py-1.5 text-caption text-foreground">
                  {t.label}
                </Link>
              </motion.span>
            );
          })}
        </div>
      </nav>
      <div className="header-edge" aria-hidden />
    </header>
  );
}
