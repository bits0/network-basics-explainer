import { useEffect, useRef, useState } from "react";
import {
  SectionHead,
  ControlButton,
  IconPlay,
  IconPause,
  IconRestart,
  IconStep,
  Chip,
} from "../components/terminal";
import { useReducedMotion } from "../hooks/useReducedMotion";

type Tone = "data" | "tcp" | "ip" | "frame" | "fcs";
interface ChipDef {
  label: string;
  tone: Tone;
}
interface Stage {
  side: "A" | "B" | "wire";
  row: number; // 0 app … 4 physical
  chips: ChipDef[];
  newChips: number[]; // indices that were just added
  log: string;
  dur: number; // ms @1x
}

const D = (label = "DATA 'HELLO'"): ChipDef => ({ label, tone: "data" });
const TCP: ChipDef = { label: "TCP", tone: "tcp" };
const IP: ChipDef = { label: "IP", tone: "ip" };
const FRM: ChipDef = { label: "FRM", tone: "frame" };
const FCS: ChipDef = { label: "FCS", tone: "fcs" };

const STAGES: Stage[] = [
  {
    side: "A",
    row: 0,
    chips: [D()],
    newChips: [0],
    log: 'A/L7 application :: payload created — DATA "HELLO HOST B"',
    dur: 1500,
  },
  {
    side: "A",
    row: 1,
    chips: [TCP, D("DATA")],
    newChips: [0],
    log: "A/L4 transport   :: + TCP header [port 51024 → 80, seq/ack] → SEGMENT",
    dur: 1500,
  },
  {
    side: "A",
    row: 2,
    chips: [IP, TCP, D("DATA")],
    newChips: [0],
    log: "A/L3 network     :: + IP header [192.168.1.10 → 93.184.216.34, TTL 64] → PACKET",
    dur: 1500,
  },
  {
    side: "A",
    row: 3,
    chips: [FRM, IP, TCP, D("DATA"), FCS],
    newChips: [0, 4],
    log: "A/L2 data link   :: + frame header [MAC 3c:22:fb:… → 9c:5c:8e:…] + FCS trailer → FRAME",
    dur: 1500,
  },
  {
    side: "wire",
    row: 4,
    chips: [FRM, IP, TCP, D("DATA"), FCS],
    newChips: [],
    log: "A/L1 physical    :: frame → bits on the wire: 01001000 01100101 01101100 …",
    dur: 2100,
  },
  {
    side: "B",
    row: 3,
    chips: [IP, TCP, D("DATA")],
    newChips: [],
    log: "B/L2 data link   :: FCS checksum OK — frame header & trailer stripped",
    dur: 1500,
  },
  {
    side: "B",
    row: 2,
    chips: [TCP, D("DATA")],
    newChips: [],
    log: "B/L3 network     :: dst IP matches this host — IP header stripped",
    dur: 1500,
  },
  {
    side: "B",
    row: 1,
    chips: [D("DATA")],
    newChips: [],
    log: "B/L4 transport   :: segments ordered, ACK queued — TCP header stripped",
    dur: 1500,
  },
  {
    side: "B",
    row: 0,
    chips: [D()],
    newChips: [],
    log: 'B/L7 application :: payload delivered intact: "HELLO HOST B" — 200 OK',
    dur: 1000,
  },
];

const ROWS = [
  { num: "L7", label: "application" },
  { num: "L4", label: "transport" },
  { num: "L3", label: "network" },
  { num: "L2", label: "data link" },
  { num: "L1", label: "physical" },
];

const SPEEDS = [0.5, 1, 2] as const;

