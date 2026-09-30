// Builds an oscilloscope-style contribution chart from the GitHub GraphQL API.
// Usage: GITHUB_TOKEN=... GITHUB_USER=candedefranco node scripts/build-telemetry.mjs [outDir]
import { writeFileSync, mkdirSync } from "node:fs";

const user = process.env.GITHUB_USER || "candedefranco";
const token = process.env.GITHUB_TOKEN;
const outDir = process.argv[2] || "dist";
if (!token) throw new Error("GITHUB_TOKEN is required");

const query = `query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } }
    }
  }
}`;
const res = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json", "User-Agent": user },
  body: JSON.stringify({ query, variables: { login: user } }),
});
const json = await res.json();
if (json.errors) throw new Error(JSON.stringify(json.errors));
const cal = json.data.user.contributionsCollection.contributionCalendar;

const days = cal.weeks.flatMap((w) => w.contributionDays);
const weeks = cal.weeks.map((w) => ({
  start: w.contributionDays[0].date,
  total: w.contributionDays.reduce((a, d) => a + d.contributionCount, 0),
}));

// Streaks (today with zero contributions doesn't break the current streak yet)
let longest = 0, run = 0;
for (const d of days) { run = d.contributionCount ? run + 1 : 0; longest = Math.max(longest, run); }
let current = 0;
for (let i = days.length - 1; i >= 0; i--) {
  if (days[i].contributionCount) current++;
  else if (i !== days.length - 1) break;
}
const peak = Math.max(...weeks.map((w) => w.total));
const activeDays = days.filter((d) => d.contributionCount).length;

const THEMES = {
  dark: {
    win: "#0d1117", bar: "#161b22", border: "#30363d", grid: "#21262d",
    fg: "#e6edf3", muted: "#8b949e", green: "#7ee787", blue: "#79c0ff", purple: "#d2a8ff",
  },
  light: {
    win: "#ffffff", bar: "#f6f8fa", border: "#d0d7de", grid: "#eaeef2",
    fg: "#1f2328", muted: "#656d76", green: "#1a7f37", blue: "#0969da", purple: "#8250df",
  },
};
const MONO = `'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function chart(t) {
  const X0 = 44, X1 = 640, Y0 = 108, Y1 = 250;
  const W = X1 - X0, H = Y1 - Y0, top = Math.max(peak, 1) * 1.15;
  const pts = weeks.map((w, i) => [X0 + (W * i) / (weeks.length - 1), Y1 - (H * w.total) / top]);

  // Smooth the trace with a Catmull-Rom → Bézier conversion
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1.map((v) => v.toFixed(1)).join(" ")} ${c2.map((v) => v.toFixed(1)).join(" ")} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  const area = `${d} L${X1} ${Y1} L${X0} ${Y1} Z`;

  const grid = [];
  for (let i = 0; i <= 4; i++) { const y = Y0 + (H * i) / 4; grid.push(`<line x1="${X0}" y1="${y}" x2="${X1}" y2="${y}"/>`); }

  const months = [];
  let lastMonth = -1;
  weeks.forEach((w, i) => {
    const m = new Date(w.start + "T00:00:00Z").getUTCMonth();
    if (m !== lastMonth && i > 0) months.push(`<text x="${pts[i][0].toFixed(1)}" y="${Y1 + 18}" class="axis" text-anchor="middle">${MONTHS[m]}</text>`);
    lastMonth = m;
  });

  const stats = [
    ["contributions", `${cal.totalContributions}`, "/ year"],
    ["current_streak", `${current}`, current === 1 ? "day" : "days"],
    ["longest_streak", `${longest}`, longest === 1 ? "day" : "days"],
    ["active_days", `${activeDays}`, "/ 365"],
    ["peak_week", `${peak}`, "contrib"],
  ].map(([k, v, u], i) =>
    `<text x="690" y="${Y0 + 12 + i * 30}" class="t" xml:space="preserve"><tspan fill="${t.blue}" font-weight="700">${k}</tspan><tspan fill="${t.muted}">:${" ".repeat(15 - k.length)}</tspan><tspan fill="${t.fg}" font-weight="700">${v}</tspan><tspan fill="${t.muted}"> ${u}</tspan></text>`).join("\n  ");

  const prompt = (y, cmd) =>
    `<text x="36" y="${y}" class="t" xml:space="preserve"><tspan fill="${t.green}" font-weight="700">candela@austral</tspan><tspan fill="${t.muted}">:</tspan><tspan fill="${t.blue}" font-weight="700">~/telemetry</tspan><tspan fill="${t.muted}">$ </tspan><tspan fill="${t.fg}">${cmd}</tspan></text>`;

  const HT = 292;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 ${HT}" width="1000" height="${HT}" role="img" aria-label="Contribution graph: ${cal.totalContributions} contributions in the last year">
  <defs>
    <linearGradient id="stroke" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${t.blue}"/><stop offset="1" stop-color="${t.purple}"/>
    </linearGradient>
    <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${t.purple}" stop-opacity="0.28"/>
      <stop offset="1" stop-color="${t.blue}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <style>
    .t { font-family: ${MONO}; font-size: 15px; }
    .title { font-family: ${MONO}; font-size: 12px; fill: ${t.muted}; }
    .axis { font-family: ${MONO}; font-size: 11px; fill: ${t.muted}; }
    .grid line { stroke: ${t.grid}; stroke-width: 1; stroke-dasharray: 2 4; }
    .glow { fill: none; stroke: url(#stroke); stroke-width: 7; stroke-opacity: 0.18; }
    .trace { fill: none; stroke: url(#stroke); stroke-width: 2.2; stroke-linejoin: round;
      stroke-dasharray: 1; animation: draw 2.4s ease-out; }
    @keyframes draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
  </style>
  <rect x="1" y="1" width="998" height="${HT - 2}" rx="12" fill="${t.win}" stroke="${t.border}"/>
  <path d="M1 44V13a12 12 0 0 1 12-12h974a12 12 0 0 1 12 12v31z" fill="${t.bar}"/>
  <line x1="1" y1="44" x2="999" y2="44" stroke="${t.border}"/>
  <circle cx="26" cy="22" r="6.5" fill="#ff5f57"/>
  <circle cx="48" cy="22" r="6.5" fill="#febc2e"/>
  <circle cx="70" cy="22" r="6.5" fill="#28c840"/>
  <text x="500" y="26" class="title" text-anchor="middle">candela@austral: ~/telemetry — zsh</text>

  ${prompt(78, "git log --since='1 year ago' | ./plot --weekly")}

  <g class="grid">${grid.join("")}</g>
  <path d="${area}" fill="url(#fill)"/>
  <path id="trace" d="${d}" class="glow"/>
  <path d="${d}" class="trace" pathLength="1"/>
  <circle r="4" fill="${t.fg}"><animateMotion dur="6s" repeatCount="indefinite"><mpath href="#trace"/></animateMotion></circle>
  <text x="${X0}" y="${Y0 - 6}" class="axis">${peak}/wk</text>
  ${months.join("")}

  <line x1="666" y1="${Y0 - 8}" x2="666" y2="${Y1 + 4}" stroke="${t.border}"/>
  ${stats}
</svg>
`;
}

mkdirSync(outDir, { recursive: true });
for (const [name, t] of Object.entries(THEMES)) writeFileSync(`${outDir}/telemetry-${name}.svg`, chart(t));
console.log(`total=${cal.totalContributions} current=${current} longest=${longest} peak=${peak}`);
