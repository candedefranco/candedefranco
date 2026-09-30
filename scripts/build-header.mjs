// Generates the terminal-style (neofetch) header in dark and light variants.
// Usage: node scripts/build-header.mjs
import { writeFileSync, mkdirSync } from "node:fs";

const THEMES = {
  dark: {
    page: "#0d1117", win: "#0d1117", bar: "#161b22", border: "#30363d",
    fg: "#e6edf3", muted: "#8b949e", green: "#7ee787", blue: "#79c0ff", purple: "#d2a8ff", orange: "#ffa657",
    logo: ["#79c0ff", "#79c0ff", "#a5b4fc", "#d2a8ff", "#d2a8ff", "#d2a8ff"],
    swatches: ["#484f58", "#ff7b72", "#7ee787", "#e3b341", "#79c0ff", "#d2a8ff", "#39c5cf", "#e6edf3"],
  },
  light: {
    page: "#ffffff", win: "#ffffff", bar: "#f6f8fa", border: "#d0d7de",
    fg: "#1f2328", muted: "#656d76", green: "#1a7f37", blue: "#0969da", purple: "#8250df", orange: "#bc4c00",
    logo: ["#0969da", "#0969da", "#5a5fd6", "#8250df", "#8250df", "#8250df"],
    swatches: ["#6e7781", "#cf222e", "#1a7f37", "#9a6700", "#0969da", "#8250df", "#1b7c83", "#1f2328"],
  },
};

