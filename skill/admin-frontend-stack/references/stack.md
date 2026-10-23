# 技术栈清单

最后核实：2026-10-21。版本号会变，以项目 `package.json` 实际安装版本为准。

## 目录
- 清单总表
- 初始化
- 各类别说明与禁止混用项
- 清单之外的常见需求

## 清单总表

| 类别 | 默认选择 | 说明 |
|---|---|---|
| 语言/构建 | TypeScript + Vite | 需要 SSR/SEO 时用 Next.js（App Router） |
| 样式 | Tailwind CSS（v4） | shadcn 当前基于它 |
| UI 组件 | shadcn/ui，风格 `radix-nova` | 源码进仓库，可改 |
| 图标 | `lucide-react` | shadcn 默认图标库；v1 已删除品牌图标，品牌图标用 `simple-icons`，详见 icons-and-graphics.md |
| 动画 | `motion` | 导入自 `motion/react` |
| 面板布局 | `react-resizable-panels`（v4） | 通过 shadcn `resizable` 使用 |
| 拖拽 | dnd-kit | 新项目用 `@dnd-kit/react`，旧项目沿用 `@dnd-kit/core` |
| 客户端状态 | `zustand` | 只放 UI 状态 |
| 服务端状态 | `@tanstack/react-query` | 接口数据、缓存、变更 |
| 表格 | `@tanstack/react-table` + shadcn Table | ⚠️ v8 与 v9 API 不兼容，见 patterns.md；新项目与 shadcn Data Table 指南保持同一版本 |
| 表单 | `react-hook-form` + `zod` | 配合 shadcn `Field` |
| 图表 | shadcn Chart（底层 Recharts） | |
| 通知 | Sonner（shadcn `sonner`） | |
| 路由 | React Router 或 TanStack Router | 二选一；Next.js 项目用自带路由 |
| 日期 | `date-fns` | 日期选择用 shadcn Calendar / Date Picker |
| 命令面板 | shadcn `command`（cmdk） | |
| 工具函数 | shadcn 的 `cn()`（从 `@/lib/utils` 导入） | 新版 shadcn CLI（4.22 实测）初始化时安装 `cn` 包（shadcn 官方，替代 `clsx` + `tailwind-merge`），`lib/utils.ts` 只是转出；旧项目用 `clsx` + `tailwind-merge` 的沿用，不要两套并存 |

## 初始化

新项目：

```bash
npm create vite@latest my-admin -- --template react-ts
cd my-admin
npx shadcn@latest init -t vite -b radix -p nova -y --no-monorepo   # 非交互；生成的 components.json 为 "radix-nova"
# 注意：-p 只写风格名（nova），不写 radix-nova（CLI 4.22.1 实测会报 Invalid preset）
# 配合 ESLint 时锁定 TypeScript 6：npm i -D typescript@6（详见 eslint-rules.md）
```

`components.json` 里风格字段格式为 `{基础库}-{风格}`：

```json
{ "style": "radix-nova" }
```

- 基础库：`radix`（默认，生态最广）或 `base`（Base UI）。已有项目沿用其现有选择，不要切换。
- 风格：Vega（经典）、**Nova（紧凑，后台默认）**、Maia（圆润宽松）、Lyra（方正，配等宽字体）、Mira（最紧凑，适合高密度数据界面）。后续版本可能新增风格，用 `npx shadcn@latest preset decode <preset>` 或官方文档确认。

常用组件的候选清单（**按页面需要添加，不要一次全装**）：

```bash
npx shadcn@latest add sidebar breadcrumb button card table tabs dialog alert-dialog sheet \
  dropdown-menu input select checkbox switch field badge skeleton sonner \
  command popover calendar tooltip separator scroll-area resizable chart
```

若某个组件名在当前 shadcn 版本不存在，CLI 会报错，按提示换名即可。表单控件用 `field` 还是 `form`，以官方 Forms 文档和项目现状为准。

### 按需引入：能力与依赖对照

先确定项目需要哪些能力，只装对应的依赖：

| 需要的能力 | 安装 |
|---|---|
| 请求接口、缓存、分页 | `@tanstack/react-query` |
| 带排序/筛选/分页/列管理的表格 | `@tanstack/react-table` |
| 有校验的表单 | `react-hook-form` `@hookform/resolvers@5` `zod@4`（zod 必须写版本，见下方） |
| 主题偏好、筛选面板开关等客户端 UI 状态（侧边栏折叠除外，它归 shadcn Sidebar） | `zustand` |
| 页面切换、弹层的过渡动画 | `motion`（简单 hover 用 Tailwind transition 即可） |
| 拖拽排序、看板 | dnd-kit（`@dnd-kit/react` 或沿用旧包） |
| 可拖动调整的分栏 | `react-resizable-panels`（通过 shadcn `resizable`） |
| 日期处理 | `date-fns` |
| 品牌图标 | `simple-icons` |

