import Hero from "./sections/Hero";
import PacketSwitching from "./sections/PacketSwitching";
import Encapsulation from "./sections/Encapsulation";
import Handshake from "./sections/Handshake";
import OsiExplorer from "./sections/OsiExplorer";
import TcpIpMap from "./sections/TcpIpMap";
import CliLab from "./sections/CliLab";
import Quiz from "./sections/Quiz";

const NAV = [
  { href: "#basics", label: "basics" },
  { href: "#encapsulation", label: "encapsulation" },
  { href: "#handshake", label: "handshake" },
  { href: "#osi", label: "osi" },
  { href: "#tcpip", label: "tcp/ip" },
  { href: "#lab", label: "cli lab" },
  { href: "#quiz", label: "self-check" },
];

export default function App() {
  return (
    <div className="crt-scanlines min-h-dvh">
      {/* top bar */}
      <nav className="fixed inset-x-0 top-0 z-40 border-b border-phosphor-dim bg-[rgba(2,4,3,0.85)] backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 md:px-10 h-12">
          <a
            href="#top"
            className="text-xs font-bold tracking-[0.25em] uppercase glow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            net<span className="text-phosphor-faint">://</span>basics
          </a>
          <div className="ml-auto flex items-center gap-1 md:gap-4 overflow-x-auto">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="px-2 py-2 text-[10px] md:text-xs uppercase tracking-widest text-phosphor-muted
                  transition-colors duration-150 hover:text-phosphor-bright
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {n.label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      <main id="top">
        <Hero />
        <div className="mx-auto max-w-6xl px-5 md:px-10 flex flex-col gap-28 md:gap-40 pb-28">
          <section id="basics" className="scroll-mt-20">
            <PacketSwitching />
          </section>
          <section id="encapsulation" className="scroll-mt-20">
            <Encapsulation />
          </section>
          <section id="handshake" className="scroll-mt-20">
            <Handshake />
          </section>
          <section id="osi" className="scroll-mt-20">
            <OsiExplorer />
          </section>
          <section id="tcpip" className="scroll-mt-20">
            <TcpIpMap />
          </section>
          <section id="lab" className="scroll-mt-20">
            <CliLab />
          </section>
          <section id="quiz" className="scroll-mt-20">
            <Quiz />
          </section>
        </div>
      </main>

      <footer className="border-t border-phosphor-dim">
        <div className="mx-auto max-w-6xl px-5 md:px-10 py-8 flex flex-wrap items-center gap-3 text-[10px] md:text-xs uppercase tracking-[0.25em] text-phosphor-faint">
          <span>EOF — transmission complete</span>
          <span className="ml-auto">
            an interactive explainer · osi &amp; tcp/ip · 100% packets delivered
          </span>
        </div>
      </footer>
    </div>
  );
}
