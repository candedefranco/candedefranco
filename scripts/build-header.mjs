// Generates the blueprint-style header in dark and light variants.
// Usage: node scripts/build-header.mjs
import { writeFileSync, mkdirSync } from "node:fs";

const THEMES = {
  dark: {
    bg: "#0a1628", minor: "rgba(79,195,247,0.07)", major: "rgba(79,195,247,0.15)",
    fg: "#e6f1ff", muted: "#7f9bbd", accent: "#4fc3f7", face1: 0.22, face2: 0.12, face3: 0.05,
  },
  light: {
    bg: "#f5f8fc", minor: "rgba(21,101,192,0.07)", major: "rgba(21,101,192,0.15)",
    fg: "#0d2240", muted: "#5a7190", accent: "#1565c0", face1: 0.18, face2: 0.1, face3: 0.04,
  },
};

const MONO = `'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;

function header(t) {
  // Zone numbers along the top border, like an engineering drawing sheet
  const zones = Array.from({ length: 8 }, (_, i) => {
    const w = 952 / 8, x = 24 + w * i;
    return `<text x="${x + w / 2}" y="21" class="zone">${i + 1}</text>` +
      (i ? `<line x1="${x}" y1="12" x2="${x}" y2="24" class="thin"/>` : "");
  }).join("");
  const rows = ["A", "B", "C"].map((l, i) => {
    const h = 272 / 3, y = 24 + h * i;
    return `<text x="18" y="${y + h / 2 + 3}" class="zone">${l}</text>` +
      (i ? `<line x1="12" y1="${y}" x2="24" y2="${y}" class="thin"/>` : "");
  }).join("");

  // Isometric cube (the "cloud node")
  const cx = 820, cy = 100, s = 55, k = s * 0.866;
  const top = `${cx},${cy - s} ${cx + k},${cy - s / 2} ${cx},${cy} ${cx - k},${cy - s / 2}`;
  const left = `${cx - k},${cy - s / 2} ${cx},${cy} ${cx},${cy + s} ${cx - k},${cy + s / 2}`;
  const right = `${cx},${cy} ${cx + k},${cy - s / 2} ${cx + k},${cy + s / 2} ${cx},${cy + s}`;

  const traces = [
    { d: `M${cx + k} ${cy - 12} H900 V62 H933`, node: [945, 62], label: "LAMBDA", dur: "2.4s" },
    { d: `M${cx + k} ${cy + 18} H900 V152 H933`, node: [945, 152], label: "S3", dur: "2.9s" },
    { d: `M${cx - k} ${cy} H733`, node: [721, cy], label: "EC2", dur: "2.1s" },
  ];
  const traceSvg = traces.map((tr, i) => `
    <path id="t${i}" d="${tr.d}" class="trace"/>
    <path d="${tr.d}" class="flow"><animate attributeName="stroke-dashoffset" from="24" to="0" dur="1s" repeatCount="indefinite"/></path>
    <circle r="3" class="pulse"><animateMotion dur="${tr.dur}" repeatCount="indefinite"><mpath href="#t${i}"/></animateMotion></circle>
    <circle cx="${tr.node[0]}" cy="${tr.node[1]}" r="11" class="node"/>
    <circle cx="${tr.node[0]}" cy="${tr.node[1]}" r="3.5" class="dot"/>
    <text x="${tr.node[0]}" y="${tr.node[1] + 26}" class="tiny" text-anchor="middle">${tr.label}</text>`).join("");

  const cell = (x, y, w, label, value) =>
    `<text x="${x + 8}" y="${y + 13}" class="label">${label}</text>` +
    `<text x="${x + 8}" y="${y + 31}" class="value">${value}</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 320" width="1000" height="320" role="img" aria-label="Candela De Franco — Software Engineer">
  <defs>
    <pattern id="minor" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="${t.minor}" stroke-width="1"/></pattern>
    <pattern id="major" width="100" height="100" patternUnits="userSpaceOnUse"><rect width="100" height="100" fill="url(#minor)"/><path d="M100 0H0V100" fill="none" stroke="${t.major}" stroke-width="1"/></pattern>
    <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 1L10 5L0 9" fill="none" stroke="${t.accent}" stroke-width="1.5"/></marker>
  </defs>
  <style>
    text { font-family: ${MONO}; }
    .zone { font-size: 8px; fill: ${t.muted}; text-anchor: middle; }
    .thin { stroke: ${t.muted}; stroke-width: 1; }
    .frame { fill: none; stroke: ${t.fg}; stroke-opacity: 0.55; }
    .kicker { font-size: 15px; fill: ${t.accent}; letter-spacing: 3px; }
    .name { font-size: 54px; font-weight: 700; fill: ${t.fg}; }
    .sub { font-size: 15px; fill: ${t.muted}; letter-spacing: 1.5px; }
    .dim { stroke: ${t.accent}; stroke-width: 1; }
    .dimtext { font-size: 11px; fill: ${t.accent}; letter-spacing: 1px; }
    .tiny { font-size: 9px; fill: ${t.muted}; letter-spacing: 1px; }
    .edge { fill: none; stroke: ${t.accent}; stroke-width: 1.5; stroke-linejoin: round; }
    .hidden { fill: none; stroke: ${t.accent}; stroke-width: 1; stroke-dasharray: 4 3; opacity: 0.6; }
    .trace { fill: none; stroke: ${t.accent}; stroke-opacity: 0.35; stroke-width: 1.5; }
    .flow { fill: none; stroke: ${t.accent}; stroke-width: 1.5; stroke-dasharray: 4 8; }
    .pulse { fill: ${t.fg}; }
    .node { fill: ${t.bg}; stroke: ${t.accent}; stroke-width: 1.5; }
    .dot { fill: ${t.accent}; }
    .tb { fill: ${t.bg}; stroke: ${t.fg}; stroke-opacity: 0.55; }
    .tbl { stroke: ${t.fg}; stroke-opacity: 0.35; }
    .label { font-size: 8px; fill: ${t.muted}; letter-spacing: 1px; }
    .value { font-size: 12.5px; fill: ${t.fg}; font-weight: 700; }
  </style>

  <rect width="1000" height="320" fill="${t.bg}"/>
  <rect x="24" y="24" width="952" height="272" fill="url(#major)"/>
  <rect x="12" y="12" width="976" height="296" class="frame"/>
  <rect x="24" y="24" width="952" height="272" class="frame"/>
  ${zones}${rows}

  <!-- Registration marks -->
  <g class="dim" opacity="0.7">
    <path d="M44 44h16M52 36v16"/><circle cx="52" cy="44" r="5" fill="none"/>
  </g>

  <text x="60" y="92" class="kicker">// SOFTWARE ENGINEER</text>
  <text x="60" y="148" class="name" textLength="530" lengthAdjust="spacingAndGlyphs">CANDELA DE FRANCO</text>
  <rect x="600" y="108" width="22" height="44" fill="${t.accent}">
    <animate attributeName="opacity" values="1;1;0;0" keyTimes="0;0.5;0.5;1" dur="1.1s" repeatCount="indefinite"/>
  </rect>

  <!-- Dimension line under the name -->
  <line x1="60" y1="164" x2="60" y2="182" class="dim"/>
  <line x1="590" y1="164" x2="590" y2="182" class="dim"/>
  <line x1="62" y1="176" x2="588" y2="176" class="dim" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
  <rect x="245" y="169" width="160" height="14" fill="${t.bg}"/>
  <text x="325" y="180" class="dimtext" text-anchor="middle">SCALE: ∞  (SEE NOTE 1)</text>

  <text x="60" y="218" class="sub">CLEAN CODE · CLOUD · SYSTEMS THAT SCALE</text>
  <text x="60" y="270" class="tiny">NOTE 1: ALL SYSTEMS DESIGNED TO SCALE HORIZONTALLY.</text>
  <text x="60" y="284" class="tiny">SOFTWARE ENGINEERING — UNIVERSIDAD AUSTRAL — CLASS OF 2028</text>

  <!-- Cloud node schematic -->
  <polygon points="${top}" fill="${t.accent}" fill-opacity="${t.face1}" class="edge"/>
  <polygon points="${left}" fill="${t.accent}" fill-opacity="${t.face2}" class="edge"/>
  <polygon points="${right}" fill="${t.accent}" fill-opacity="${t.face3}" class="edge"/>
  <path d="M${cx - k} ${cy + s / 2} L${cx} ${cy} M${cx} ${cy - s} V${cy}" class="hidden"/>
  ${traceSvg}
  <line x1="${cx - k}" y1="${cy + s + 12}" x2="${cx - k}" y2="${cy + s + 30}" class="dim"/>
  <line x1="${cx + k}" y1="${cy + s + 12}" x2="${cx + k}" y2="${cy + s + 30}" class="dim"/>
  <line x1="${cx - k + 2}" y1="${cy + s + 24}" x2="${cx + k - 2}" y2="${cy + s + 24}" class="dim" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
  <text x="${cx}" y="${cy + s + 20}" class="dimtext" text-anchor="middle">CLOUD</text>

  <!-- Title block -->
  <rect x="640" y="216" width="336" height="80" class="tb"/>
  <path d="M640 256H976M840 216V256M760 256V296M850 256V296M910 256V296" class="tbl"/>
  ${cell(640, 216, 200, "TITLE", "GITHUB PROFILE")}
  ${cell(840, 216, 136, "DWG NO.", "CDF-001")}
  ${cell(640, 256, 120, "DRAWN BY", "C. DE FRANCO")}
  ${cell(760, 256, 90, "SCALE", "1:1")}
  ${cell(850, 256, 60, "REV", "2026")}
  ${cell(910, 256, 66, "SHEET", "1/1")}
</svg>
`;
}

mkdirSync("assets", { recursive: true });
for (const [name, t] of Object.entries(THEMES)) writeFileSync(`assets/header-${name}.svg`, header(t));
console.log("ok");
