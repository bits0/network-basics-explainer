import { useEffect, useMemo, useRef, useState } from "react";
import { SectionHead, ControlButton, IconRestart } from "../components/terminal";
import {
  CliEngine,
  type DeviceId,
  type Line,
  type NetState,
  srvPathUp,
  staffPathUp,
  internetPathUp,
} from "../lib/cli";

const DEVICES: { id: DeviceId; role: string }[] = [
  { id: "PC1", role: "host · 192.168.10.11" },
  { id: "SW1", role: "switch" },
  { id: "R1", role: "router" },
  { id: "FW1", role: "firewall" },
];

const BOOT: Record<DeviceId, string[]> = {
  PC1: [
    "Microsoft Windows [Version 10.0.19045.4046]",
    "(c) teaching-lab edition. Try: ipconfig · ping 192.168.20.10 · tracert 8.8.8.8",
  ],
  SW1: [
    "SW1 con0 is now available",
    "Press RETURN to get started. Try: enable → show vlan brief",
  ],
  R1: [
    "R1 con0 is now available",
    "Press RETURN to get started. Try: enable → show ip interface brief",
  ],
  FW1: [
    "FW1 con0 is now available",
    "Press RETURN to get started. Try: enable → show access-lists",
  ],
};

/* ---------------- topology ---------------- */

function TopoNode({
  x,
  y,
  label,
  sub,
  down,
}: {
  x: number;
  y: number;
  label: string;
  sub: string;
  down?: boolean;
}) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect
        x="-34"
        y="-18"
        width="68"
        height="36"
        fill="#050b08"
        stroke={down ? "var(--phosphor-faint)" : "var(--phosphor)"}
        strokeDasharray={down ? "4 3" : undefined}
        strokeWidth="1.2"
      />
      <text
        textAnchor="middle"
        y="-2"
        fontSize="11"
        fontWeight="bold"
        fill={down ? "var(--phosphor-faint)" : "#00f48e"}
        fontFamily="'Space Mono', monospace"
      >
        {label}
      </text>
      <text
        textAnchor="middle"
        y="11"
        fontSize="7.5"
        fill="var(--phosphor-muted)"
        fontFamily="'Space Mono', monospace"
      >
        {sub}
      </text>
    </g>
  );
}

function Link({
  x1,
  y1,
  x2,
  y2,
  label,
  up,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  up: boolean;
}) {
  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={up ? "var(--phosphor)" : "var(--phosphor-faint)"}
        strokeWidth={up ? 1.6 : 1}
        strokeDasharray={up ? undefined : "5 4"}
        opacity={up ? 0.9 : 0.5}
      />
      <text
        x={(x1 + x2) / 2}
        y={(y1 + y2) / 2 - 5}
        textAnchor="middle"
        fontSize="7.5"
        fill={up ? "var(--phosphor-muted)" : "var(--phosphor-faint)"}
        fontFamily="'Space Mono', monospace"
      >
        {label}
        {up ? "" : " ✕"}
      </text>
    </g>
  );
}

function Topology({ st }: { st: NetState }) {
  const fa01 = st.ports["fa0/1"];
  const fa02 = st.ports["fa0/2"];
  const gi01 = st.ports["gi0/1"];
  const lan = staffPathUp(st);
  const srv = srvPathUp(st);
  const net = internetPathUp(st);
  return (
    <svg
      viewBox="0 0 800 240"
      className="w-full h-auto"
      role="img"
      aria-label="Lab topology: PC1 and SRV1 connect to switch SW1, which trunks to router R1, then firewall FW1, then the internet"
    >
      <Link x1={104} y1={60} x2={216} y2={110} label="fa0/1 · vlan 10" up={!fa01.shutdown && fa01.accessVlan === 10} />
      <Link x1={104} y1={190} x2={216} y2={140} label={`fa0/2 · vlan ${fa02.accessVlan}${fa02.shutdown ? " · shut" : ""}`} up={!fa02.shutdown && fa02.accessVlan === 20} />
      <Link x1={284} y1={125} x2={396} y2={125} label={`gi0/1 trunk ${gi01.allowed.join(",")}`} up={!gi01.shutdown && gi01.mode === "trunk"} />
      <Link x1={464} y1={125} x2={546} y2={125} label="203.0.113.0/30" up />
      <Link x1={614} y1={125} x2={686} y2={125} label={net ? "icmp ✓" : "icmp ✕"} up={net} />
      <TopoNode x={70} y={55} label="PC1" sub=".10.11" down={!lan} />
      <TopoNode x={70} y={195} label="SRV1" sub=".20.10" down={!srv} />
      <TopoNode x={250} y={125} label="SW1" sub="switch" />
      <TopoNode x={430} y={125} label="R1" sub="router" down={!lan} />
      <TopoNode x={580} y={125} label="FW1" sub="firewall" />
      <g transform="translate(720,125)">
        <circle r="26" fill="#050b08" stroke={net ? "var(--phosphor)" : "var(--phosphor-faint)"} strokeWidth="1.2" />
        <text textAnchor="middle" y="-2" fontSize="9" fontWeight="bold" fill={net ? "#00f48e" : "var(--phosphor-faint)"} fontFamily="'Space Mono', monospace">
          INTERNET
        </text>
        <text textAnchor="middle" y="10" fontSize="7.5" fill="var(--phosphor-muted)" fontFamily="'Space Mono', monospace">
          8.8.8.8
        </text>
      </g>
    </svg>
  );
}

