/* ------------------------------------------------------------------
 * Teaching CLI engine — NOT an emulator.
 * A command parser that mutates a scripted scenario state.
 * ------------------------------------------------------------------ */

export type LineKind = "cmd" | "out" | "err" | "ok" | "sys" | "mission";
export interface Line {
  text: string;
  kind: LineKind;
}

export type DeviceId = "PC1" | "SW1" | "R1" | "FW1";
export type Mode =
  | "exec"
  | "priv"
  | "config"
  | "config-if"
  | "config-vlan";

export interface PortState {
  desc: string;
  mode: "access" | "trunk";
  accessVlan: number;
  allowed: number[];
  shutdown: boolean;
}
export interface IfState {
  ip: string;
  mask: string;
  shutdown: boolean;
}
export interface AclEntry {
  seq: number;
  action: "permit" | "deny";
  proto: string;
}

export interface NetState {
  vlans: Record<number, string>;
  ports: Record<string, PortState>; // SW1
  r1ifs: Record<string, IfState>; // R1
  acl: AclEntry[]; // FW1
}

export const HOSTS: Record<string, string> = {
  "192.168.10.11": "PC1",
  "192.168.20.10": "SRV1",
  "192.168.10.1": "R1 gateway vlan10",
  "192.168.20.1": "R1 gateway vlan20",
  "8.8.8.8": "INTERNET",
};

export function initialState(): NetState {
  return {
    vlans: { 1: "default", 10: "STAFF", 20: "SERVERS" },
    ports: {
      "fa0/1": { desc: "PC1", mode: "access", accessVlan: 10, allowed: [], shutdown: false },
      // MISCONFIGURATION: SRV1's port is shut down
      "fa0/2": { desc: "SRV1", mode: "access", accessVlan: 20, allowed: [], shutdown: true },
      "gi0/1": { desc: "R1", mode: "trunk", accessVlan: 1, allowed: [10, 20], shutdown: false },
    },
    r1ifs: {
      "gi0/0.10": { ip: "192.168.10.1", mask: "255.255.255.0", shutdown: false },
      "gi0/0.20": { ip: "192.168.20.1", mask: "255.255.255.0", shutdown: false },
      "gi0/1": { ip: "203.0.113.2", mask: "255.255.255.252", shutdown: false },
    },
    // MISCONFIGURATION: ICMP is denied before the permit-all
    acl: [
      { seq: 10, action: "permit", proto: "tcp" },
      { seq: 20, action: "deny", proto: "icmp" },
      { seq: 30, action: "permit", proto: "ip" },
    ],
  };
}

/* ---------------- connectivity model ---------------- */

export function staffPathUp(st: NetState): boolean {
  const fa01 = st.ports["fa0/1"];
  const gi01 = st.ports["gi0/1"];
  return (
    !fa01.shutdown &&
    fa01.accessVlan === 10 &&
    !gi01.shutdown &&
    gi01.mode === "trunk" &&
    gi01.allowed.includes(10) &&
    !st.r1ifs["gi0/0.10"].shutdown
  );
}

export function srvPathUp(st: NetState): boolean {
  const fa02 = st.ports["fa0/2"];
  const gi01 = st.ports["gi0/1"];
  return (
    staffPathUp(st) &&
    !st.r1ifs["gi0/0.20"].shutdown &&
    gi01.allowed.includes(20) &&
    !fa02.shutdown &&
    fa02.accessVlan === 20
  );
}

export function icmpPermitted(st: NetState): boolean {
  for (const e of st.acl) {
    if (e.proto === "icmp" || e.proto === "ip") return e.action === "permit";
  }
  return false;
}

export function internetPathUp(st: NetState): boolean {
  return staffPathUp(st) && icmpPermitted(st);
}

/* ---------------- token tree ---------------- */

type ParamKind = "NUM" | "WORD" | "IP" | "IFNAME" | "LINE";
interface Node {
  lit?: string;
  param?: ParamKind;
  desc?: string;
  children?: Node[];
  run?: (args: string[]) => Line[];
}
const L = (
  lit: string,
  desc: string,
  children?: Node[],
  run?: (args: string[]) => Line[]
): Node => ({ lit, desc, children, run });
const P = (
  param: ParamKind,
  desc: string,
  children?: Node[],
  run?: (args: string[]) => Line[]
): Node => ({ param, desc, children, run });

