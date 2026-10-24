import { useState } from "react";
import { SectionHead } from "../components/terminal";
import { OSI_LAYERS, TCPIP_LAYERS } from "../lib/layers";

type Hl = { side: "osi" | "tcp"; i: number } | null;

/** explicit grid rows aligning TCP/IP layers over the 7 OSI rows */
const TCP_ROW = ["1 / 4", "4 / 5", "5 / 6", "6 / 8"];

export default function TcpIpMap() {
  const [hl, setHl] = useState<Hl>(null);

  const osiActive = (i: number) => {
    if (!hl) return false;
    if (hl.side === "osi") return hl.i === i;
    return TCPIP_LAYERS[hl.i].mapsTo.includes(OSI_LAYERS[i].n);
  };
  const tcpActive = (j: number) => {
    if (!hl) return false;
    if (hl.side === "tcp") return hl.i === j;
    return TCPIP_LAYERS[j].mapsTo.includes(OSI_LAYERS[hl.i].n);
  };

  const base =
    "border px-2 md:px-3 flex flex-col justify-center text-left cursor-pointer transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset";

  return (
    <div>
      <SectionHead
        index="05 :: TCP/IP MODEL"
        title="Same journey, fewer stops"
        sub="TCP/IP is the model the internet actually runs on — older than OSI, and ruthlessly practical. It collapses seven layers into four. Hover or tap either column to see how they map."
      />

      <div className="terminal-frame p-3 md:p-5">
        <div className="grid grid-cols-2 gap-x-4 md:gap-x-10">
          <p className="pb-2 text-center text-[10px] tracking-[0.25em] uppercase text-phosphor-faint">
            osi — 7 layers (reference)
          </p>
          <p className="pb-2 text-center text-[10px] tracking-[0.25em] uppercase text-phosphor-faint">
            tcp/ip — 4 layers (in production)
          </p>
        </div>
        <div
          className="grid grid-cols-2 grid-rows-7 gap-2 min-h-[380px] md:min-h-[440px]"
          onMouseLeave={() => setHl(null)}
        >
          {OSI_LAYERS.map((l, i) => (
            <button
              key={l.n}
              type="button"
              onMouseEnter={() => setHl({ side: "osi", i })}
              onFocus={() => setHl({ side: "osi", i })}
              onClick={() => setHl({ side: "osi", i })}
              style={{ gridColumn: 1, gridRow: i + 1 }}
              className={`${base} row-span-1 ${
                osiActive(i)
                  ? "border-phosphor bg-[rgba(0,244,142,0.14)]"
                  : "border-phosphor-dim bg-[rgba(0,244,142,0.03)]"
              }`}
            >
              <span
                className={`text-[10px] md:text-xs uppercase tracking-widest ${
                  osiActive(i) ? "text-phosphor-bright" : "text-phosphor"
                }`}
              >
                {l.n} · {l.name}
              </span>
            </button>
          ))}
          {TCPIP_LAYERS.map((l, j) => (
            <button
              key={l.name}
              type="button"
              onMouseEnter={() => setHl({ side: "tcp", i: j })}
              onFocus={() => setHl({ side: "tcp", i: j })}
              onClick={() => setHl({ side: "tcp", i: j })}
              style={{
                gridColumn: 2,
                gridRow: TCP_ROW[j],
              }}
              className={`${base} ${
                tcpActive(j)
                  ? "border-phosphor bg-[rgba(0,244,142,0.14)]"
                  : "border-phosphor-dim bg-[rgba(0,244,142,0.03)]"
              }`}
            >
              <span
                className={`text-xs md:text-sm uppercase tracking-widest font-bold ${
                  tcpActive(j) ? "text-phosphor-bright glow-soft" : "text-phosphor"
                }`}
              >
                {l.name}
              </span>
              {l.mapsTo.length > 1 && (
                <span className="mt-1 hidden md:block text-xs leading-relaxed text-phosphor-muted normal-case tracking-normal">
                  {l.does}
                </span>
              )}
              <span className="mt-2 flex flex-wrap gap-1">
                {l.protocols.map((p) => (
                  <span
                    key={p}
                    className="border border-phosphor-dim px-1.5 py-0.5 text-[9px] uppercase text-phosphor-muted"
                  >
                    {p}
                  </span>
                ))}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-center text-xs text-phosphor-muted">
          {hl?.side === "osi"
            ? `OSI L${OSI_LAYERS[hl.i].n} ${OSI_LAYERS[hl.i].name} → lives inside TCP/IP's ${
                TCPIP_LAYERS.find((t) => t.mapsTo.includes(OSI_LAYERS[hl.i].n))
                  ?.name
              } layer`
            : hl?.side === "tcp"
              ? `TCP/IP ${TCPIP_LAYERS[hl.i].name} ← absorbs OSI layer${
                  TCPIP_LAYERS[hl.i].mapsTo.length > 1 ? "s" : ""
                } ${TCPIP_LAYERS[hl.i].mapsTo.join(", ")}`
              : "highlight a layer to trace the mapping"}
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 text-sm leading-relaxed text-phosphor-muted">
        <p>
          <span className="text-phosphor-bright">Why two models?</span> TCP/IP
          grew out of the working ARPANET in the 1970s; OSI arrived later as a
          formal ISO standard. The internet kept TCP/IP — but engineers still
          troubleshoot with OSI vocabulary ("it's a Layer 3 problem").
        </p>
        <p>
          <span className="text-phosphor-bright">How to use both.</span>{" "}
          Design and debug with OSI's seven layers in your head; remember the
          packets on the wire follow TCP/IP's four.
        </p>
      </div>
    </div>
  );
}
