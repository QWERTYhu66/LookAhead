"use client";

import { motion } from "motion/react";
import { PRESS, useMotionSafe } from "@/lib/motion";
import { PERSONAS, type Persona } from "@/lib/types";

/** First screen: who are you? Three big cards. Press feedback on pointer-down. */
export function PersonaCards({ onPick }: { onPick: (p: Persona) => void }) {
  const { spring, enter, shown } = useMotionSafe();
  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-display">Who are you?</h1>
        <p className="text-body text-muted">LookAhead forecasts your month from your own spending, so the answer changes the demo.</p>
      </div>
      <ul className="flex flex-col gap-3">
        {PERSONAS.map((p, i) => (
          <motion.li key={p.id} initial={enter} animate={shown} transition={{ ...spring, delay: i * 0.05 }}>
            <motion.button
              type="button"
              onClick={() => onPick(p.id)}
              whileTap={PRESS}
              transition={spring}
              className="card flex w-full flex-col items-start gap-1 rounded-2xl bg-surface px-5 py-4 text-left"
            >
              <span className="text-title">{p.title}</span>
              <span className="text-body text-muted">{p.line}</span>
            </motion.button>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}

/** Small switch on the forecast screen to change persona. The selected pill springs between options. */
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
            whileTap={PRESS}
            transition={spring}
            className="relative rounded-full px-3 py-1 text-caption text-foreground"
          >
            {active && <motion.span layoutId="persona-pill" className="absolute inset-0 rounded-full bg-surface shadow-sm" transition={spring} />}
            <span className="relative">{p.title}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