const pad = (s: string, n: number) => (s + " ".repeat(n)).slice(0, n);

/* ---------------- engine ---------------- */

export class CliEngine {
  st: NetState;
  device: DeviceId = "PC1";
  mode: Mode = "exec";
  ifName = "";
  vlanId = 0;
  version = 0; // bumped on every state mutation
  onMission?: (id: 1 | 2) => void;
  private m1 = false;
  private m2 = false;

  constructor() {
    this.st = initialState();
  }

  reset() {
    this.st = initialState();
    this.device = "PC1";
    this.mode = "exec";
    this.m1 = false;
    this.m2 = false;
    this.version++;
  }

  prompt(): string {
    if (this.device === "PC1") return "C:\\Users\\pc1>";
    const d = this.device;
    switch (this.mode) {
      case "exec":
        return `${d}>`;
      case "priv":
        return `${d}#`;
      case "config":
        return `${d}(config)#`;
      case "config-if":
        return `${d}(config-if)#`;
      case "config-vlan":
        return `${d}(config-vlan)#`;
    }
  }

  private touch() {
    this.version++;
    const now1 = srvPathUp(this.st);
    const now2 = internetPathUp(this.st);
    if (now1 && !this.m1) {
      this.m1 = true;
      this.onMission?.(1);
    }
    if (now2 && !this.m2) {
      this.m2 = true;
      this.onMission?.(2);
    }
  }

  missionDone(id: 1 | 2) {
    return id === 1 ? this.m1 : this.m2;
  }

  /* ------------- tree per context ------------- */

  private tree(): Node[] {
    if (this.device === "PC1") return this.pcTree();
    const t: Node[] = [];
    const show = this.showNode();
    if (this.mode === "exec") {
      t.push(L("enable", "Turn on privileged commands", [], () => {
        this.mode = "priv";
        return [];
      }));
      t.push(show);
      t.push(this.pingNode());
      t.push(L("exit", "End session", [], () => [sys("Already at lowest level — pick another console tab to switch device.")]));
    } else if (this.mode === "priv") {
      t.push(
        L("configure", "Enter configuration mode", [
          L("terminal", "Configure from the terminal", [], () => {
            this.mode = "config";
            return [out("Enter configuration commands, one per line. End with 'end'.")];
          }),
        ])
      );
      t.push(show);
      t.push(this.pingNode());
      t.push(L("disable", "Turn off privileged commands", [], () => {
        this.mode = "exec";
        return [];
      }));
      t.push(L("exit", "Leave privileged mode", [], () => {
        this.mode = "exec";
        return [];
      }));
    } else {
      // config modes
      t.push(L("do", "Run an exec command from config mode", [show]));
      t.push(L("exit", "Exit current mode", [], () => this.exitMode()));
      t.push(L("end", "Return to privileged mode", [], () => {
        this.mode = "priv";
        return [];
      }));
      if (this.mode === "config") this.configCommands(t);
      if (this.mode === "config-if") this.ifCommands(t);
      if (this.mode === "config-vlan")
        t.push(
          L("name", "Name the VLAN", [
            P("WORD", "VLAN name", [], (a) => {
              this.st.vlans[this.vlanId] = a[0].toUpperCase();
              this.touch();
              return [];
            }),
          ])
        );
    }
    t.push(L("help", "List commands", [], () => this.helpLines()));
    return t;
  }

  private exitMode(): Line[] {
    if (this.mode === "config-if" || this.mode === "config-vlan") this.mode = "config";
    else if (this.mode === "config") this.mode = "priv";
    return [];
  }

