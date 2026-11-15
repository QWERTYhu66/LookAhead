"use client";

import { useLayoutEffect, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

type AnimationOptions = {
  enabled?: boolean;
  refreshKey?: string | number;
};

export function useScrollAnimations(rootRef: RefObject<HTMLDivElement | null>, options: AnimationOptions = {}) {
  const enabled = options.enabled ?? true;
  const refreshKey = options.refreshKey ?? 0;

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !enabled) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const context = gsap.context(() => {
      const progress = root.querySelector<HTMLElement>("[data-scroll-progress]");
      const intro = root.querySelector<HTMLElement>(".intro");
      const forecast = root.querySelector<HTMLElement>("[data-forecast-pin]");

      if (reducedMotion) {
        if (progress) gsap.set(progress, { scaleX: 0 });
        return;
      }

      const lenis = new Lenis({
        autoRaf: false,
        smoothWheel: true,
        lerp: 0.085,
      });

      const onLenisScroll = () => ScrollTrigger.update();
      lenis.on("scroll", onLenisScroll);
      const onTick = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(onTick);
      gsap.ticker.lagSmoothing(0);

      if (progress) {
        gsap.to(progress, {
          scaleX: 1,
          ease: "none",
          scrollTrigger: { trigger: document.documentElement, start: "top top", end: "max", scrub: true },
        });
      }

      if (intro) {
        gsap.to(intro.querySelector(".hero-ornament"), {
          yPercent: 18,
          rotation: 8,
          ease: "none",
          scrollTrigger: { trigger: intro, start: "top top", end: "bottom top", scrub: true },
        });
        gsap.to(intro.querySelector("h1"), {
          yPercent: -5,
          ease: "none",
          scrollTrigger: { trigger: intro, start: "top top", end: "bottom top", scrub: true },
        });
      }

      gsap.from(root.querySelectorAll(".reveal"), {
        y: 28,
        autoAlpha: 0,
        duration: 0.8,
        ease: "power2.out",
        stagger: 0.07,
        clearProps: "transform,opacity,visibility",
        scrollTrigger: { trigger: root.querySelector(".calculator-main"), start: "top 78%", once: true },
      });

      root.querySelectorAll<HTMLElement>(".reveal-group").forEach((group) => {
        gsap.from(group.children, {
          y: 26,
          autoAlpha: 0,
          duration: 0.7,
          ease: "power2.out",
          stagger: 0.08,
          clearProps: "transform,opacity,visibility",
          scrollTrigger: { trigger: group, start: "top 82%", once: true },
        });
      });

      if (forecast && window.matchMedia("(min-width: 801px)").matches) {
        const marker = forecast.querySelector<HTMLElement>(".forecast-marker");
        const range = forecast.querySelector<HTMLElement>(".forecast-range");
        const forecastTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: forecast,
            start: "top 22%",
            end: "+=420",
            scrub: 0.8,
            pin: true,
            anticipatePin: 1,
          },
        });
        if (marker) forecastTimeline.to(marker, { left: "72%", ease: "none" }, 0);
        if (range) forecastTimeline.to(range, { scaleX: 0.72, transformOrigin: "left center", ease: "none" }, 0);
      }

      root.querySelectorAll<HTMLElement>(".calculate-button").forEach((button) => {
        const move = (event: PointerEvent) => {
          const bounds = button.getBoundingClientRect();
          const x = (event.clientX - bounds.left - bounds.width / 2) * 0.08;
          const y = (event.clientY - bounds.top - bounds.height / 2) * 0.08;
          gsap.to(button, { x, y, duration: 0.25, ease: "power2.out", overwrite: true });
        };
        const reset = () => gsap.to(button, { x: 0, y: 0, duration: 0.35, ease: "elastic.out(1, 0.5)", overwrite: true });
        button.addEventListener("pointermove", move);
        button.addEventListener("pointerleave", reset);
        context.add(() => {
          button.removeEventListener("pointermove", move);
          button.removeEventListener("pointerleave", reset);
        });
      });

      root.querySelectorAll<HTMLElement>(".comparison-card, .breakdown-card, .backend-card, .how-it-works").forEach((card) => {
        const enter = () => gsap.to(card, { y: -4, scale: 1.01, duration: 0.3, ease: "power2.out", overwrite: true });
        const leave = () => gsap.to(card, { y: 0, scale: 1, duration: 0.35, ease: "power2.out", overwrite: true });
        card.addEventListener("pointerenter", enter);
        card.addEventListener("pointerleave", leave);
        context.add(() => {
          card.removeEventListener("pointerenter", enter);
          card.removeEventListener("pointerleave", leave);
        });
      });

      context.add(() => {
        lenis.off("scroll", onLenisScroll);
        gsap.ticker.remove(onTick);
        lenis.destroy();
      });
    }, root);

    return () => context.revert();
  }, [enabled, refreshKey, rootRef]);
}
