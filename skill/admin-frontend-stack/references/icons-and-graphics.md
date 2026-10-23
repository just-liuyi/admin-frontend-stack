# 图标与图形规范

目标：让图标、插画、Logo 风格统一、颜色跟随主题、不依赖零散的网络素材。

最后核实：2026-10-21（lucide-react 1.61、simple-icons 16.35、vite-plugin-svgr 5.2、@svgr/plugin-svgo 8.1）。文中代码已用 TypeScript 编译验证，视觉效果以人工审核为准。

## 目录
- 总原则
- 图标选用顺序
- 图标色块 IconTile（核心规范）
- 颜色规则
- 自绘图标
- 品牌图标
- SVG 文件的工程处理
- 空状态与错误页插画
- Logo 与 favicon
- 无障碍与尺寸
- 反模式
- 未核实事项

## 总原则

**Lucide 线条图标 + 彩色圆角色块底**，是本栈统一的图形语言。

| 位置 | 样式 | 色块尺寸 |
|---|---|---|
| 登录页、功能入口、空状态等**大位置** | ① 实心色块 + 白线 | `lg`（64px） |
| 仪表盘指标卡、列表、设置项等**小而多的位置** | ② 浅色底 + 彩色线 | `md`（40px）/ `sm`（32px） |
| 按钮内、菜单项、表格操作、输入框前缀 | 不加色块，直接用 Lucide 线条图标，颜色跟随文字 | 16 / 20px |

为什么这样分：大位置需要视觉冲击和个性；小位置数量多，实心色块堆在一起会显得花、抢眼；按钮菜单里的图标要的是清晰，加色块反而干扰。

## 图标选用顺序

1. **先用 Lucide**（`lucide-react`）。它有 1600 多个图标，绝大多数业务概念都能找到。
2. Lucide 没有的**业务专属概念**，才考虑自绘（见「自绘图标」）。
3. **第三方品牌图标**（微信、GitHub 等）：只能用官方素材或 Simple Icons，**绝不自绘**（见「品牌图标」）。
4. 不用 emoji 当图标，不用位图（png/jpg）当图标。

⚠️ **Lucide v1 已删除所有品牌图标**。在 1.61 实测缺失的有：Github、Gitlab、Slack、Figma、Facebook、Instagram、Linkedin、Twitter、Youtube、Twitch、Trello、Chrome、Chromium、Codepen、Codesandbox、Dribbble、Framer、Pocket、RailSymbol。
`import { Github } from "lucide-react"` 在 v1 会直接编译报错（已在 1.61 验证）。AI 凭旧记忆最容易写错这里。

## 图标色块 IconTile（核心规范）

规格：

| size | 色块 | 圆角 | 图标 | 线宽（Lucide 的 strokeWidth） |
|---|---|---|---|---|
| `sm` | 32px | `rounded-lg` | 16px | 2.5 |
| `md` | 40px | `rounded-xl` | 20px | 2.4 |
| `lg` | 64px | `rounded-2xl` | 28px | 2 |

线宽按尺寸微调，是为了让不同尺寸下视觉上都约等于 2px，不会小尺寸发虚。

组件（已编译验证）：

```tsx
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "primary" | "success" | "warning" | "danger";
type Variant = "solid" | "soft";
type Size = "sm" | "md" | "lg";

// ⚠️ Tailwind 只识别完整的类名字符串，不能写成 `bg-${tone}` 这种拼接
const toneClass: Record<Variant, Record<Tone, string>> = {
  solid: {
    primary: "bg-primary text-primary-foreground",
    success: "bg-success text-success-foreground",
    warning: "bg-warning text-warning-foreground",
    danger: "bg-destructive text-white",
  },
  soft: {
    primary: "bg-primary/10 text-primary dark:bg-primary/20",
    success: "bg-success/10 text-success dark:bg-success/20",
    warning: "bg-warning/10 text-warning dark:bg-warning/20",
    danger: "bg-destructive/10 text-destructive dark:bg-destructive/20",
  },
};
const sizeClass: Record<Size, string> = {
  sm: "size-8 rounded-lg [&_svg]:size-4",
  md: "size-10 rounded-xl [&_svg]:size-5",
  lg: "size-16 rounded-2xl [&_svg]:size-7",
};
const strokeBySize: Record<Size, number> = { sm: 2.5, md: 2.4, lg: 2 };

export function IconTile({
  icon: Icon, tone = "primary", variant = "solid", size = "md", className,
}: {
  icon: LucideIcon; tone?: Tone; variant?: Variant; size?: Size; className?: string;
}) {
  return (
    <div className={cn("inline-flex shrink-0 items-center justify-center",
      sizeClass[size], toneClass[variant][tone], className)}>
      <Icon strokeWidth={strokeBySize[size]} aria-hidden="true" />
    </div>
  );
}
```