  private configCommands(t: Node[]) {
    if (this.device === "SW1") {
      t.push(
        L("interface", "Select an interface to configure", [
          P("IFNAME", "fa0/1 · fa0/2 · gi0/1", [], (a) => {
            this.ifName = a[0].toLowerCase();
            this.mode = "config-if";
            return [];
          }),
        ])
      );
      t.push(
        L("vlan", "Create/edit a VLAN", [
          P("NUM", "VLAN ID (1-4094)", [], (a) => {
            const n = parseInt(a[0], 10);
            this.vlanId = n;
            this.mode = "config-vlan";
            if (!this.st.vlans[n]) {
              this.st.vlans[n] = `VLAN${String(n).padStart(4, "0")}`;
              this.touch();
              return [out(`% Created VLAN ${n}`)];
            }
            return [];
          }),
        ])
      );
    }
    if (this.device === "R1") {
      t.push(
        L("interface", "Select an interface to configure", [
          P("IFNAME", "gi0/0.10 · gi0/0.20 · gi0/1", [], (a) => {
            this.ifName = a[0].toLowerCase();
            this.mode = "config-if";
            return [];
          }),
        ])
      );
    }
    if (this.device === "FW1") {
      const aclRun = (negate: boolean) =>
        L("access-list", "Edit access list 101", [
          L("101", "Extended list 101", [
            P("WORD", "permit | deny", [
              L("icmp", "ICMP traffic", [
                L("any", "Any source", [
                  L("any", "Any destination", [], (a) => {
                    const action = a[0].toLowerCase();
                    if (action !== "permit" && action !== "deny")
                      return [err(`% Invalid action "${a[0]}" — use permit or deny`)];
                    if (negate) {
                      const before = this.st.acl.length;
                      this.st.acl = this.st.acl.filter(
                        (e) => !(e.action === action && e.proto === "icmp")
                      );
                      this.touch();
                      return before === this.st.acl.length
                        ? [err(`% No matching rule: ${action} icmp any any`)]
                        : [];
                    }
                    const seq = (this.st.acl.at(-1)?.seq ?? 0) + 10;
                    this.st.acl.push({ seq, action, proto: "icmp" });
                    this.touch();
                    return [out(`% Rule appended with sequence ${seq} — remember: first match wins, top to bottom`)];
                  }),
                ]),
              ]),
              L("ip", "All IP traffic", [
                L("any", "Any source", [
                  L("any", "Any destination", [], (a) => {
                    const action = a[0].toLowerCase();
                    if (action !== "permit" && action !== "deny")
                      return [err(`% Invalid action "${a[0]}" — use permit or deny`)];
                    if (negate) {
                      const before = this.st.acl.length;
                      this.st.acl = this.st.acl.filter(
                        (e) => !(e.action === action && e.proto === "ip")
                      );
                      this.touch();
                      return before === this.st.acl.length
                        ? [err(`% No matching rule: ${action} ip any any`)]
                        : [];
                    }
                    const seq = (this.st.acl.at(-1)?.seq ?? 0) + 10;
                    this.st.acl.push({ seq, action, proto: "ip" });
                    this.touch();
                    return [out(`% Rule appended with sequence ${seq} — remember: first match wins, top to bottom`)];
                  }),
                ]),
              ]),
            ]),
          ]),
        ]);
      t.push(aclRun(false));
      t.push(L("no", "Negate a command", [aclRun(true)]));
    }
  }

  private ifCommands(t: Node[]) {
    t.push(L("shutdown", "Shut the interface down", [], () => this.setShut(true)));
    t.push(
      L("no", "Negate a command", [
        L("shutdown", "Bring the interface up", [], () => this.setShut(false)),
      ])
    );
    if (this.device === "SW1") {
      t.push(
        L("switchport", "Set switching characteristics", [
          L("mode", "Set trunking mode", [
            L("access", "Access port", [], () => {
              this.st.ports[this.ifName].mode = "access";
              this.touch();
              return [];
            }),
            L("trunk", "Trunk port", [], () => {
              this.st.ports[this.ifName].mode = "trunk";
              this.touch();
              return [];
            }),
          ]),
          L("access", "Set access characteristics", [
            L("vlan", "Assign VLAN", [
              P("NUM", "VLAN ID", [], (a) => {
                const n = parseInt(a[0], 10);
                if (!this.st.vlans[n]) {
                  this.st.vlans[n] = `VLAN${String(n).padStart(4, "0")}`;
                  this.st.ports[this.ifName].accessVlan = n;
                  this.touch();
                  return [out(`% Access VLAN does not exist. Creating vlan ${n}`)];
                }
                this.st.ports[this.ifName].accessVlan = n;
                this.touch();
                return [];
              }),
            ]),
          ]),
          L("trunk", "Set trunking characteristics", [
            L("allowed", "Set allowed VLANs", [
              L("vlan", "VLAN list", [
                P("LINE", "e.g. 10,20", [], (a) => {
                  const nums = a[0]
                    .split(",")
                    .map((s) => parseInt(s.trim(), 10))
                    .filter((n) => !isNaN(n));
                  if (!nums.length) return [err("% Invalid VLAN list")];
                  this.st.ports[this.ifName].allowed = nums;
                  this.touch();
                  return [];
                }),
              ]),
            ]),
          ]),
        ])
      );
    }
    if (this.device === "R1") {
      t.push(
        L("ip", "Interface Internet Protocol config", [
          L("address", "Set the IP address", [
            P("IP", "A.B.C.D", [
              P("IP", "Subnet mask", [], (a) => {
                this.st.r1ifs[this.ifName].ip = a[0];
                this.st.r1ifs[this.ifName].mask = a[1];
                this.touch();
                return [];
              }),
            ]),
          ]),
        ])
      );
    }
  }

