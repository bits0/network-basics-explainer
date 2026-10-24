export interface OsiLayer {
  n: number;
  name: string;
  pdu: string;
  does: string;
  protocols: string[];
  analogy: string;
}

export const OSI_LAYERS: OsiLayer[] = [
  {
    n: 7,
    name: "Application",
    pdu: "Data",
    does: "Closest to the user. Network-aware apps live here: browsers, mail clients, file transfer. It defines the messages apps exchange, not the app itself.",
    protocols: ["HTTP/HTTPS", "DNS", "SMTP", "FTP", "SSH"],
    analogy: "Writing the letter.",
  },
  {
    n: 6,
    name: "Presentation",
    pdu: "Data",
    does: "The translator. Handles encoding, compression and encryption so two systems speaking different 'dialects' still understand each other.",
    protocols: ["TLS/SSL", "ASCII/UTF-8", "JPEG/MPEG", "gzip"],
    analogy: "Translating & sealing the letter.",
  },
  {
    n: 5,
    name: "Session",
    pdu: "Data",
    does: "The conversation manager. Opens, maintains and closes dialogs between two hosts, and can checkpoint long transfers so they resume after a hiccup.",
    protocols: ["NetBIOS", "RPC", "PPTP", "sockets"],
    analogy: "Deciding who speaks when.",
  },
  {
    n: 4,
    name: "Transport",
    pdu: "Segment",
    does: "End-to-end delivery between processes. TCP adds port numbers, sequence numbers and retransmission (reliable); UDP trades reliability for speed.",
    protocols: ["TCP", "UDP", "QUIC"],
    analogy: "Registered vs. regular mail.",
  },
  {
    n: 3,
    name: "Network",
    pdu: "Packet",
    does: "Logical addressing and routing. IP addresses stamp source and destination; routers examine them and forward the packet hop by hop across networks.",
    protocols: ["IP", "ICMP", "OSPF", "BGP"],
    analogy: "The address on the envelope.",
  },
  {
    n: 2,
    name: "Data Link",
    pdu: "Frame",
    does: "Reliable hop between directly-connected nodes. MAC addresses identify NICs; switches forward frames; errors on the local link get detected here.",
    protocols: ["Ethernet", "Wi-Fi (802.11)", "ARP*", "PPP"],
    analogy: "Getting the envelope across town.",
  },
  {
    n: 1,
    name: "Physical",
    pdu: "Bits",
    does: "Raw bits on the medium: voltages on copper, light pulses in fiber, radio waves in air. Hubs, cables, connectors and radio live here.",
    protocols: ["Cat5/6 cable", "fiber optics", "radio", "USB phys."],
    analogy: "The road the truck drives on.",
  },
];

export const MNEMONIC = [
  "Please",
  "Do",
  "Not",
  "Throw",
  "Sausage",
  "Pizza",
  "Away",
];

export interface TcpIpLayer {
  name: string;
  mapsTo: number[]; // OSI layer numbers
  does: string;
  protocols: string[];
}

export const TCPIP_LAYERS: TcpIpLayer[] = [
  {
    name: "Application",
    mapsTo: [7, 6, 5],
    does: "Everything the app cares about: messages, encoding, sessions — OSI's top three layers folded into one.",
    protocols: ["HTTP", "DNS", "SMTP", "SSH"],
  },
  {
    name: "Transport",
    mapsTo: [4],
    does: "Process-to-process delivery: TCP for reliable ordered streams, UDP for fast fire-and-forget datagrams.",
    protocols: ["TCP", "UDP"],
  },
  {
    name: "Internet",
    mapsTo: [3],
    does: "Addressing and routing packets across interconnected networks — the IP layer that gives the Internet its name.",
    protocols: ["IP", "ICMP", "BGP"],
  },
  {
    name: "Link / Network Access",
    mapsTo: [2, 1],
    does: "Getting frames onto the local medium and across one physical hop: Ethernet, Wi-Fi, MAC addresses, cables and radio.",
    protocols: ["Ethernet", "Wi-Fi", "ARP"],
  },
];

export interface QuizQ {
  q: string;
  options: string[];
  answer: number;
  why: string;
}

export const QUIZ: QuizQ[] = [
  {
    q: "A packet's source and destination IP addresses are added at which OSI layer?",
    options: ["Data Link", "Network", "Transport", "Application"],
    answer: 1,
    why: "Layer 3 (Network) is responsible for logical addressing and routing — that's where the IP header is attached.",
  },
  {
    q: "Which PDU name belongs to the Transport layer?",
    options: ["Frame", "Packet", "Segment", "Bit"],
    answer: 2,
    why: "Transport-layer data units are called segments (TCP) or datagrams (UDP). Packets live at Layer 3, frames at Layer 2.",
  },
  {
    q: "Encapsulation, as data moves DOWN the sender's stack, means…",
    options: [
      "headers are stripped one by one",
      "each layer adds its own header around the data",
      "data is compressed to fit the wire",
      "packets take the shortest route",
    ],
    answer: 1,
    why: "Each layer wraps the payload from above with its own control information — like nested envelopes.",
  },
  {
    q: "The TCP/IP model folds OSI layers 5–7 into which single layer?",
    options: ["Internet", "Transport", "Link", "Application"],
    answer: 3,
    why: "TCP/IP's Application layer covers OSI's Application, Presentation and Session layers.",
  },
  {
    q: "Switches forward frames using ___ addresses; routers forward packets using ___ addresses.",
    options: ["IP / MAC", "MAC / IP", "port / IP", "MAC / port"],
    answer: 1,
    why: "Switches operate at Layer 2 with MAC addresses; routers operate at Layer 3 with IP addresses.",
  },
  {
    q: "UDP is preferred over TCP when…",
    options: [
      "every byte must arrive in order",
      "speed matters more than reliability (live video, DNS)",
      "you need encryption",
      "files are large",
    ],
    answer: 1,
    why: "UDP skips handshakes and retransmission — ideal for real-time traffic where a lost packet is better than a late one.",
  },
];
