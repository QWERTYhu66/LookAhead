"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { login } from "@/lib/api";
import { setSession } from "@/lib/auth";

/** Demo login: any email and password work. Saves a local token, then goes to the forecast. */
export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await login();
      if (!res.ok || !res.token) throw new Error("login failed");
      setSession({ token: res.token, user: res.user });
      router.replace("/");
      router.refresh();
    } catch {
      setError("Could not sign in. Try again.");
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto flex max-w-md flex-col gap-8 pt-10 sm:pt-16">
      <div className="flex flex-col gap-3">
        <p className="text-eyebrow">LookAhead</p>
        <h1 className="text-display">Sign in</h1>
        <p className="text-body text-muted">This is a demo. Any email and password will let you in.</p>
      </div>
      <form onSubmit={onSubmit} className="card flex flex-col gap-4 px-5 py-5">
        <label className="flex flex-col gap-1">
          <span className="text-caption">Email</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="username"
            defaultValue="demo@lookahead.app"
            className="rounded-xl border border-hairline bg-surface-2 px-3 py-2 text-body text-foreground outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-caption">Password</span>
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            defaultValue="demo"
            className="rounded-xl border border-hairline bg-surface-2 px-3 py-2 text-body text-foreground outline-none focus:border-accent"
          />
        </label>
        {error && <p className="text-caption" style={{ color: "var(--danger)" }}>{error}</p>}
        <motion.button
          type="submit"
          disabled={busy}
          whileTap={{ scale: 0.97 }}
          className="rounded-full bg-accent px-4 py-2.5 text-caption font-bold text-black disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Continue"}
        </motion.button>
      </form>
    </section>
  );
}
