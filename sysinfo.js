const os   = require("os");
const fs   = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const args      = process.argv.slice(2);
const scanRoot  = args.includes("--scan")
  ? args[args.indexOf("--scan") + 1]
  : os.homedir();
const topN      = args.includes("--top")
  ? parseInt(args[args.indexOf("--top") + 1], 10) || 5
  : 5;
const LINE  = "─".repeat(52);
const DLINE = "═".repeat(52);
const fmtBytes = (b) => {
  if (b >= 1e12) return `${(b / 1e12).toFixed(2)} TB`;
  if (b >= 1e9)  return `${(b / 1e9).toFixed(2)} GB`;
  if (b >= 1e6)  return `${(b / 1e6).toFixed(2)} MB`;
  if (b >= 1e3)  return `${(b / 1e3).toFixed(2)} KB`;
  return `${b} B`;
};

const pad = (str, n = 24) => String(str).padEnd(n);
const header = (title) => {
  console.log(`\n╔${DLINE}╗`);
  console.log(`║  ${title.padEnd(50)}║`);
  console.log(`╚${DLINE}╝`);
};
const row = (k, v) => console.log(`  ${pad(k)}  ${v}`);
header("SYSTEM");
const cpus = os.cpus();
const info = {
  "컴퓨터 이름":       os.hostname(),
  "OS":               `${os.type()} ${os.release()} (${os.platform()})`,
  "아키텍처":          os.arch(),
  "사용자":            os.userInfo().username,
  "홈 디렉토리":       os.homedir(),
  "CPU 모델":         cpus[0]?.model ?? "N/A",
  "CPU 코어 수":       `${cpus.length} 코어`,
  "CPU 속도":         `${cpus[0]?.speed ?? "??"} MHz`,
  "총 메모리":         fmtBytes(os.totalmem()),
  "사용 가능 메모리":   fmtBytes(os.freemem()),
  "사용 중 메모리":     fmtBytes(os.totalmem() - os.freemem()),
  "메모리 사용률":      `${((1 - os.freemem() / os.totalmem()) * 100).toFixed(1)} %`,
  "가동 시간":         `${(os.uptime() / 3600).toFixed(1)} 시간`,
  "시스템 시간":       new Date().toLocaleString("ko-KR"),
  "시간대":           Intl.DateTimeFormat().resolvedOptions().timeZone,
  "엔디안":           os.endianness(),
};

