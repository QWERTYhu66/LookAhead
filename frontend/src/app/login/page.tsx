"use client";

import { FormEvent, useEffect, useState } from "react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { createSession, getSession } from "@/lib/auth";
import { PRESS, useMotionSafe } from "@/lib/motion";

export default function LoginPage() {
  const router = useRouter();
  const { spring, enter, shown } = useMotionSafe();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (getSession()) router.replace("/");
  }, [router]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = email.trim();
    if (!value || !value.includes("@")) {
      setError("Enter a real email so your workspace has a stable identity.");
      return;
    }
    createSession(value, name);
    router.replace("/");
  }

  return (
    <main className="login-shell">
      <motion.section initial={enter} animate={shown} transition={spring} className="login-card">
        <div className="login-mark" aria-hidden>LA</div>
        <p className="text-eyebrow">Your private money workspace</p>
        <h1 className="text-display text-gold">See what the month is becoming.</h1>
        <p className="text-body text-muted">
          Set a plan, understand your pace, and see a clear range for where your spending is headed. Bring in a CSV from your bank when you&apos;re ready.
        </p>
        <form onSubmit={submit} className="login-form">
          <label className="form-label">Your name <span>optional</span>
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Example" autoComplete="name" />
          </label>
          <label className="form-label">Email address
            <input className="field" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" type="email" autoComplete="email" required />
          </label>
          {error && <p className="text-caption text-danger" role="alert">{error}</p>}
          <motion.button type="submit" whileTap={PRESS} transition={spring} className="login-button">
            Continue to workspace <span aria-hidden>↗</span>
          </motion.button>
        </form>
        <p className="text-caption">Your workspace is saved on this device. You can update your plan or replace your imported history any time.</p>
      </motion.section>
      <div className="login-orbit orbit-one" aria-hidden />
      <div className="login-orbit orbit-two" aria-hidden />
    </main>
  );
}
