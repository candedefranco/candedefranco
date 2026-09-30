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
  dark: { bg: "#0a1628", screen: "#06101e", grid: "rgba(79,195,247,0.12)", fg: "#e6f1ff", muted: "#7f9bbd", accent: "#4fc3f7" },
  light: { bg: "#f5f8fc", screen: "#eaf1f9", grid: "rgba(21,101,192,0.14)", fg: "#0d2240", muted: "#5a7190", accent: "#1565c0" },
};
const MONO = `'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function chart(t) {
  const X0 = 48, X1 = 688, Y0 = 56, Y1 = 216;
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
  for (let i = 0; i <= 10; i++) { const x = X0 + (W * i) / 10; grid.push(`<line x1="${x}" y1="${Y0}" x2="${x}" y2="${Y1}"/>`); }
  for (let i = 0; i <= 4; i++) { const y = Y0 + (H * i) / 4; grid.push(`<line x1="${X0}" y1="${y}" x2="${X1}" y2="${y}"/>`); }

  const months = [];
  let lastMonth = -1;
  weeks.forEach((w, i) => {
    const m = new Date(w.start + "T00:00:00Z").getUTCMonth();
    if (m !== lastMonth && i > 0) months.push(`<text x="${pts[i][0].toFixed(1)}" y="${Y1 + 16}" class="axis" text-anchor="middle">${MONTHS[m]}</text>`);
    lastMonth = m;
  });

  const readout = (y, label, value, unit) => `
    <text x="724" y="${y}" class="label">${label}</text>
    <text x="724" y="${y + 26}" class="value">${value}<tspan class="unit"> ${unit}</tspan></text>
    <line x1="724" y1="${y + 36}" x2="952" y2="${y + 36}" class="rule"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 260" width="1000" height="260" role="img" aria-label="Contribution telemetry: ${cal.totalContributions} contributions in the last year">
  <defs>
    <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${t.accent}" stop-opacity="0.35"/>
      <stop offset="1" stop-color="${t.accent}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <style>
    text { font-family: ${MONO}; }
    .frame { fill: none; stroke: ${t.fg}; stroke-opacity: 0.55; }
    .grid line { stroke: ${t.grid}; stroke-width: 1; }
    .title { font-size: 10px; fill: ${t.muted}; letter-spacing: 2px; }
    .axis { font-size: 9px; fill: ${t.muted}; letter-spacing: 1px; }
    .glow { fill: none; stroke: ${t.accent}; stroke-width: 6; stroke-opacity: 0.18; }
    .trace { fill: none; stroke: ${t.accent}; stroke-width: 2; stroke-linejoin: round;
      stroke-dasharray: 1; animation: draw 2.4s ease-out; }
    @keyframes draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
    .label { font-size: 9px; fill: ${t.muted}; letter-spacing: 2px; }
    .value { font-size: 22px; font-weight: 700; fill: ${t.fg}; }
    .unit { font-size: 11px; font-weight: 400; fill: ${t.muted}; }
    .rule { stroke: ${t.fg}; stroke-opacity: 0.15; }
  </style>
  <rect width="1000" height="260" fill="${t.bg}"/>
  <rect x="12" y="12" width="976" height="236" class="frame"/>
  <text x="${X0}" y="40" class="title">FIG. 2 — CONTRIBUTION TELEMETRY · LAST 52 WEEKS · CH1 = COMMITS/WEEK</text>

  <rect x="${X0}" y="${Y0}" width="${W}" height="${H}" fill="${t.screen}"/>
  <g class="grid">${grid.join("")}</g>
  <path d="${area}" fill="url(#fill)"/>
  <path id="trace" d="${d}" class="glow"/>
  <path d="${d}" class="trace" pathLength="1"/>
  <circle r="4" fill="${t.fg}"><animateMotion dur="6s" repeatCount="indefinite"><mpath href="#trace"/></animateMotion></circle>
  <rect x="${X0}" y="${Y0}" width="${W}" height="${H}" fill="none" stroke="${t.accent}" stroke-opacity="0.5"/>
  <text x="${X0 + 8}" y="${Y0 + 16}" class="axis">${peak}/wk</text>
  ${months.join("")}

  ${readout(48, "TOTAL / 1Y", cal.totalContributions, "contrib")}
  ${readout(96, "CURRENT STREAK", current, current === 1 ? "day" : "days")}
  ${readout(144, "LONGEST STREAK", longest, longest === 1 ? "day" : "days")}
  ${readout(192, "ACTIVE DAYS", activeDays, "/ 365")}
</svg>
`;
}

mkdirSync(outDir, { recursive: true });
for (const [name, t] of Object.entries(THEMES)) writeFileSync(`${outDir}/telemetry-${name}.svg`, chart(t));
console.log(`total=${cal.totalContributions} current=${current} longest=${longest} peak=${peak}`);