/* ---------------- terminal ---------------- */

export default function CliLab() {
  const engineRef = useRef<CliEngine | null>(null);
  if (!engineRef.current) engineRef.current = new CliEngine();
  const engine = engineRef.current;

  const [lines, setLines] = useState<Line[]>([
    { text: "teaching-cli v0.1 — NOT an emulator: a scripted scenario that answers like IOS", kind: "sys" },
    { text: "--- console attached to PC1 ---", kind: "sys" },
    ...BOOT.PC1.map((t) => ({ text: t, kind: "out" as const })),
  ]);
  const [input, setInput] = useState("");
  const [tick, setTick] = useState(0);
  const historyRef = useRef<string[]>([]);
  const histIdxRef = useRef(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useMemo(() => {
    engine.onMission = (id) => {
      setLines((ls) => [
        ...ls,
        {
          text:
            id === 1
              ? "*** MISSION 1 COMPLETE — PC1 reaches SRV1. The intranet lives. ***"
              : "*** MISSION 2 COMPLETE — PC1 reaches 8.8.8.8. Full connectivity restored. ***",
          kind: "mission",
        },
      ]);
    };
  }, [engine]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const submit = () => {
    const raw = input;
    const echo: Line = { text: `${engine.prompt()}${raw}`, kind: "cmd" };
    historyRef.current.unshift(raw);
    histIdxRef.current = -1;
    const result = engine.exec(raw);
    if (result.length === 1 && result[0].text === "__CLEAR__") {
      setLines([]);
    } else {
      setLines((ls) => [...ls, echo, ...result]);
    }
    setInput("");
    setTick((t) => t + 1);
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "Tab") {
      e.preventDefault();
      const r = engine.complete(input);
      setInput(r.next);
      if (r.list && r.list.length) {
        setLines((ls) => [
          ...ls,
          { text: `${engine.prompt()}${input}`, kind: "cmd" },
          { text: r.list!.join("   "), kind: "sys" },
        ]);
      }
    } else if (e.key === "?") {
      e.preventDefault();
      const opts = engine.question(input);
      setLines((ls) => [
        ...ls,
        { text: `${engine.prompt()}${input}?`, kind: "cmd" },
        ...(opts.length
          ? opts.map((o) => ({ text: `  ${o.tok.padEnd(16)}${o.desc}`, kind: "sys" as const }))
          : [{ text: "% Unrecognized command", kind: "err" as const }]),
      ]);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const h = historyRef.current;
      if (h.length) {
        histIdxRef.current = Math.min(histIdxRef.current + 1, h.length - 1);
        setInput(h[histIdxRef.current]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const h = historyRef.current;
      if (histIdxRef.current > 0) {
        histIdxRef.current--;
        setInput(h[histIdxRef.current]);
      } else {
        histIdxRef.current = -1;
        setInput("");
      }
    }
  };

  const attach = (d: DeviceId) => {
    engine.device = d;
    engine.mode = "exec";
    setTick((t) => t + 1);
    setLines((ls) => [
      ...ls,
      { text: `--- console attached to ${d} ---`, kind: "sys" },
      ...BOOT[d].map((t) => ({ text: t, kind: "out" as const })),
    ]);
  };

  const reset = () => {
    engine.reset();
    setLines([
      { text: "--- lab reset to the broken state ---", kind: "sys" },
      { text: "--- console attached to PC1 ---", kind: "sys" },
      ...BOOT.PC1.map((t) => ({ text: t, kind: "out" as const })),
    ]);
    setInput("");
    setTick((t) => t + 1);
  };

  const lineCls: Record<string, string> = {
    cmd: "text-phosphor-bright",
    out: "text-phosphor-muted",
    err: "text-phosphor-faint",
    ok: "text-phosphor",
    sys: "text-phosphor-faint",
    mission: "text-phosphor-bright glow-soft",
  };

  const m1 = srvPathUp(engine.st);
  const m2 = internetPathUp(engine.st);
  void tick;

  return (
    <div>
      <SectionHead
        index="06 :: CLI LAB"
        title="Your turn at the console"
        sub="A scripted scenario — not an emulator. The office network below is broken in two places. Switch consoles, interrogate the devices with show commands, and fix the configuration like you would on real gear. Tab completes, ? explains, ↑ recalls history."
      />

      {/* missions */}
      <div className="grid gap-3 md:grid-cols-2 mb-4">
        {[
          {
            id: 1,
            title: "mission 1 :: restore the intranet",
            body: "Staff report PC1 cannot reach SRV1 (192.168.20.10). Start on PC1: ping, tracert. Then console into SW1 and hunt.",
            done: m1,
          },
          {
            id: 2,
            title: "mission 2 :: restore internet access",
            body: "Intranet fixed? PC1 still can't reach 8.8.8.8. The trace dies at the firewall hop — inspect FW1's access list.",
            done: m2,
          },
        ].map((m) => (
          <div key={m.id} className={`terminal-frame p-4 ${m.done ? "border-phosphor" : ""}`}>
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em]">
              <span
                className={`inline-block h-2 w-2 ${
                  m.done ? "bg-[var(--phosphor)] pulse-dot" : "bg-[var(--phosphor-faint)]"
                }`}
              />
              <span className={m.done ? "text-phosphor-bright" : "text-phosphor-muted"}>
                {m.title}
              </span>
              <span className="ml-auto text-phosphor-faint">{m.done ? "SOLVED" : "PENDING"}</span>
            </p>
            <p className="mt-2 text-xs md:text-sm leading-relaxed text-phosphor-muted">{m.body}</p>
          </div>
        ))}
      </div>

      {/* topology */}
      <div className="terminal-frame mb-4 px-2 py-1">
        <p className="px-2 pt-2 text-[10px] tracking-[0.25em] uppercase text-phosphor-faint">
          topology — live
        </p>
        <Topology st={engine.st} />
      </div>

      {/* console tabs */}
      <div className="flex flex-wrap gap-2 mb-2">
        {DEVICES.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => attach(d.id)}
            aria-pressed={engine.device === d.id}
            className={`min-h-11 border px-4 text-xs uppercase tracking-widest cursor-pointer transition-colors duration-150
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
              ${
                engine.device === d.id
                  ? "border-phosphor bg-[rgba(0,244,142,0.16)] text-phosphor-bright"
                  : "border-phosphor-dim text-phosphor-muted hover:border-phosphor hover:text-phosphor"
              }`}
          >
            {d.id}
            <span className="ml-2 hidden md:inline text-[9px] text-phosphor-faint">{d.role}</span>
          </button>
        ))}
        <span className="ml-auto">
          <ControlButton label="Reset lab" onClick={reset}>
            {IconRestart}
          </ControlButton>
        </span>
      </div>

      {/* terminal */}
      <div
        className="terminal-frame cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        <div
          ref={scrollRef}
          aria-live="polite"
          className="h-72 md:h-80 overflow-y-auto px-3 md:px-4 py-3 text-[11px] md:text-xs leading-5 whitespace-pre-wrap break-words"
        >
          {lines.map((l, i) => (
            <p key={i} className={lineCls[l.kind]}>
              {l.text}
            </p>
          ))}
          <div className="flex items-center">
            <span className="text-phosphor-bright shrink-0">{engine.prompt()}</span>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              aria-label="CLI input"
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              className="flex-1 bg-transparent border-none outline-none text-phosphor-bright caret-[#00f48e] min-w-8"
            />
          </div>
        </div>
        <div className="border-t border-phosphor-dim px-4 py-2 text-[10px] tracking-[0.2em] uppercase text-phosphor-faint">
          tab complete · ? help · ↑ history · type "help" · clear = wipe screen
        </div>
      </div>

      <p className="mt-4 text-xs md:text-sm text-phosphor-faint leading-relaxed">
        Stuck? Mission 1: compare <span className="text-phosphor-muted">show vlan brief</span> and{" "}
        <span className="text-phosphor-muted">show interfaces status</span> on SW1 — one port tells
        on itself. Mission 2: on FW1, <span className="text-phosphor-muted">show access-lists</span>{" "}
        — first match wins, so remove the offending rule with{" "}
        <span className="text-phosphor-muted">no access-list 101 deny icmp any any</span>.
      </p>
    </div>
  );
}
