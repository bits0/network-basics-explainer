import { useEffect, useState } from "react";
import {
  SectionHead,
  ControlButton,
  IconPlay,
  IconPause,
  IconRestart,
  IconStep,
} from "../components/terminal";
import { useReducedMotion } from "../hooks/useReducedMotion";

interface HStage {
  label: string; // arrow caption
  dir: "c2s" | "s2c" | "both" | "none";
  client: string;
  server: string;
  log: string;
  dur: number;
}

const STAGES: HStage[] = [
  {
    label: "",
    dir: "none",
    client: "CLOSED",
    server: "LISTEN",
    log: "server listens on port 80 · client idle — connection is CLOSED",
    dur: 1200,
  },
  {
    label: "SYN  seq=100",
    dir: "c2s",
    client: "SYN-SENT",
    server: "LISTEN",
    log: 'client → SYN: "let\'s talk — my sequence numbers start at 100"',
    dur: 1600,
  },
  {
    label: "SYN-ACK  seq=300, ack=101",
    dir: "s2c",
    client: "SYN-SENT",
    server: "SYN-RECEIVED",
    log: 'server → SYN-ACK: "agreed, mine start at 300 — and I got your 100, send 101 next"',
    dur: 1600,
  },
  {
    label: "ACK  ack=301",
    dir: "c2s",
    client: "ESTABLISHED",
    server: "ESTABLISHED",
    log: 'client → ACK: "got your 300, send 301" — connection ESTABLISHED on both sides',
    dur: 1600,
  },
  {
    label: 'DATA  "GET /index.html" ⇄ "200 OK"',
    dir: "both",
    client: "ESTABLISHED",
    server: "ESTABLISHED",
    log: "reliable byte stream open — every segment now carries seq/ack so losses get retransmitted",
    dur: 2200,
  },
];

function Arrow({ dir, active }: { dir: HStage["dir"]; active: boolean }) {
  if (dir === "none") return <div className="h-10" />;
  const line = "stroke-[var(--phosphor)]";
  const dim = "stroke-[var(--phosphor-dim)]";
  return (
    <div className={`h-10 transition-opacity duration-200 ${active ? "opacity-100" : "opacity-20"}`}>
      <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 40" aria-hidden>
        {(dir === "c2s" || dir === "both") && (
          <g className={active ? "arrow-draw" : ""}>
            <line x1="2" y1="20" x2="94" y2="20" className={`${active ? line : dim}`} strokeWidth="1.5" strokeDasharray="4 3" />
            <path d="M94 15 L100 20 L94 25 Z" className={active ? "fill-[var(--phosphor)]" : "fill-[var(--phosphor-dim)]"} />
          </g>
        )}
        {(dir === "s2c" || dir === "both") && (
          <g>
            <line x1="98" y1="20" x2="6" y2="20" className={`${active ? line : dim}`} strokeWidth="1.5" strokeDasharray="4 3" />
            <path d="M6 15 L0 20 L6 25 Z" className={active ? "fill-[var(--phosphor)]" : "fill-[var(--phosphor-dim)]"} />
          </g>
        )}
      </svg>
    </div>
  );
}