const MONO = `'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const LOGO = [
  " ██████╗██████╗ ███████╗",
  "██╔════╝██╔══██╗██╔════╝",
  "██║     ██║  ██║█████╗  ",
  "██║     ██║  ██║██╔══╝  ",
  "╚██████╗██████╔╝██║     ",
  " ╚═════╝╚═════╝ ╚═╝     ",
];

const INFO = [
  ["Name", "Candela De Franco"],
  ["Role", "Software Engineer (student)"],
  ["Uni", "Universidad Austral · class of 2028"],
  ["Focus", "full stack · cloud · systems that scale"],
  ["Languages", "TypeScript, Python, Java, Kotlin"],
  ["Cloud", "AWS · Terraform · Docker"],
  ["Community", "Founder @ AWS Student Builder Group"],
  ["Uptime", "building since 2023"],
];

const COMMAND = "neofetch";
const LH = 23;          // line height
const TYPE_START = 0.6; // seconds before typing starts
const CHAR = 0.09;      // seconds per typed character

function header(t) {
  // Reveal via CSS delay; if animations don't run, everything stays visible
  const appear = (begin) => `class="r" style="animation-delay:${begin.toFixed(2)}s"`;
  const prompt = (y, extra) =>
    `<text x="36" y="${y}" class="t" xml:space="preserve"><tspan fill="${t.green}" font-weight="700">candela@austral</tspan><tspan fill="${t.muted}">:</tspan><tspan fill="${t.blue}" font-weight="700">~</tspan><tspan fill="${t.muted}">$ </tspan>${extra}</text>`;

  // Command typed one character at a time
  const typed = [...COMMAND].map((c, i) =>
    `<tspan fill="${t.fg}" class="k" style="animation-delay:${(TYPE_START + i * CHAR).toFixed(2)}s">${c}</tspan>`).join("");
  const outAt = TYPE_START + COMMAND.length * CHAR + 0.35;

  const y0 = 110;
  // Logo drawn cell by cell so it doesn't depend on the font's box-drawing glyphs
  const CW = 11, CH = 22, LX = 44, LY = y0 + 44;
  const SEG = { "═": "lr", "║": "ud", "╔": "rd", "╗": "ld", "╚": "ru", "╝": "lu" };
  const cells = [];
  LOGO.forEach((line, r) => [...line].forEach((ch, c) => {
    const x = LX + c * CW, y = LY + r * CH, color = t.logo[r];
    if (ch === "█") cells.push(`<rect x="${x}" y="${y}" width="${CW + 0.4}" height="${CH + 0.4}" fill="${color}"/>`);
    else if (SEG[ch]) {
      const cx = x + CW / 2, cy = y + CH / 2;
      const to = { l: [x, cy], r: [x + CW, cy], u: [cx, y], d: [cx, y + CH] };
      const d = [...SEG[ch]].map((k) => `M${cx} ${cy}L${to[k][0]} ${to[k][1]}`).join("");
      cells.push(`<path d="${d}" stroke="${color}" stroke-opacity="0.55" stroke-width="2" stroke-linecap="square" fill="none"/>`);
    }
  }));
  const logo = `<g ${appear(outAt)}>${cells.join("")}</g>`;

  const X = 350;
  const title = "candela@austral";
  const lines = [
    `<tspan fill="${t.green}" font-weight="700">candela</tspan><tspan fill="${t.fg}">@</tspan><tspan fill="${t.green}" font-weight="700">austral</tspan>`,
    `<tspan fill="${t.muted}">${"─".repeat(title.length)}</tspan>`,
    ...INFO.map(([k, v]) =>
      `<tspan fill="${t.blue}" font-weight="700">${k}</tspan><tspan fill="${t.muted}">:</tspan><tspan fill="${t.fg}">${" ".repeat(11 - k.length)}${esc(v)}</tspan>`),
  ];
  const info = lines.map((l, i) =>
    `<g ${appear(outAt + 0.06 * i)}><text x="${X}" y="${y0 + i * LH}" class="t" xml:space="preserve">${l}</text></g>`).join("\n  ");

  const swY = y0 + (lines.length + 0.6) * LH;
  const swAt = outAt + 0.06 * lines.length;
  const swatches = t.swatches.map((c, i) =>
    `<rect x="${X + i * 30}" y="${swY - 15}" width="30" height="18" fill="${c}" ${appear(swAt)}></rect>`).join("");

  const endY = swY + 2 * LH;
  const endAt = swAt + 0.3;
  const cursor = `<tspan fill="${t.fg}">▋<animate attributeName="opacity" values="1;1;0;0" keyTimes="0;0.5;0.5;1" dur="1.1s" repeatCount="indefinite"/></tspan>`;
  const H = endY + 30;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 ${H}" width="1000" height="${H}" role="img" aria-label="candela@austral — neofetch: Candela De Franco, Software Engineer">
  <style>
    .t { font-family: ${MONO}; font-size: 15px; }
    .r { animation: show 0s linear both; }
    .k { animation: type 0s linear both; }
    @keyframes show { from { opacity: 0; } to { opacity: 1; } }
    @keyframes type { from { fill-opacity: 0; } to { fill-opacity: 1; } }
    .title { font-family: ${MONO}; font-size: 12px; fill: ${t.muted}; }
  </style>
  <rect x="1" y="1" width="998" height="${H - 2}" rx="12" fill="${t.win}" stroke="${t.border}"/>
  <path d="M1 44V13a12 12 0 0 1 12-12h974a12 12 0 0 1 12 12v31z" fill="${t.bar}"/>
  <line x1="1" y1="44" x2="999" y2="44" stroke="${t.border}"/>
  <circle cx="26" cy="22" r="6.5" fill="#ff5f57"/>
  <circle cx="48" cy="22" r="6.5" fill="#febc2e"/>
  <circle cx="70" cy="22" r="6.5" fill="#28c840"/>
  <text x="500" y="26" class="title" text-anchor="middle">candela@austral: ~ — zsh — 120×32</text>

  ${prompt(78, typed)}
  ${logo}
  ${info}
  ${swatches}
  <g ${appear(endAt)}>${prompt(endY, cursor)}</g>
</svg>
`;
}

mkdirSync("assets", { recursive: true });
for (const [name, t] of Object.entries(THEMES)) writeFileSync(`assets/header-${name}.svg`, header(t));
console.log("ok");
