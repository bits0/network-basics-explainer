import { type ReactNode } from "react";

/** Section heading: `// 01 :: TITLE` */
export function SectionHead({
  index,
  title,
  sub,
}: {
  index: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="mb-8">
      <p className="text-xs tracking-[0.3em] text-phosphor-faint uppercase">
        {"// "}
        {index}
      </p>
      <h2 className="mt-2 text-2xl md:text-4xl font-bold uppercase tracking-wider glow">
        {title}
      </h2>
      {sub && (
        <p className="mt-3 text-sm md:text-base leading-relaxed text-phosphor-muted max-w-[65ch]">
          {sub}
        </p>
      )}
    </div>
  );
}

/** 44px square transport control with inline SVG icon. */
export function ControlButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="h-11 w-11 shrink-0 grid place-items-center border border-phosphor-dim bg-panel text-phosphor
        transition-colors duration-150 hover:border-phosphor hover:bg-accent
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-void
        active:scale-[0.97] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
    >
      {children}
    </button>
  );
}

export const IconPlay = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
    <path d="M3 1.5v11l9-5.5z" />
  </svg>
);
export const IconPause = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
    <rect x="2.5" y="1.5" width="3" height="11" />
    <rect x="8.5" y="1.5" width="3" height="11" />
  </svg>
);
export const IconRestart = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
    <path d="M12.5 7a5.5 5.5 0 1 1-1.61-3.89" />
    <path d="M12.7 1.2v2.6h-2.6" fill="currentColor" stroke="none" />
  </svg>
);
export const IconStep = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
    <path d="M2 1.5v11l7-5.5z" />
    <rect x="10.5" y="1.5" width="2" height="11" />
  </svg>
);

/** One packet header/payload chip. */
export function Chip({
  label,
  tone = "data",
}: {
  label: string;
  tone?: "data" | "tcp" | "ip" | "frame" | "fcs";
}) {
  const styles: Record<string, string> = {
    data: "bg-[rgba(0,244,142,0.18)] text-phosphor-bright border-phosphor",
    tcp: "bg-[rgba(0,244,142,0.10)] text-phosphor border-phosphor-dim",
    ip: "bg-[rgba(0,244,142,0.06)] text-phosphor-muted border-phosphor-dim",
    frame: "bg-transparent text-phosphor-faint border-phosphor-dim border-dashed",
    fcs: "bg-transparent text-phosphor-faint border-phosphor-dim border-dashed",
  };
  return (
    <span
      className={`inline-block border px-1.5 py-0.5 text-[9px] md:text-[10px] leading-none tracking-wider uppercase whitespace-nowrap ${styles[tone]}`}
    >
      {label}
    </span>
  );
}