export default function Handshake() {
  const reduced = useReducedMotion();
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(false);

  const s = STAGES[stage];

  useEffect(() => {
    if (!playing || reduced) return;
    const t = window.setTimeout(() => {
      if (stage >= STAGES.length - 1) setPlaying(false);
      else setStage((st) => st + 1);
    }, s.dur);
    return () => window.clearTimeout(t);
  }, [stage, playing, reduced, s.dur]);

  const step = () => {
    setPlaying(false);
    setStage((st) => (st >= STAGES.length - 1 ? 0 : st + 1));
  };
  const restart = () => {
    setStage(0);
    setPlaying(!reduced);
  };
  const toggle = () => {
    if (!playing && stage >= STAGES.length - 1) {
      setStage(0);
      setPlaying(true);
    } else setPlaying((p) => !p);
  };

  return (
    <div>
      <SectionHead
        index="03 :: TCP HANDSHAKE"
        title="Three knocks before talking"
        sub="Before any data flows, TCP performs a three-way handshake: SYN, SYN-ACK, ACK. Each side announces its starting sequence number and acknowledges the other's — that's how both ends agree on numbering before trusting the pipe. Run it:"
      />

      <div className="terminal-frame">
        <div className="flex items-center justify-between border-b border-phosphor-dim px-4 py-2 text-[10px] tracking-[0.25em] uppercase text-phosphor-faint">
          <span>sim://tcp.3-way-handshake</span>
          <span>
            step <span className="text-phosphor">{stage + 1}</span>/5
          </span>
        </div>

        <div className="p-4 md:p-6">
          {/* endpoints */}
          <div className="grid grid-cols-[1fr_minmax(80px,2fr)_1fr] items-stretch gap-x-2 md:gap-x-6">
            <div className="border border-phosphor px-3 py-2 text-center bg-[rgba(0,244,142,0.08)]">
              <p className="text-xs md:text-sm font-bold uppercase tracking-widest text-phosphor-bright">
                client
              </p>
              <p className="text-[9px] md:text-[10px] text-phosphor-muted">
                192.168.1.10:51024
              </p>
              <p
                className={`mt-1 inline-block border px-1.5 py-0.5 text-[9px] tracking-widest ${
                  s.client === "ESTABLISHED"
                    ? "border-phosphor text-phosphor-bright glow-soft"
                    : "border-phosphor-dim text-phosphor-muted"
                }`}
              >
                {s.client}
              </p>
            </div>
            <div />
            <div className="border border-phosphor px-3 py-2 text-center bg-[rgba(0,244,142,0.08)]">
              <p className="text-xs md:text-sm font-bold uppercase tracking-widest text-phosphor-bright">
                server
              </p>
              <p className="text-[9px] md:text-[10px] text-phosphor-muted">
                93.184.216.34:80
              </p>
              <p
                className={`mt-1 inline-block border px-1.5 py-0.5 text-[9px] tracking-widest ${
                  s.server === "ESTABLISHED"
                    ? "border-phosphor text-phosphor-bright glow-soft"
                    : "border-phosphor-dim text-phosphor-muted"
                }`}
              >
                {s.server}
              </p>
            </div>

            {/* lifelines + stage arrows */}
            {STAGES.slice(1).map((st, i) => {
              const n = i + 1;
              const active = stage >= n;
              return (
                <div key={n} className="contents">
                  <div className="flex justify-center">
                    <span className="h-full w-px bg-[var(--phosphor-dim)]" />
                  </div>
                  <div className="flex flex-col justify-center">
                    <p
                      className={`text-center text-[9px] md:text-xs tracking-wider mb-0.5 transition-opacity duration-200 min-h-4 ${
                        active ? "text-phosphor-bright opacity-100" : "opacity-0"
                      }`}
                    >
                      {st.label}
                    </p>
                    <Arrow dir={st.dir} active={active} />
                  </div>
                  <div className="flex justify-center">
                    <span className="h-full w-px bg-[var(--phosphor-dim)]" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* log */}
        <div className="border-t border-phosphor-dim px-4 py-3 text-[10px] md:text-xs leading-5 text-phosphor-muted min-h-[108px]">
          {STAGES.slice(0, stage + 1).map((st, i) => (
            <p key={i} className={i === stage ? "text-phosphor-bright glow-soft" : ""}>
              <span className="text-phosphor-faint">[{String(i).padStart(2, "0")}]</span>{" "}
              {st.log}
            </p>
          ))}
          <p>
            <span className="inline-block h-3.5 w-2 translate-y-0.5 bg-[var(--phosphor)] cursor-blink" />
          </p>
        </div>

        {/* controls */}
        <div className="flex flex-wrap items-center gap-2 border-t border-phosphor-dim px-4 py-3">
          {!reduced && (
            <ControlButton label={playing ? "Pause" : "Play"} onClick={toggle}>
              {playing ? IconPause : IconPlay}
            </ControlButton>
          )}
          <ControlButton label="Step forward" onClick={step}>
            {IconStep}
          </ControlButton>
          <ControlButton label="Restart" onClick={restart}>
            {IconRestart}
          </ControlButton>
          <span className="ml-auto text-[10px] md:text-xs uppercase tracking-wider text-phosphor-faint">
            {stage < 3 ? "… negotiating" : stage === 3 ? "✓ established" : "⇄ data flowing"}
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3 text-sm leading-relaxed text-phosphor-muted">
        <p>
          <span className="text-phosphor-bright">Why three?</span> Both sides
          must send their starting sequence number AND acknowledge the other's
          — two messages can't carry four facts, three can.
        </p>
        <p>
          <span className="text-phosphor-bright">Lost SYN?</span> No reply
          arrives, the client waits and retransmits. Reliability is built in
          from the very first packet.
        </p>
        <p>
          <span className="text-phosphor-bright">Closing.</span> Teardown uses
          FIN/ACK pairs — four waves, because each side closes its half
          independently.
        </p>
      </div>
    </div>
  );
}
