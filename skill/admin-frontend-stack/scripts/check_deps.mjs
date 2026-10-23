#!/usr/bin/env node
/**
 * 检查前端项目的依赖与源码，按三个级别输出：
 *
 *   错误  一定会出问题（编译报错、静默失效），必须修复。
 *   警告  需要人判断：同类依赖重复、已废弃库、新旧包混用。已有项目里可能是历史遗留。
 *   提示  版本提醒与优化建议。
 *
 * 只依赖 Node.js 18+ 自带模块，不需要 npm install，也不需要 Python。
 * 定位：可选的依赖级体检（接手已有项目时用）。日常约束优先用 tsc 与 ESLint，见 references/eslint-rules.md。
 *
 * 用法:
 *   node check_deps.mjs [项目根目录或 package.json]        默认模式
 *   node check_deps.mjs <路径> --strict                    新项目：警告也算失败
 *   node check_deps.mjs <路径> --write-baseline            把当前所有警告登记为"历史遗留"（须先征得用户同意）
 *
 * 例外登记文件 <项目根>/.stackcheck.json:
 *   {
 *     "allow": [{"key": "duplicate:图标库:lucide-react+react-icons", "reason": "迁移中，预计 12 月完成"}],
 *     "ignore_paths": ["src/legacy"]
 *   }
 * 源码中某一行带有注释 stack-check-ignore 时，该行不参与源码扫描。
 *
 * 退出码: 0 = 没有错误（--strict 下也没有警告）；1 = 有错误（--strict 下含警告）。
 */
import fs from "node:fs";
import path from "node:path";

const CONFIG_NAME = ".stackcheck.json";

// 同一类别里出现 2 个及以上 -> 警告
const CATEGORIES = {
  "图标库": ["lucide-react", "react-icons", "@heroicons/react", "@tabler/icons-react",
    "@phosphor-icons/react", "@fortawesome/react-fontawesome"],
  "动画库": ["motion", "framer-motion", "react-spring", "@react-spring/web", "gsap"],
  "状态管理": ["zustand", "redux", "@reduxjs/toolkit", "mobx", "jotai", "recoil", "valtio"],
  "表单库": ["react-hook-form", "formik", "@tanstack/react-form", "react-final-form"],
  "校验库": ["zod", "yup", "joi", "valibot"],
  "UI 组件体系": ["antd", "@mui/material", "@chakra-ui/react", "@mantine/core",
    "@nextui-org/react", "@heroui/react", "primereact"],
  "CSS 方案": ["styled-components", "@emotion/react", "@emotion/styled", "sass", "less"],
  "HTTP 客户端": ["axios", "ky", "ofetch", "superagent"],
  "日期库": ["date-fns", "dayjs", "moment", "luxon"],
  "图表库": ["recharts", "echarts", "chart.js", "@nivo/core", "victory", "@visx/visx"],
  "Toast 通知": ["sonner", "react-hot-toast", "react-toastify", "notistack"],
  "表格库": ["@tanstack/react-table", "react-table", "ag-grid-react", "material-react-table"],
};
const DEPRECATED = {
  "react-beautiful-dnd": "已废弃，改用 dnd-kit",
  "react-table": "v7 已被 @tanstack/react-table 取代",
  "moment": "维护模式，改用 date-fns",
  "@hello-pangea/dnd": "react-beautiful-dnd 的分支，本栈统一用 dnd-kit",
};
const DND_LEGACY = new Set(["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities", "@dnd-kit/modifiers"]);
const DND_NEW = new Set(["@dnd-kit/react", "@dnd-kit/dom", "@dnd-kit/helpers", "@dnd-kit/abstract"]);