用法：

```tsx
<IconTile icon={Ticket} variant="solid" size="lg" />            {/* 功能入口 */}
<IconTile icon={ChartNoAxesColumn} variant="soft" size="md" />  {/* 指标卡 */}
<IconTile icon={ShieldCheck} variant="soft" tone="success" size="sm" />
```

放到 `src/components/icon-tile.tsx`，项目里不要再写第二个同类组件。

## 颜色规则

- **默认全部用主色（`tone="primary"`）**，整个后台的色块基本是同一个颜色，这样才协调。
- 只有表达**状态语义**时才换色：成功 `success`、警告 `warning`、出错/危险 `danger`。不要为了"好看"给不同功能分配不同颜色（粉、紫、绿、橙各一个会显得很花）。
- 同一页面里色块的颜色不超过两种：主色 + 一种状态色。
- 浅色底和深色模式：已通过 `bg-primary/10` + `dark:bg-primary/20` 处理；颜色全部来自语义 token，**不写死十六进制色值**，换主题、换品牌色、切换深色都会自动生效。
- 前置条件，缺一不可：
  1. shadcn 默认主题的 `--primary` 接近黑/灰。**必须先把 `--primary` 设成项目的品牌色**，否则色块会是灰色。
  2. `success`、`warning` 在 shadcn 里默认没有。需要在全局 CSS 里定义 `--success`、`--success-foreground`、`--warning`、`--warning-foreground`（深浅色各一套），并映射进 Tailwind 主题。见 `design-tokens.md`。
- 色块上的图标颜色对比度要够：实心底的前景用 `*-foreground`，浅色底用同色系主色，两种模式下都目测检查。

## 自绘图标

仅在 Lucide 没有对应图标时使用。自绘前先在 Lucide 里用多个同义词搜一遍（如 ticket / receipt / file-text）。

规范（与 Lucide 保持一致，这样放在一起不突兀）：
- 24×24 画布，至少留 1px 内边距。
- 线性图标，描边 2px，端点和拐角都是圆角（`round`）。
- 不使用填充，只描边；形状里**不写** `fill`、`stroke`、`stroke-width`（由外层统一控制，才能被 IconTile 和主题接管）。
- 圆角：较大的矩形用 2px 圆角，更小的用 1px。
- 同一图标内元素不要太多，24px 下一眼能认出来。

注册方式（已编译验证）：

```tsx
import { createLucideIcon } from "lucide-react";

export const Stamp = createLucideIcon("Stamp", [
  ["path", { d: "M5 21h14", key: "a" }],
  ["path", { d: "M7 17h10v-3a3 3 0 0 0-2-2.8V8a3 3 0 1 0-6 0v3.2A3 3 0 0 0 7 14z", key: "b" }],
]);
```

注册后用法与 Lucide 自带图标完全相同，可以直接传给 `IconTile`。放在 `src/components/icons/`。

**自绘的图标必须先给用户看渲染效果，经用户确认后才能入库。** 模型画的路径常有对不齐、比例不对的问题，不要未经审核直接交付。

## 品牌图标

微信、支付宝、GitHub 等是别人的商标，不能自绘仿品。用 `simple-icons`：

```tsx
import { siGithub } from "simple-icons";

export const BrandGithub = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" role="img" aria-label={siGithub.title}
       className={className} fill="currentColor">
    <path d={siGithub.path} />
  </svg>
);
```

每个图标对象含 `title`、`slug`、`path`、`hex`（品牌色）、`guidelines`（品牌使用规范链接）等字段。

覆盖情况（simple-icons 16.35 实测）：
- 有：微信、支付宝、QQ、微博、哔哩哔哩、百度、阿里云、字节跳动。
- **没有**：钉钉、飞书、企业微信。这些需要去厂商官方品牌页下载官方 SVG 放进项目，**不要用模型画**。

使用边界：
- 品牌图标仅用来指代该服务本身（如"使用微信登录"），不要改形状、不要当装饰。
- 图标数据的授权不等于商标授权；使用前看对应品牌的 `guidelines`，以包内 LICENSE 和品牌规范为准。
- 品牌图标不套 IconTile 的彩色底；需要时用中性底（`bg-muted`）。

## SVG 文件的工程处理

自己项目的 Logo 等 SVG 文件，用 SVGR 当作 React 组件导入（Vite）：