  private setShut(v: boolean): Line[] {
    if (this.device === "SW1") this.st.ports[this.ifName].shutdown = v;
    else if (this.device === "R1") this.st.r1ifs[this.ifName].shutdown = v;
    this.touch();
    return [
      sys(
        `%LINK-5-CHANGED: Interface ${this.ifName}, changed state to ${v ? "administratively down" : "up"}`
      ),
    ];
  }

  /* ------------- show commands ------------- */

  private showNode(): Node {
    const kids: Node[] = [];
    if (this.device === "SW1") {
      kids.push(
        L("vlan", "VLAN information", [
          L("brief", "VLAN summary", [], () => this.showVlanBrief()),
        ], () => this.showVlanBrief())
      );
      kids.push(
        L("interfaces", "Interface status", [
          L("status", "Port status table", [], () => this.showIntStatus()),
        ], () => this.showIntStatus())
      );
      kids.push(L("running-config", "Current configuration", [], () => this.showRunSw()));
    }
    if (this.device === "R1") {
      kids.push(
        L("ip", "IP information", [
          L("interface", "Interface summary", [
            L("brief", "Brief table", [], () => this.showIpIntBrief()),
          ], () => this.showIpIntBrief()),
          L("route", "Routing table", [], () => this.showIpRoute()),
        ])
      );
      kids.push(L("running-config", "Current configuration", [], () => this.showRunR1()));
    }
    if (this.device === "FW1") {
      kids.push(L("access-lists", "List ACLs", [], () => this.showAcl()));
      kids.push(L("running-config", "Current configuration", [], () => this.showRunFw()));
    }
    return L("show", "Show running system information", kids);
  }

  private showVlanBrief(): Line[] {
    const rows = Object.entries(this.st.vlans)
      .map(([id, name]) => {
        const ports = Object.entries(this.st.ports)
          .filter(([, p]) => p.mode === "access" && p.accessVlan === Number(id))
          .map(([n]) => n)
          .join(", ");
        return `${pad(id, 5)}${pad(name, 33)}${pad("active", 10)}${ports}`;
      })
      .sort();
    return [
      out("VLAN Name                             Status    Ports"),
      out("---- -------------------------------- --------- -------------------------------"),
      ...rows.map(out),
    ];
  }

  private showIntStatus(): Line[] {
    const rows = Object.entries(this.st.ports).map(([n, p]) => {
      const status = p.shutdown ? "disabled" : "connected";
      const vlan = p.mode === "trunk" ? "trunk" : String(p.accessVlan);
      return `${pad(n, 7)}${pad(p.desc, 6)}${pad(status, 13)}${pad(vlan, 7)}auto   auto  10/100/1000`;
    });
    return [
      out("Port   Name  Status       Vlan   Duplex Speed Type"),
      ...rows.map(out),
    ];
  }

