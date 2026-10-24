import { useEffect, useRef, useState } from "react";
import { SectionHead, ControlButton, IconPlay, IconPause, IconRestart } from "../components/terminal";
import { useInView } from "../hooks/useInView";
import { useReducedMotion } from "../hooks/useReducedMotion";

/* node graph in normalized coords */
const NODES: { id: string; x: number; y: number; kind: "host" | "router" }[] = [
  { id: "A", x: 0.07, y: 0.5, kind: "host" },
  { id: "R1", x: 0.28, y: 0.2, kind: "router" },
  { id: "R2", x: 0.28, y: 0.8, kind: "router" },
  { id: "R3", x: 0.6, y: 0.28, kind: "router" },
  { id: "R4", x: 0.64, y: 0.74, kind: "router" },
  { id: "B", x: 0.93, y: 0.5, kind: "host" },
];
const EDGES: [string, string][] = [
  ["A", "R1"],
  ["A", "R2"],
  ["R1", "R3"],
  ["R1", "R4"],
  ["R2", "R3"],
  ["R2", "R4"],
  ["R3", "B"],
  ["R4", "B"],
];
const PATHS: string[][] = [
  ["A", "R1", "R3", "B"],
  ["A", "R2", "R4", "B"],
  ["A", "R1", "R4", "B"],
  ["A", "R2", "R3", "B"],
];
const NODE = Object.fromEntries(NODES.map((n) => [n.id, n]));
const PATH_MS = 2400;
const STAGGER_MS = 650;
const REST_MS = 1800;

interface PacketState {
  path: string[];
  start: number; // ms offset on the sim clock
}