```ts
// vite.config.ts
import svgr from "vite-plugin-svgr";
export default { plugins: [svgr()] };
```

```tsx
import Logo from "./logo.svg?react";
<Logo className="size-8" />
```

TypeScript 需要在 `vite-env.d.ts` 加一行：

```ts
/// <reference types="vite-plugin-svgr/client" />
```

压缩（可选）：安装 `@svgr/plugin-svgo` 并启用：

```ts
svgr({
  svgrOptions: {
    plugins: ["@svgr/plugin-svgo", "@svgr/plugin-jsx"],
    svgoConfig: { floatPrecision: 2 },
  },
})
```

SVG 文件本身的要求：
- 颜色用 `currentColor`（或主题变量），不写死色值，否则无法跟随主题。
- 保留 `viewBox`，尺寸交给 `className`（如 `size-8`）。当前 SVGO 默认会保留 `viewBox`（已验证），不要手动启用 `removeViewBox` 插件。
- 不要内嵌 base64 位图。
- Next.js 项目的 SVG 处理方式不同，本文档未核实，遇到时查官方文档。

## 空状态与错误页插画

不引入外部插画素材，用已有的元素组合，风格自然统一。

首选（最简单、最统一）：大号 IconTile 作为主视觉。

```tsx
<div className="flex flex-col items-center gap-4 py-16 text-center">
  <IconTile icon={SearchX} variant="solid" size="lg" />
  <div>
    <p className="text-base font-medium">没有找到相关数据</p>
    <p className="text-sm text-muted-foreground">换个关键词，或清除筛选条件再试试</p>
  </div>
  <Button variant="outline">清除筛选</Button>
</div>
```

需要更丰富时，可以用 SVG 自绘一张简洁插画，规则：
- 线宽 2px、圆角，与图标一致。
- 颜色只用主色、主色的浅色底（`bg-primary/10`）和一处小的强调点缀；全部来自主题 token，深色模式自动适配。
  - **例外**：登录页的四个插画小人用四种颜色（主色、深灰、橙、黄，见 `assets/login/login-tokens.css`），已经用户确认。其他插画仍按本条执行。
- 保持几何、抽象的风格（圆形底 + 少量形状），不画复杂人物、场景。
- 自绘插画同样要先给用户看渲染效果，确认后再入库。

不要用位图插画，不要引用外链图片。确需使用第三方插画库（如 unDraw）时：授权条款以官网最新页面为准（本文档未直接核实），并把插画重新着色为主题色。

## Logo 与 favicon

- Logo 用**单个 SVG**，颜色用 `currentColor` 或主题变量。
- 提供两版：**实心版**（主色底，浅色符号）、**描边版**（单色线条）；描边版用于单色场景和深色背景。
- Logo 的符号和气质由用户决定。模型可以出草稿，但不替用户定稿。
- favicon 提供 SVG 版，并保留一张 PNG 兜底。

## 无障碍与尺寸

- 装饰性图标（旁边已有文字）：`aria-hidden="true"`。
- 纯图标按钮：按钮上必须有 `aria-label`，或用 Tooltip 说明。
- 图标尺寸只用刻度：16 / 20 / 24 / 28px（`size-4/5/6/7`），不用任意值。
- 点击目标不小于 32px（图标按钮用 `size="icon"`，不要只靠 16px 的图标本身响应点击）。

## 反模式

- `import { Github } from "lucide-react"`（v1 已无品牌图标）
- 手写 `bg-${tone}`、`text-${color}` 这类拼接类名（Tailwind 不识别）
- 给每个功能分配不同颜色的色块
- 小位置（按钮、菜单、表格操作）也加彩色色块
- 同时引入 `lucide-react` 与 `react-icons` 等其他图标库
- 自绘品牌图标、用模型画微信/钉钉等商标（`scripts/check_deps.mjs` 会检测已删除的 Lucide 品牌图标导入）
- SVG 里写死 `#xxxxxx` 色值，或 `fill`/`stroke` 与主题冲突
- 自绘图标未经用户确认就入库
- 用 emoji、位图当图标；引用外链插画图片
- 不设 `--primary` 品牌色就使用 IconTile（结果是灰色块）

## 未核实事项

- Next.js 项目中 SVG 作为组件导入的配置。
- unDraw 等第三方素材的当前授权条款。
- 浅色底 + 深色线的实际视觉对比度：已按设计稿设定，但需在真实项目的主题色下目测，必要时微调透明度（`/10`、`/20`）。
- 钉钉、飞书、企业微信的官方 SVG 获取地址。