  private showIpIntBrief(): Line[] {
    const rows = Object.entries(this.st.r1ifs).map(([n, i]) => {
      const s = i.shutdown ? "administratively down" : "up";
      return `${pad(n, 17)}${pad(i.ip, 16)}YES manual ${pad(s, 22)}${s}`;
    });
    return [
      out("Interface         IP-Address     OK? Method Status                 Protocol"),
      ...rows.map(out),
    ];
  }

  private showIpRoute(): Line[] {
    return [
      out("Codes: C - connected, S - static"),
      out(""),
      out(`C    192.168.10.0/24 is directly connected, Gi0/0.10`),
      out(`C    192.168.20.0/24 is directly connected, Gi0/0.20`),
      out(`C    203.0.113.0/30 is directly connected, Gi0/1`),
      out(`S*   0.0.0.0/0 via 203.0.113.1 (FW1)`),
    ];
  }

  private showAcl(): Line[] {
    return [
      out("Extended IP access list 101"),
      ...this.st.acl.map((e) =>
        out(`    ${e.seq} ${e.action} ${e.proto} any any`)
      ),
    ];
  }

  private showRunSw(): Line[] {
    const lines: Line[] = [out("Building configuration..."), out(""), out("Current configuration:")];
    for (const [id, name] of Object.entries(this.st.vlans)) {
      if (Number(id) === 1) continue;
      lines.push(out(`vlan ${id}`), out(` name ${name}`));
    }
    for (const [n, p] of Object.entries(this.st.ports)) {
      lines.push(out("!"), out(`interface ${n}`), out(` description ${p.desc}`));
      if (p.mode === "trunk") {
        lines.push(out(" switchport mode trunk"));
        lines.push(out(` switchport trunk allowed vlan ${p.allowed.join(",")}`));
      } else {
        lines.push(out(" switchport mode access"));
        lines.push(out(` switchport access vlan ${p.accessVlan}`));
      }
      if (p.shutdown) lines.push(out(" shutdown"));
    }
    return lines;
  }

  private showRunR1(): Line[] {
    const lines: Line[] = [out("Building configuration..."), out(""), out("Current configuration:")];
    for (const [n, i] of Object.entries(this.st.r1ifs)) {
      lines.push(out("!"), out(`interface ${n}`), out(` ip address ${i.ip} ${i.mask}`));
      if (i.shutdown) lines.push(out(" shutdown"));
    }
    return lines;
  }

  private showRunFw(): Line[] {
    return [
      out("Building configuration..."),
      out(""),
      out("Current configuration:"),
      ...this.st.acl.map((e) =>
        out(`access-list 101 extended ${e.action} ${e.proto} any any  (seq ${e.seq})`)
      ),
    ];
  }

  /* ------------- ping / traceroute ------------- */

  private pingNode(): Node {
    return L("ping", "Send ICMP echo", [
      P("IP", "Target address", [], (a) => this.ping(a[0])),
    ]);
  }

  ping(target: string): Line[] {
    const lines: Line[] = [out(`Pinging ${target} with 32 bytes of data:`), out("")];
    let ok = false;
    let unreachable = false;
    if (target === "192.168.20.10") {
      const fa02 = this.st.ports["fa0/2"];
      ok = srvPathUp(this.st);
      unreachable = !ok && (fa02.shutdown || !staffPathUp(this.st));
    } else if (target === "8.8.8.8") {
      ok = internetPathUp(this.st);
    } else if (target === "192.168.10.1" || target === "192.168.20.1") {
      ok = staffPathUp(this.st);
    } else if (target === "192.168.10.11") {
      ok = true;
    } else {
      return [err(`Ping request could not find host ${target}.`)];
    }
    if (ok) {
      for (let i = 0; i < 4; i++)
        lines.push(
          ok2(`Reply from ${target}: bytes=32 time${i === 0 ? "<1ms" : "=<1ms"} TTL=${target === "8.8.8.8" ? 116 : 127}`)
        );
      lines.push(out(""), ok2(`Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)`));
    } else {
      for (let i = 0; i < 4; i++)
        lines.push(
          err(
            unreachable
              ? `Reply from 192.168.10.1: Destination host unreachable.`
              : `Request timed out.`
          )
        );
      lines.push(out(""), err(`Packets: Sent = 4, Received = 0, Lost = 4 (100% loss)`));
    }
    this.touch();
    return lines;
  }