// Lucide v1 已删除的品牌图标（在 lucide-react 1.61 实测缺失）
const REMOVED_LUCIDE_BRANDS = new Set([
  "Github", "Gitlab", "Slack", "Figma", "Facebook", "Instagram", "Linkedin", "Twitter",
  "Youtube", "Twitch", "Trello", "Chrome", "Chromium", "Codepen", "Codesandbox",
  "Dribbble", "Framer", "Pocket", "RailSymbol",
]);
const SRC_EXT = new Set([".ts", ".tsx", ".js", ".jsx"]);
const SKIP_DIRS = new Set(["node_modules", "dist", "build", ".next", ".git", "coverage"]);
const IGNORE_MARK = "stack-check-ignore";
const LUCIDE_IMPORT = /import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*["']lucide-react["']/g;
const DYNAMIC_CLASS = /`[^`\n]*\b(?:bg|text|border|ring|fill|stroke|from|to|via)-\$\{/;
const IMPORT_SPEC = /(?:from\s*|import\s*\(?\s*|require\(\s*)["']([^"'./][^"']*)["']/g;

const ERROR = "错误", WARN = "警告", INFO = "提示";

const finding = (level, key, msg) => ({ level, key, msg });

function pkgOf(spec) {
  const parts = spec.split("/");
  return spec.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

function major(ver) {
  const m = String(ver).match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

function* walk(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else yield full;
  }
}

/** 返回 { findings, count, usage }：源码发现、扫描文件数、各包被引用的文件数。 */
function scanSource(root, ignorePaths) {
  const findings = [];
  const usage = new Map();
  let count = 0;
  const src = path.join(root, "src");
  if (!fs.existsSync(src) || !fs.statSync(src).isDirectory()) return { findings, count, usage };

  for (const file of walk(src)) {
    if (!SRC_EXT.has(path.extname(file))) continue;
    const rel = path.relative(root, file).split(path.sep).join("/");
    if (ignorePaths.some((ip) => rel === ip || rel.startsWith(ip.replace(/\/+$/, "") + "/"))) continue;
    let text;
    try { text = fs.readFileSync(file, "utf-8"); } catch { continue; }
    count++;

    const seen = new Set();
    for (const m of text.matchAll(IMPORT_SPEC)) seen.add(pkgOf(m[1]));
    for (const p of seen) usage.set(p, (usage.get(p) || 0) + 1);

    const lines = text.split(/\r?\n/);
    for (const m of text.matchAll(LUCIDE_IMPORT)) {
      const lineNo = text.slice(0, m.index).split("\n").length;
      if ((lines[lineNo - 1] || "").includes(IGNORE_MARK)) continue;
      const names = new Set(m[1].split(",").map((n) => n.trim().split(" as ")[0].trim()).filter(Boolean));
      const bad = [...names].filter((n) => REMOVED_LUCIDE_BRANDS.has(n)).sort();
      if (bad.length) {
        findings.push(finding(ERROR, `brand-icon:${rel}`,
          `${rel}:${lineNo} 从 lucide-react 导入了 v1 已删除的品牌图标 ${bad.join(", ")}` +
          "（会编译报错），请改用 simple-icons 或官方 SVG"));
      }
    }
    lines.forEach((line, i) => {
      // 纯注释行不检查：示例代码里常有"不能写成 `bg-${tone}`"这类提醒，会被误报
      const t = line.trimStart();
      if (t.startsWith("//") || t.startsWith("/*") || t.startsWith("*") || t.startsWith("{/*")) return;
      if (DYNAMIC_CLASS.test(line) && !line.includes(IGNORE_MARK)) {
        findings.push(finding(ERROR, `dynamic-class:${rel}:${i + 1}`,
          `${rel}:${i + 1} Tailwind 不识别拼接的类名（会静默失效），请改用完整类名的映射表`));
      }
    });
  }
  return { findings, count, usage };
}

function analyze(deps, usage, hasSrc) {
  const names = new Set(Object.keys(deps));
  const out = [];
  const used = (libs) => hasSrc
    ? libs.map((l) => `${l}（${usage.get(l) || 0} 个文件引用）`).join(", ")
    : libs.join(", ");

  for (const [cat, libs] of Object.entries(CATEGORIES)) {
    const found = libs.filter((l) => names.has(l));
    if (found.length < 2) continue;
    if (cat === "CSS 方案" && found.every((l) => l === "sass" || l === "less")) {
      out.push(finding(INFO, `duplicate:${cat}`,
        `${cat}：使用了预处理器 ${found.join(", ")}，与 Tailwind 并存时请确认确有必要`));
      continue;
    }
    const extra = cat === "动画库" ? "（motion 即 framer-motion 的新名称）" : "";
    let hint = "";
    if (hasSrc) {
      const unused = found.filter((l) => !usage.get(l));
      if (unused.length) hint = `；${unused.join(", ")} 在 src 中没有被引用，可能是多余依赖`;
    }
    out.push(finding(WARN, `duplicate:${cat}:` + [...found].sort().join("+"),
      `${cat}：同时存在 ${used(found)}${extra}${hint}。新代码只用一个；已有项目请判断是否为迁移中的历史遗留`));
  }

  for (const [lib, why] of Object.entries(DEPRECATED)) {
    if (names.has(lib)) out.push(finding(WARN, `deprecated:${lib}`, `${lib}：${why}`));
  }

  if ([...names].some((n) => DND_LEGACY.has(n)) && [...names].some((n) => DND_NEW.has(n))) {
    out.push(finding(WARN, "dnd-mix",
      "dnd-kit 新旧两套包并存（@dnd-kit/core 系 与 @dnd-kit/react 系），新代码请沿用其中一套"));
  }

  const rr = deps["react-resizable-panels"];
  if (rr && (major(rr) ?? 0) < 4) {
    out.push(finding(INFO, "info:resizable",
      `react-resizable-panels 为 ${rr}：v4 起导出名已改（Group/Separator），请按项目实际版本写`));
  }
  const rt = deps["@tanstack/react-table"];
  if (rt && major(rt) !== null) {
    out.push(finding(INFO, "info:table",
      `@tanstack/react-table 为 ${rt}：v8 用 useReactTable，v9 用 useTable + tableFeatures，两套 API 不兼容`));
  }
  if (names.has("zustand") && !names.has("@tanstack/react-query") &&
      ["axios", "ky", "ofetch"].some((k) => names.has(k))) {
    out.push(finding(INFO, "info:zustand-fetch",
      "有 HTTP 客户端但没有 @tanstack/react-query，请确认接口数据没有被塞进 zustand"));
  }
  return out;
}

function main() {
  const args = process.argv.slice(2);
  const strict = args.includes("--strict");
  const writeBaseline = args.includes("--write-baseline");
  const target = args.find((a) => !a.startsWith("--")) ?? ".";

  const isDir = fs.existsSync(target) && fs.statSync(target).isDirectory();
  const root = isDir ? target : path.dirname(target);
  const pkgFile = isDir ? path.join(target, "package.json") : target;
  if (!fs.existsSync(pkgFile)) {
    console.error(`找不到 package.json: ${pkgFile}`);
    return 2;
  }
  const pkg = JSON.parse(fs.readFileSync(pkgFile, "utf-8"));
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

  const cfgPath = path.join(root, CONFIG_NAME);
  const cfg = fs.existsSync(cfgPath) ? JSON.parse(fs.readFileSync(cfgPath, "utf-8")) : {};
  const allow = new Map((cfg.allow || []).map((e) => [e.key, e.reason || ""]));

  const { findings: srcFindings, count, usage } = scanSource(root, cfg.ignore_paths || []);
  const findings = [...analyze(deps, usage, count > 0), ...srcFindings];

  if (writeBaseline) {
    const fresh = findings.filter((f) => f.level === WARN && !allow.has(f.key));
    cfg.allow = cfg.allow || [];
    const today = new Date().toISOString().slice(0, 10);
    for (const f of fresh) cfg.allow.push({ key: f.key, reason: `历史遗留，${today} 登记；迁移计划待补充` });
    fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + "\n", "utf-8");
    console.log(`已登记 ${fresh.length} 项历史遗留警告到 ${cfgPath}。错误不会被登记，仍需修复。`);
    return 0;
  }

  for (const f of findings) {
    if (f.level === WARN && allow.has(f.key)) {
      f.level = INFO;
      f.msg += `（已登记例外：${allow.get(f.key) || "无说明"}）`;
    }
  }

  const order = { [ERROR]: 0, [WARN]: 1, [INFO]: 2 };
  findings.sort((a, b) => order[a.level] - order[b.level]); // Node >= 11 的排序是稳定的
  const c = { [ERROR]: 0, [WARN]: 0, [INFO]: 0 };
  for (const f of findings) c[f.level]++;

  console.log(`检查: ${pkg.name || "(未命名项目)"}  依赖数: ${Object.keys(deps).length}  扫描源码文件: ${count}` +
    (strict ? "  [strict]" : ""));
  for (const f of findings) console.log(`[${f.level}] ${f.msg}`);
  console.log(`汇总: ${c[ERROR]} 个错误, ${c[WARN]} 个警告, ${c[INFO]} 个提示`);
  const failed = c[ERROR] > 0 || (strict && c[WARN] > 0);
  if (!failed && findings.length === 0) console.log("OK: 未发现问题");
  return failed ? 1 : 0;
}

process.exitCode = main();
