import { useState } from "react";
import { SectionHead } from "../components/terminal";
import { OSI_LAYERS, MNEMONIC } from "../lib/layers";

/** Green lightness ladder — one hue, seven altitudes. */
const ROW_BG = [
  "rgba(0,244,142,0.20)",
  "rgba(0,244,142,0.16)",
  "rgba(0,244,142,0.12)",
  "rgba(0,244,142,0.09)",
  "rgba(0,244,142,0.06)",
  "rgba(0,244,142,0.04)",
  "rgba(0,244,142,0.02)",
];

export default function OsiExplorer() {
  const [sel, setSel] = useState(0); // index into OSI_LAYERS
  const layer = OSI_LAYERS[sel];

  return (
    <div>
      <SectionHead
        index="04 :: OSI MODEL"
        title="Seven layers, one stack"
        sub="The OSI model (1984) is the universal teaching framework: seven layers, each with one job and its own PDU — protocol data unit. Click any layer to inspect it. Read top-down when sending, bottom-up when receiving."
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* the stack */}
        <div
          role="listbox"
          aria-label="OSI layers"
          className="terminal-frame flex flex-col p-2 gap-1"
        >
          {OSI_LAYERS.map((l, i) => {
            const active = i === sel;
            return (
              <button
                key={l.n}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => setSel(i)}
                className={`flex min-h-11 items-center gap-3 border px-3 py-2 text-left cursor-pointer
                  transition-colors duration-150
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset
                  ${active ? "border-phosphor" : "border-transparent hover:border-phosphor-dim"}`}
                style={{ backgroundColor: ROW_BG[i] }}
              >
                <span
                  className={`text-xs w-6 shrink-0 ${
                    active ? "text-phosphor-bright" : "text-phosphor-faint"
                  }`}
                >
                  {l.n}
                </span>
                <span
                  className={`uppercase tracking-widest text-xs md:text-sm ${
                    active ? "text-phosphor-bright glow-soft" : "text-phosphor"
                  }`}
                >
                  {l.name}
                </span>
                <span className="ml-auto hidden sm:inline border border-phosphor-dim px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-phosphor-muted">
                  {l.pdu}
                </span>
              </button>
            );
          })}
          <p className="px-2 pt-2 text-[10px] tracking-[0.2em] uppercase text-phosphor-faint">
            ▲ user-facing · wire-facing ▼
          </p>
        </div>

        {/* detail panel */}
        <div className="terminal-frame p-5 md:p-6 flex flex-col">
          <p className="text-[10px] tracking-[0.3em] uppercase text-phosphor-faint">
            layer {layer.n} — inspector
          </p>
          <h3 className="mt-2 text-xl md:text-2xl font-bold uppercase tracking-wider glow-soft">
            {layer.name}
          </h3>
          <p className="mt-1 text-xs text-phosphor-muted uppercase tracking-widest">
            PDU: <span className="text-phosphor-bright">{layer.pdu}</span>
          </p>
          <p className="mt-4 text-sm md:text-base leading-relaxed text-phosphor-muted">
            {layer.does}
          </p>
          <p className="mt-4 text-xs uppercase tracking-[0.2em] text-phosphor-faint">
            you'll meet here
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {layer.protocols.map((p) => (
              <span
                key={p}
                className="border border-phosphor-dim bg-[rgba(0,244,142,0.06)] px-2 py-1 text-xs text-phosphor"
              >
                {p}
              </span>
            ))}
          </div>
          <p className="mt-auto pt-5 text-xs text-phosphor-faint">
            <span className="text-phosphor-muted">mnemonic echo:</span>{" "}
            {layer.analogy}
          </p>
        </div>
      </div>

      {/* mnemonic strip */}
      <div className="mt-4 terminal-frame px-4 py-3">
        <p className="text-[10px] tracking-[0.3em] uppercase text-phosphor-faint">
          remember it (L7 → L1)
        </p>
        <p className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-sm md:text-base">
          {MNEMONIC.map((w, i) => (
            <button
              key={w}
              type="button"
              onClick={() => setSel(i)}
              className={`cursor-pointer transition-colors duration-150 underline-offset-4
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                ${
                  sel === i
                    ? "text-phosphor-bright underline decoration-[var(--phosphor)]"
                    : "text-phosphor-muted hover:text-phosphor hover:underline"
                }`}
            >
              {w}
            </button>
          ))}
        </p>
      </div>
    </div>
  );
}
