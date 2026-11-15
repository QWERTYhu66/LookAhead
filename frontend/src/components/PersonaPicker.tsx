"use client";

import { motion } from "motion/react";
import { Glyph } from "@/components/Glyph";
import { PRESS, PRESS_SOFT, useMotionSafe } from "@/lib/motion";
import { PERSONAS, type Persona } from "@/lib/types";

/** First screen: who are you? Three cards, each one answer away from a forecast. */
export function PersonaCards({ onPick }: { onPick: (p: Persona) => void }) {
  const { spring, enter, shown } = useMotionSafe();
  return (
    <section className="mx-auto flex max-w-xl flex-col gap-8 pt-6 sm:pt-12">
      <motion.div initial={enter} animate={shown} transition={spring} className="flex flex-col gap-3">
        <p className="text-eyebrow">LookAhead</p>
        <h1 className="text-hero">What will this month cost you?</h1>
        <p className="text-body text-muted max-w-prose">
          A forecast of where your spending lands by month-end, per category, from your own history. Pick who you are to see it on a
          matching profile.
        </p>
      </motion.div>
      <ul className="flex flex-col gap-3">
        {PERSONAS.map((p, i) => (
          <motion.li key={p.id} initial={enter} animate={shown} transition={{ ...spring, delay: 0.06 + i * 0.05 }}>
            <motion.button
              type="button"
              onClick={() => onPick(p.id)}
              whileTap={PRESS}
              whileHover={{ y: -1 }}
              transition={spring}
              className="card flex w-full items-center gap-4 px-5 py-4 text-left"
            >
              <span className="tint flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ ["--tint" as string]: "var(--accent)" }}>
                <Glyph name={p.id} size={22} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-headline">{p.title}</span>
                <span className="text-body text-muted">{p.line}</span>
              </span>
              <Glyph name="arrow" size={18} className="shrink-0 text-muted" />
            </motion.button>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}

/** Switch on the forecast screen. The selected pill springs between options; press feedback on pointer-down. */
export function PersonaSwitch({ value, onChange }: { value: Persona; onChange: (p: Persona) => void }) {
  const { spring } = useMotionSafe();
  return (
    <div role="radiogroup" aria-label="Who are you" className="inline-flex rounded-full bg-hairline p-1">
      {PERSONAS.map((p) => {
        const active = p.id === value;
        return (
          <motion.button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(p.id)}
            whileTap={PRESS_SOFT}
            transition={spring}
            className="relative rounded-full px-3.5 py-1.5 text-caption text-foreground"
          >
            {active && <motion.span layoutId="persona-pill" className="absolute inset-0 rounded-full bg-surface shadow-sm" transition={spring} />}
            <span className="relative">{p.title}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