  tracert(target: string): Line[] {
    if (target !== "8.8.8.8" && target !== "192.168.20.10")
      return [err(`Unable to resolve target ${target}. Try 8.8.8.8 or 192.168.20.10`)];
    const lines: Line[] = [
      out(`Tracing route to ${HOSTS[target]} [${target}] over a maximum of 30 hops:`),
      out(""),
    ];
    if (!staffPathUp(this.st)) {
      lines.push(err("  1     *        *        *     Request timed out."));
      lines.push(out(""), err("Trace complete — path dies before the gateway. Check SW1."));
      return lines;
    }
    lines.push(ok2("  1    <1 ms   <1 ms   <1 ms  192.168.10.1"));
    if (target === "192.168.20.10") {
      if (srvPathUp(this.st)) {
        lines.push(ok2("  2    <1 ms   <1 ms   <1 ms  192.168.20.10"));
        lines.push(out(""), ok2("Trace complete."));
      } else {
        lines.push(err("  2     *        *        *     Request timed out."));
        lines.push(
          out(""),
          err("Trace complete — the gateway answers, the server doesn't. Check SW1's port to SRV1.")
        );
      }
      return lines;
    }
    if (internetPathUp(this.st)) {
      lines.push(ok2("  2    <1 ms   <1 ms   <1 ms  203.0.113.1"));
      lines.push(ok2("  3     8 ms     9 ms     8 ms  8.8.8.8"));
      lines.push(out(""), ok2("Trace complete."));
    } else {
      lines.push(err("  2     *        *        *     Request timed out."));
      lines.push(
        out(""),
        err("Trace complete — dies at the firewall hop. Check FW1's access list.")
      );
    }
    return lines;
  }

  private pcTree(): Node[] {
    return [
      L("ping", "Send ICMP echo", [
        P("IP", "192.168.20.10 · 8.8.8.8 · 192.168.10.1", [], (a) => this.ping(a[0])),
      ]),
      L("tracert", "Trace route", [
        P("IP", "8.8.8.8 · 192.168.20.10", [], (a) => this.tracert(a[0])),
      ]),
      L("ipconfig", "Show IP configuration", [], () => [
        out("Windows IP Configuration"),
        out(""),
        out("   IPv4 Address. . . . . . . . . . . : 192.168.10.11"),
        out("   Subnet Mask . . . . . . . . . . . : 255.255.255.0"),
        out("   Default Gateway . . . . . . . . . : 192.168.10.1"),
      ]),
      L("help", "List commands", [], () => this.helpLines()),
    ];
  }

  private helpLines(): Line[] {
    const walk = (nodes: Node[], prefix: string, acc: string[]) => {
      for (const n of nodes) {
        const tok = n.lit ?? `<${n.param?.toLowerCase()}>`;
        acc.push(pad(prefix + tok, 34) + (n.desc ?? ""));
        if (n.children) walk(n.children, prefix + tok + " ", acc);
      }
      return acc;
    };
    return [out("Available here:"), ...walk(this.tree(), "", []).map(out)];
  }

  /* ------------- input handling ------------- */

  private matchToken(nodes: Node[], tok: string): { node?: Node; ambiguous?: boolean } {
    const low = tok.toLowerCase();
    const exact = nodes.find((n) => n.lit === low);
    if (exact) return { node: exact };
    const litMatches = nodes.filter((n) => n.lit && n.lit.startsWith(low));
    const paramMatch = nodes.find((n) => n.param && this.paramOk(n.param, tok));
    if (litMatches.length === 1) return { node: litMatches[0] };
    if (litMatches.length > 1) {
      // if all matches share the same full word, treat as one
      const words = new Set(litMatches.map((n) => n.lit));
      if (words.size === 1) return { node: litMatches[0] };
      return { ambiguous: true };
    }
    if (paramMatch) return { node: paramMatch };
    return {};
  }

  private paramOk(kind: ParamKind, tok: string): boolean {
    switch (kind) {
      case "NUM":
        return /^\d+$/.test(tok);
      case "IP":
        return /^\d{1,3}(\.\d{1,3}){3}$/.test(tok);
      case "WORD":
        return /^[A-Za-z][\w.-]*$/.test(tok);
      case "IFNAME":
        return this.ifNames().includes(tok.toLowerCase());
      case "LINE":
        return tok.length > 0;
    }
  }