⚠️ **`@hookform/resolvers` 请装 v5**（`@hookform/resolvers@5`）。实测 v6 的可选依赖链会让 npm 报 ERESOLVE，v5 与 react-hook-form 7、zod 4 配合可以不加任何绕过参数干净安装并通过编译。

⚠️ **zod 也必须写成 `zod@4`。** 2026-10-23 在隔离目录复现：用 shadcn 初始化过的项目（`shadcn` 包在依赖里）执行 `npm i react-hook-form @hookform/resolvers@5 zod` 会报 ERESOLVE（npm 去满足 resolvers 可选依赖链里的 `zod@^3`）；改成 `zod@4`，或先单独装 zod 再装 resolvers，都能干净安装。不要用 `--force` / `--legacy-peer-deps` 绕过。

```bash
npm i react-hook-form @hookform/resolvers@5 zod@4
```

例如：纯展示型仪表盘通常只需要 Lucide、shadcn Chart 和 Query，不需要 dnd-kit、可调整面板或表单依赖。

```bash
# 示例：只装当前页面用到的
npm i @tanstack/react-query @tanstack/react-table
```

## 各类别说明与禁止混用项

**图标**：规范见 `icons-and-graphics.md`。统一 `lucide-react`，按需具名导入（`import { Plus } from "lucide-react"`）。禁止同时引入 react-icons、@heroicons、@tabler/icons。

**动画**：统一 `motion`。包 `framer-motion` 是它的旧名，禁止两者并存；已有项目用的是 `framer-motion` 时沿用，不新增 `motion`。简单的 hover/展开收起优先用 Tailwind transition，不必上 JS 动画。

**拖拽**：dnd-kit 有两套包（新版 `@dnd-kit/react` 目前仍是 0.x，接口可能继续变动，稳定性不如其他库）：旧的 `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`，新的 `@dnd-kit/react`（重写，API 不同）。同一项目只用一套。`react-beautiful-dnd` 已废弃，禁止使用。

**职责分工（避免两个库做同一件事）**：应用导航的折叠与宽度用 shadcn Sidebar，不要用 resizable 做；shadcn 自带 CSS 进出场过渡，Motion 只用于需要自定义的动画，不要两套同时作用在同一个元素上。

**状态**：Zustand 管 UI 状态（当前筛选面板、弹窗开关、主题等用户偏好）。侧边栏折叠由 shadcn `SidebarProvider` 管理（自动写 cookie），不要再放进 Zustand。接口数据、分页、缓存全部交给 TanStack Query。禁止并存 Redux / MobX / Jotai / Recoil，除非项目已有。

**表单**：React Hook Form + Zod，校验规则写在 Zod schema 里，前后端可复用。禁止并存 Formik。

**表格**：按复杂度选，不是所有表格都要上 TanStack Table。

| 场景 | 做法 |
|---|---|
| 静态展示、几行只读数据 | shadcn Table 或原生 `<table>` |
| 需要排序、筛选、分页、列管理、行选择 | TanStack Table（逻辑）+ shadcn Table（样式） |
| 数据量很大、交互复杂 | 在上一行基础上评估虚拟滚动（`@tanstack/react-virtual`） |

服务端分页场景设 `manualPagination` 等，不要在前端拉全量再切片。

**请求**：统一一个 HTTP 客户端封装（原生 fetch 薄封装或项目已有的 axios），不要两者并存。

**样式**：禁止并存 styled-components / emotion / CSS Modules 与 Tailwind；禁止并存 Ant Design / MUI 与 shadcn（除非是项目历史遗留，那就沿用其体系，不混入 shadcn）。

## 清单之外的常见需求

| 需求 | 先看 | 再考虑 |
|---|---|---|
| 富文本编辑器 | Tiptap | — |
| 代码/JSON 编辑 | Monaco（`@monaco-editor/react`） | CodeMirror |
| 大列表虚拟滚动 | `@tanstack/react-virtual` | — |
| 文件上传 | 原生 input + 自行封装进度 | react-dropzone |
| 国际化 | `react-i18next` | 项目已有的方案 |
| 权限控制 | 自写 `<Can>` 组件 + 路由守卫，规则集中一处 | — |
| 品牌图标（微信、GitHub 等） | `simple-icons`（钉钉、飞书、企业微信没有，需官方 SVG） | — |
| 导出 Excel | `xlsx`（SheetJS） | exceljs |
| 树形/级联 | shadcn Collapsible + 自写递归，或 Combobox | — |

引入清单外的库时，在回复里说明：为什么现有方案不够、该库的维护状态。