export default function PacketSwitching() {
  const { ref: viewRef, inView } = useInView<HTMLDivElement>(0.25);
  const reduced = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [arrived, setArrived] = useState(0);

  const stateRef = useRef<{
    clock: number; // simulated ms, only advances while running
    packets: PacketState[];
    running: boolean;
    raf: number;
    lastArrived: number;
    lastNow: number;
  }>({
    clock: 0,
    packets: [],
    running: false,
    raf: 0,
    lastArrived: -1,
    lastNow: 0,
  });

  const freshPackets = (): PacketState[] =>
    PATHS.map((p, i) => ({ path: p, start: i * STAGGER_MS }));

  const reset = (autoplay: boolean) => {
    const s = stateRef.current;
    s.clock = 0;
    s.packets = freshPackets();
    s.running = autoplay && inView;
    s.lastArrived = -1;
    setArrived(0);
    setPlaying(autoplay);
  };

  /* draw loop */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const s = stateRef.current;
    s.packets = freshPackets();
    s.clock = 0;
    s.lastNow = performance.now();

    let cw = 0;
    let ch = 0;
    const fit = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cw = rect.width;
      ch = rect.height;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);

    const pos = (id: string) => ({ x: NODE[id].x * cw, y: NODE[id].y * ch });

    const draw = (now: number) => {
      s.raf = requestAnimationFrame(draw);
      const dt = Math.min(now - s.lastNow, 100);
      s.lastNow = now;
      if (s.running) s.clock += dt;
      const t = s.clock;

      ctx.clearRect(0, 0, cw, ch);

      /* edges */
      for (const [a, b] of EDGES) {
        const pa = pos(a);
        const pb = pos(b);
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.strokeStyle = "rgba(0,244,142,0.16)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      /* packets */
      let arrivedCount = 0;
      let lastDoneAt = 0;
      for (let i = 0; i < s.packets.length; i++) {
        const p = s.packets[i];
        const local = t - p.start;
        if (local < 0) continue;
        const totalSegments = p.path.length - 1;
        const prog = Math.min(local / PATH_MS, 1);
        if (prog >= 1) {
          arrivedCount++;
          lastDoneAt = Math.max(lastDoneAt, p.start + PATH_MS);
          continue;
        }
        const segFloat = prog * totalSegments;
        const seg = Math.min(Math.floor(segFloat), totalSegments - 1);
        const segT = segFloat - seg;
        const a = pos(p.path[seg]);
        const b = pos(p.path[seg + 1]);
        const x = a.x + (b.x - a.x) * segT;
        const y = a.y + (b.y - a.y) * segT;
        /* glow trail */
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(x, y);
        ctx.strokeStyle = "rgba(0,244,142,0.55)";
        ctx.lineWidth = 2;
        ctx.stroke();
        /* packet square */
        ctx.fillStyle = "#00f48e";
        ctx.shadowColor = "rgba(0,244,142,0.9)";
        ctx.shadowBlur = 12;
        const sz = 14;
        ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#020403";
        ctx.font = "bold 9px 'Space Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(i + 1), x, y + 0.5);
      }

      /* nodes */
      for (const n of NODES) {
        const p = pos(n.id);
        ctx.beginPath();
        if (n.kind === "host") {
          ctx.rect(p.x - 9, p.y - 9, 18, 18);
        } else {
          ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
        }
        ctx.fillStyle = "#050b08";
        ctx.fill();
        ctx.strokeStyle = "rgba(0,244,142,0.9)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = n.kind === "host" ? "#00ff3c" : "#57a37e";
        ctx.font = "bold 10px 'Space Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(n.id, p.x, p.y + 0.5);
      }

      /* receiver progress ticks under host B */
      const pb = pos("B");
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.rect(pb.x - 26 + i * 14, pb.y + 22, 10, 6);
        if (i < arrivedCount) {
          ctx.fillStyle = "#00f48e";
          ctx.fill();
        } else {
          ctx.strokeStyle = "rgba(0,244,142,0.3)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      if (arrivedCount !== s.lastArrived) {
        s.lastArrived = arrivedCount;
        setArrived(arrivedCount);
      }

      /* loop after a rest beat */
      if (arrivedCount === 4 && s.running && t > lastDoneAt + REST_MS) {
        s.clock = 0;
        s.packets = freshPackets();
        s.lastArrived = -1;
      }
    };

    s.raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(s.raf);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* gate the sim clock on visibility + play state */
  useEffect(() => {
    stateRef.current.running = playing && inView;
  }, [inView, playing]);

  const toggle = () => {
    if (!playing && arrived === 4) reset(true);
    else setPlaying((p) => !p);
  };

  return (
    <div ref={viewRef}>
      <SectionHead
        index="01 :: NETWORK BASICS"
        title="One message, many roads"
        sub="A network is just connected nodes agreeing to pass data along. Messages don't travel whole — they're chopped into numbered packets, each routed independently across the mesh, then reassembled in order at the destination. Press play and watch four packets find four different roads from host A to host B."
      />
      <div className="terminal-frame">
        <div className="flex items-center justify-between border-b border-phosphor-dim px-4 py-2 text-[10px] tracking-[0.25em] uppercase text-phosphor-faint">
          <span>sim://packet-switching.mesh</span>
          <span className="flex items-center gap-2">
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full bg-[var(--phosphor)] ${
                playing && inView ? "pulse-dot" : "opacity-30"
              }`}
            />
            {reduced ? "static" : playing && inView ? "live" : "paused"}
          </span>
        </div>
        <div className="relative w-full aspect-[16/10] md:aspect-[16/7]">
          {reduced ? (
            <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-phosphor-muted leading-relaxed">
              Static view (reduced motion): packets 1–4 leave host A, travel via
              routers R1–R4 along independent paths, and are reassembled at
              host B.
            </div>
          ) : (
            <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-phosphor-dim px-4 py-3">
          <div className="flex items-center gap-2">
            {!reduced && (
              <>
                <ControlButton label={playing ? "Pause" : "Play"} onClick={toggle}>
                  {playing ? IconPause : IconPlay}
                </ControlButton>
                <ControlButton label="Restart" onClick={() => reset(true)}>
                  {IconRestart}
                </ControlButton>
              </>
            )}
            <span className="ml-2 text-xs text-phosphor-muted">
              reassembled at B:{" "}
              <span className="text-phosphor-bright">{arrived}/4</span>
            </span>
          </div>
          <p className="text-[10px] md:text-xs text-phosphor-faint tracking-wider uppercase">
            ▢ host · ◯ router · each packet picks its own path
          </p>
        </div>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3 text-sm leading-relaxed text-phosphor-muted">
        <p>
          <span className="text-phosphor-bright">Nodes &amp; links.</span>{" "}
          Hosts (your laptop, a server) connect through routers — the
          intersections of the internet.
        </p>
        <p>
          <span className="text-phosphor-bright">Packet switching.</span>{" "}
          Splitting data lets the network route around congestion and share
          links fairly — no dedicated line needed.
        </p>
        <p>
          <span className="text-phosphor-bright">Reassembly.</span> Packets may
          arrive out of order; sequence numbers put them back together. That's
          TCP's job — meet it at Layer 4.
        </p>
      </div>
    </div>
  );
}