  ifNames(): string[] {
    if (this.device === "SW1") return Object.keys(this.st.ports);
    if (this.device === "R1") return Object.keys(this.st.r1ifs);
    return [];
  }

  /** execute a raw input line; returns output lines (command echo added by UI) */
  exec(raw: string): Line[] {
    const input = raw.trim();
    if (!input) return [];
    if (input === "clear" || input === "cls") return [{ text: "__CLEAR__", kind: "sys" }];

    const tokens = input.split(/\s+/);
    let nodes = this.tree();
    const args: string[] = [];
    let node: Node | undefined;

    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i];
      // LINE param consumes the rest
      const lineParam = nodes.find((n) => n.param === "LINE");
      if (lineParam) {
        node = lineParam;
        args.push(tokens.slice(i).join(" "));
        nodes = node.children ?? [];
        break;
      }
      const m = this.matchToken(nodes, tok);
      if (m.ambiguous)
        return [err(`% Ambiguous command: "${tokens.slice(0, i + 1).join(" ")}"`)];
      if (!m.node) {
        const caretPad = tokens.slice(0, i).join(" ").length + (i > 0 ? 1 : 0);
        return [
          err(`% Invalid input detected at '^' marker.`),
          err(`${" ".repeat(caretPad)}^`),
        ];
      }
      node = m.node;
      if (node.param) args.push(tok);
      nodes = node.children ?? [];
    }

    if (!node?.run) return [err("% Incomplete command.")];
    return node.run(args);
  }

  /** tab completion: returns new input + optional candidate display */
  complete(input: string): { next: string; list?: string[] } {
    const endsWithSpace = input.endsWith(" ");
    const tokens = input.trim() === "" ? [] : input.trim().split(/\s+/);
    let nodes = this.tree();

    for (let i = 0; i < tokens.length - (endsWithSpace ? 0 : 1); i++) {
      const m = this.matchToken(nodes, tokens[i]);
      if (!m.node) return { next: input };
      nodes = m.node.children ?? [];
    }
    if (endsWithSpace || tokens.length === 0) {
      const list = nodes.map((n) => n.lit ?? `<${n.param?.toLowerCase()}>`);
      return { next: input, list };
    }
    const partial = tokens[tokens.length - 1].toLowerCase();
    const litCands = nodes.filter((n) => n.lit?.startsWith(partial)).map((n) => n.lit!);
    const ifCands =
      litCands.length === 0 && nodes.some((n) => n.param === "IFNAME")
        ? this.ifNames().filter((n) => n.startsWith(partial))
        : [];
    const cands = [...new Set([...litCands, ...ifCands])];
    if (cands.length === 1) {
      const done = [...tokens.slice(0, -1), cands[0]].join(" ") + " ";
      return { next: done };
    }
    if (cands.length > 1) {
      const common = cands.reduce((a, b) => {
        let i = 0;
        while (i < a.length && a[i] === b[i]) i++;
        return a.slice(0, i);
      });
      const grew = common.length > partial.length;
      const next = [...tokens.slice(0, -1), grew ? common : tokens[tokens.length - 1]].join(" ");
      return { next, list: grew ? undefined : cands };
    }
    return { next: input };
  }

  /** '?' help: descriptions for the next token */
  question(input: string): { tok: string; desc: string }[] {
    const tokens = input.trim() === "" ? [] : input.trim().split(/\s+/);
    let nodes = this.tree();
    for (const tok of tokens) {
      const m = this.matchToken(nodes, tok);
      if (!m.node) return [];
      nodes = m.node.children ?? [];
    }
    return nodes.map((n) => ({
      tok: n.lit ?? `<${n.param?.toLowerCase()}>`,
      desc: n.desc ?? "",
    }));
  }
}

const out = (text: string): Line => ({ text, kind: "out" });
const err = (text: string): Line => ({ text, kind: "err" });
const ok2 = (text: string): Line => ({ text, kind: "ok" });
const sys = (text: string): Line => ({ text, kind: "sys" });