export default function Encapsulation() {
  const reduced = useReducedMotion();
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const logRef = useRef<HTMLDivElement | null>(null);

  const s = STAGES[stage];

  /* auto-advance */
  useEffect(() => {
    if (!playing || reduced) return;
    const t = window.setTimeout(
      () => {
        if (stage >= STAGES.length - 1) setPlaying(false);
        else setStage((st) => st + 1);
      },
      s.dur / speed
    );
    return () => window.clearTimeout(t);
  }, [stage, playing, speed, reduced, s.dur]);

  /* log autoscroll */
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [stage]);

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

  const hostCell = (side: "A" | "B", row: number) => {
    const active = s.side === side && s.row === row;
    return (
      <div
        className={`relative border px-2 py-2 flex flex-col justify-center min-h-[62px] transition-colors duration-200 ${
          active
            ? "border-phosphor bg-[rgba(0,244,142,0.08)]"
            : "border-phosphor-dim"
        }`}
      >
        <span
          className={`text-[9px] tracking-[0.2em] uppercase ${
            active ? "text-phosphor-bright" : "text-phosphor-faint"
          } ${side === "B" ? "text-right" : ""}`}
        >
          {ROWS[row].num}
          <span className="hidden md:inline"> · {ROWS[row].label}</span>
        </span>
        {active && (
          <div
            key={stage}
            className={`mt-1.5 flex flex-wrap items-center gap-1 packet-in ${
              side === "B" ? "justify-end" : ""
            }`}
          >
            {s.chips.map((c, i) => (
              <span
                key={i}
                className={s.newChips.includes(i) ? "chip-new" : undefined}
              >
                <Chip label={c.label} tone={c.tone} />
              </span>
            ))}
          </div>
        )}
        {row === 4 && (
          <span
            aria-hidden
            className={`absolute top-1/2 h-px bg-[var(--phosphor-dim)] ${
              side === "A" ? "left-1/2 right-[-1px]" : "left-[-1px] right-1/2"
            }`}
          />
        )}
      </div>
    );
  };

  return (
    <div>
      <SectionHead
        index="02 :: ENCAPSULATION"
        title="Wrap it. Ship it. Unwrap it."
        sub="This is the core idea behind both models. As data moves DOWN the sender's stack, every layer wraps it with its own header — like nesting envelopes. On the wire it's just bits. The receiver then strips each header on the way UP. Each layer only ever talks to its matching peer on the other side. Run the transmission:"
      />

      <div className="terminal-frame">
        <div className="flex items-center justify-between border-b border-phosphor-dim px-4 py-2 text-[10px] tracking-[0.25em] uppercase text-phosphor-faint">
          <span>sim://encapsulation.a→b</span>
          <span>
            step <span className="text-phosphor">{stage + 1}</span>/9
          </span>
        </div>

        {/* stacks + wire */}
        <div className="grid grid-cols-[1fr_minmax(56px,150px)_1fr] gap-x-1 md:gap-x-2 p-3 md:p-5">
          {/* column headers */}
          <p className="pb-2 text-[10px] tracking-[0.25em] uppercase text-phosphor-muted">
            host a — sender
          </p>
          <p className="pb-2 text-center text-[10px] tracking-[0.25em] uppercase text-phosphor-faint">
            wire
          </p>
          <p className="pb-2 text-right text-[10px] tracking-[0.25em] uppercase text-phosphor-muted">
            host b — receiver
          </p>

          {ROWS.map((_, r) => (
            <div key={r} className="contents">
              {hostCell("A", r)}
              {/* wire column cell */}
              <div className="relative flex items-center justify-center">
                {r === 4 ? (
                  <div className="relative h-px w-full overflow-visible">
                    <span
                      aria-hidden
                      className={`absolute inset-x-0 top-0 h-px ${
                        s.side === "wire"
                          ? "wire-anim"
                          : "bg-[var(--phosphor-dim)]"
                      }`}
                    />
                    {s.side === "wire" && !reduced && (
                      <span
                        key={stage}
                        aria-hidden
                        className="absolute -top-[7px] left-0 h-3.5 w-3.5 bg-[var(--phosphor)] wire-run"
                        style={
                          {
                            "--wire-dur": `${STAGES[4].dur / speed}ms`,
                          } as React.CSSProperties
                        }
                      />
                    )}
                    {s.side === "wire" && reduced && (
                      <span
                        aria-hidden
                        className="absolute -top-[7px] left-1/2 h-3.5 w-3.5 bg-[var(--phosphor)]"
                      />
                    )}
                  </div>
                ) : null}
              </div>
              {hostCell("B", r)}
            </div>
          ))}
        </div>

        {/* console log */}
        <div className="border-t border-phosphor-dim">
          <div
            ref={logRef}
            aria-live="polite"
            className="h-[132px] overflow-y-auto px-4 py-3 text-[10px] md:text-xs leading-5 text-phosphor-muted"
          >
            {STAGES.slice(0, stage + 1).map((st, i) => (
              <p
                key={i}
                className={i === stage ? "text-phosphor-bright glow-soft" : ""}
              >
                <span className="text-phosphor-faint">
                  [{String(i).padStart(2, "0")}]
                </span>{" "}
                {st.log}
              </p>
            ))}
            <p>
              <span className="inline-block h-3.5 w-2 translate-y-0.5 bg-[var(--phosphor)] cursor-blink" />
            </p>
          </div>
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
          {!reduced && (
            <div
              role="group"
              aria-label="Playback speed"
              className="ml-1 flex border border-phosphor-dim"
            >
              {SPEEDS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setSpeed(v)}
                  aria-pressed={speed === v}
                  className={`h-11 px-3 text-xs cursor-pointer transition-colors duration-150
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset
                    ${
                      speed === v
                        ? "bg-[rgba(0,244,142,0.18)] text-phosphor-bright"
                        : "text-phosphor-muted hover:text-phosphor"
                    }`}
                >
                  {v}×
                </button>
              ))}
            </div>
          )}
          <span className="ml-auto text-[10px] md:text-xs uppercase tracking-wider text-phosphor-faint">
            {s.side === "A"
              ? "▼ wrapping (encapsulation)"
              : s.side === "wire"
                ? "→ bits on the wire"
                : "▲ unwrapping (decapsulation)"}
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3 text-sm leading-relaxed text-phosphor-muted">
        <p>
          <span className="text-phosphor-bright">Nested envelopes.</span> Each
          layer treats everything from above as opaque payload and prepends its
          own control data.
        </p>
        <p>
          <span className="text-phosphor-bright">Peer conversations.</span>{" "}
          Host A's Transport layer "talks" only to Host B's Transport layer —
          the layers below are just the postal service.
        </p>
        <p>
          <span className="text-phosphor-bright">Swap any layer.</span> Wi-Fi
          instead of Ethernet? Only Layer 1–2 change. The web request above
          never notices.
        </p>
      </div>
    </div>
  );
}
