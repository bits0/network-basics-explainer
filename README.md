# Network Basics — Interactive Explainer

An interactive, animated web explainer for **network fundamentals and the OSI & TCP/IP models**, designed for complete beginners. Styled as a phosphor-green CRT terminal.

## Features

- **Packet switching simulation** — animated mesh network showing packets taking different routes and reassembling at the destination
- **Encapsulation animation** — a 9-stage walkthrough of headers (TCP → IP → frame → FCS) being added down the sender's stack and stripped up the receiver's, with play / pause / step / speed controls
- **TCP three-way handshake** — animated SYN / SYN-ACK / ACK exchange with per-endpoint state badges (CLOSED → LISTEN → ESTABLISHED)
- **OSI model explorer** — clickable 7-layer stack with PDUs, protocols, and a mnemonic helper
- **OSI ↔ TCP/IP mapping** — interactive diagram showing how the two models align
- **Teaching CLI lab** — a scenario-based command-line demo (not a real emulator): configure a switch and firewall with IOS-style commands, tab-completion, `?` context help, and two scripted troubleshooting missions with a live topology view
- **Quiz** — self-check questions with explanations

## Tech stack

- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Canvas animations (devicePixelRatio-aware, `IntersectionObserver`-gated, `prefers-reduced-motion` support)

## Getting started

```bash
npm install
npm run dev      # dev server
npm run build    # production build → dist/
npm run preview  # preview the production build
```

## Project layout

```
src/
├── sections/        # page sections (Hero, PacketSwitching, Encapsulation,
│                    #  Handshake, OsiExplorer, TcpIpMap, CliLab, Quiz)
├── components/      # shared terminal-styled UI components
├── hooks/           # useInView, useReducedMotion
└── lib/             # layers data, quiz data, CLI engine
```

## Notes

The CLI lab is a scripted teaching scenario — connectivity is computed from scenario state, not emulated. It's meant to present concepts, not to replace GNS3 / EVE-NG / Packet Tracer.