for (const [k, v] of Object.entries(info)) row(k, v);
header("DISK USAGE");
try {
  let diskLines = [];
  if (os.platform() === "win32") {
    const raw = execSync(
      "wmic logicaldisk get Caption,Size,FreeSpace,DriveType /format:csv",
      { encoding: "utf8" }
    ).trim().split("\n").filter(Boolean);
    const headers = raw[0].split(",").map(h => h.trim());
    const iCaption   = headers.indexOf("Caption");
    const iSize      = headers.indexOf("Size");
    const iFree      = headers.indexOf("FreeSpace");
    const iType      = headers.indexOf("DriveType");
    for (let i = 1; i < raw.length; i++) {
      const cols  = raw[i].split(",");
      const drive = cols[iCaption]?.trim();
      const total = parseInt(cols[iSize], 10);
      const free  = parseInt(cols[iFree], 10);
      const type  = cols[iType]?.trim();
      if (!drive || isNaN(total) || total === 0) continue;
      const used  = total - free;
      const pct   = ((used / total) * 100).toFixed(1);
      const typeLabel = { "2": "이동식", "3": "고정", "4": "네트워크", "5": "CD-ROM" }[type] ?? type;

      diskLines.push({ drive, total, free, used, pct, typeLabel });
    }
    if (diskLines.length === 0) throw new Error("no data");
    for (const d of diskLines) {
      console.log(`\n  드라이브  ${d.drive}  (${d.typeLabel})`);
      console.log(`  ${LINE}`);
      row("총 용량",    fmtBytes(d.total));
      row("사용 중",    `${fmtBytes(d.used)}  (${d.pct} %)`);
      row("남은 용량",  fmtBytes(d.free));
      const bar = Math.round(d.pct / 5);
      console.log(`\n  [${"█".repeat(bar)}${"░".repeat(20 - bar)}]  ${d.pct} %`);
    }
  } else {
    const raw = execSync("df -k", { encoding: "utf8" }).trim().split("\n");
    const dataRows = raw.slice(1).filter(r =>
      !r.startsWith("map") && !r.includes("tmpfs") && !r.includes("devtmpfs")
    );
    for (const r of dataRows) {
      const cols = r.trim().split(/\s+/);
      if (cols.length < 6) continue;

      const fs_name = cols[0];
      const total   = parseInt(cols[1], 10) * 1024;
      const used    = parseInt(cols[2], 10) * 1024;
      const free    = parseInt(cols[3], 10) * 1024;
      const pct     = parseFloat(cols[4]);
      const mount   = cols[5];

      if (!total || isNaN(total)) continue;

      diskLines.push({ fs_name, total, used, free, pct, mount });
    }

    for (const d of diskLines) {
      console.log(`\n  마운트  ${d.mount}  (${d.fs_name})`);
      console.log(`  ${LINE}`);
      row("총 용량",    fmtBytes(d.total));
      row("사용 중",    `${fmtBytes(d.used)}  (${d.pct} %)`);
      row("남은 용량",  fmtBytes(d.free));

      const barLen = Math.min(Math.round(d.pct / 5), 20);
      console.log(`\n  [${"█".repeat(barLen)}${"░".repeat(20 - barLen)}]  ${d.pct} %`);
    }
  }
} catch (e) {
  console.log(`  디스크 정보를 가져올 수 없음: ${e.message}`);
}
header("NETWORK");
const nets = os.networkInterfaces();
for (const [name, addrs] of Object.entries(nets)) {
  for (const addr of addrs) {
    if (addr.internal) continue;
    row(name, `${addr.family.padEnd(6)}  ${addr.address}`);
  }
}
header(`TOP ${topN} LARGEST FILES  (스캔: ${scanRoot})`);
console.log(`  잠시 기다려 주세요...`);
/**
 * @param {string} dir
 * @param {Array}  results
 * @param {number} depth
 */
const SKIP_DIRS = new Set([
  "node_modules", ".git", "proc", "sys", "dev",
  "$Recycle.Bin", "Windows", "System Volume Information",
]);

function scanDir(dir, results = [], depth = 8) {
  if (depth < 0) return results;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const e of entries) {
    if (e.isSymbolicLink()) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      scanDir(full, results, depth - 1);
    } else if (e.isFile()) {
      try {
        const { size } = fs.statSync(full);
        results.push({ path: full, size });
      } catch { /* skip */ }
    }
  }
  return results;
}
const files   = scanDir(scanRoot);
const sorted  = files.sort((a, b) => b.size - a.size).slice(0, topN);
if (sorted.length === 0) {
  console.log("  파일을 찾을 수 없음");
} else {
  console.log();
  sorted.forEach((f, i) => {
    const num   = String(i + 1).padStart(2, " ");
    const size  = fmtBytes(f.size).padStart(10);
    const short = f.path.length > 60
      ? "..." + f.path.slice(-57)
      : f.path;
    console.log(`  ${num}.  ${size}   ${short}`);
  });
}
header("EXTENSION STATS  (스캔 경로 기준)");
const extMap = {};
for (const f of files) {
  const ext = path.extname(f.path).toLowerCase() || "(없음)";
  extMap[ext] = (extMap[ext] ?? 0) + f.size;
}
const extSorted = Object.entries(extMap)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10);
console.log();
for (const [ext, size] of extSorted) {
  row(ext, fmtBytes(size));
}
header("CPU LOAD AVERAGE  (1 / 5 / 15 min)");
const [l1, l5, l15] = os.loadavg();
console.log(`\n  ${l1.toFixed(2)}   /   ${l5.toFixed(2)}   /   ${l15.toFixed(2)}\n`);

console.log(`${"═".repeat(54)}\n`);
