import { useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "../hooks/useReducedMotion";

const BOOT_LINES = [
  "> init network.basics --mode=interactive",
  "> load core.module: osi.model ........... OK",
  "> load core.module: tcp-ip.stack ........ OK",
  "> render packet.flow @60fps ............. OK",
  "> transmission ready",
];

export default function Hero() {
  const reduced = useReducedMotion();
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);

  const done = lineIdx >= BOOT_LINES.length;

  useEffect(() => {
    if (reduced) {
      setLineIdx(BOOT_LINES.length);
      return;
    }
    if (done) return;
    const line = BOOT_LINES[lineIdx];
    if (charIdx < line.length) {
      const t = window.setTimeout(() => setCharIdx((c) => c + 1), 14);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => {
      setLineIdx((l) => l + 1);
      setCharIdx(0);
    }, 220);
    return () => window.clearTimeout(t);
  }, [lineIdx, charIdx, done, reduced]);

  const visible = useMemo(() => {
    if (done) return BOOT_LINES;
    return BOOT_LINES.slice(0, lineIdx).concat(
      BOOT_LINES[lineIdx].slice(0, charIdx)
    );
  }, [lineIdx, charIdx, done]);

  return (
    <header className="relative min-h-dvh flex flex-col justify-center px-5 md:px-10 overflow-hidden">
      {/* faint grid backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,244,142,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(0,244,142,0.6) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="relative max-w-4xl mx-auto w-full">
        <div className="terminal-frame p-4 md:p-5 mb-10 text-xs md:text-sm leading-6 min-h-[136px]">
          {visible.map((l, i) => (
            <p key={i} className="text-phosphor-muted whitespace-pre">
              {l}
            </p>
          ))}
          {!done && (
            <span className="inline-block w-2.5 h-4 bg-[var(--phosphor)] cursor-blink align-middle" />
          )}
        </div>

        <p className="text-xs tracking-[0.35em] text-phosphor-faint uppercase mb-4">
          interactive explainer :: education module
        </p>
        <h1 className="text-4xl md:text-7xl font-bold uppercase leading-[1.05] tracking-tight glow">
          Network
          <br />
          Basics<span className="text-phosphor-faint">_</span>
        </h1>
        <p className="mt-5 text-base md:text-xl text-phosphor-muted max-w-[60ch] leading-relaxed">
          The <span className="text-phosphor-bright">OSI</span> &{" "}
          <span className="text-phosphor-bright">TCP/IP</span> models — watch a
          message get wrapped, addressed, shipped and unwrapped, layer by
          layer.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <a
            href="#encapsulation"
            className="inline-flex h-11 items-center border border-phosphor bg-[rgba(0,244,142,0.12)] px-6 text-sm uppercase tracking-widest
              transition-colors duration-150 hover:bg-[rgba(0,244,142,0.25)]
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-void active:scale-[0.98]"
          >
            run the demo
          </a>
          <a
            href="#basics"
            className="inline-flex h-11 items-center border border-phosphor-dim px-6 text-sm uppercase tracking-widest text-phosphor-muted
              transition-colors duration-150 hover:border-phosphor hover:text-phosphor
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-void active:scale-[0.98]"
          >
            start from zero
          </a>
        </div>
      </div>

      <a
        href="#basics"
        aria-label="Scroll to content"
        className="absolute bottom-6 left-1/2 -translate-x-1/2 text-phosphor-faint text-[10px] tracking-[0.3em] uppercase
          transition-colors hover:text-phosphor focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="block text-center">scroll</span>
        <span className="block text-center text-lg leading-none cursor-blink">
          ▼
        </span>
      </a>
    </header>
  );
}
