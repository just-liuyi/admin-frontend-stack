# 核实过的用法与坑

最后核实：2026-10-21。以下片段已用 TypeScript 在真实版本上编译验证（react 19、@dnd-kit/react 0.5.1、react-resizable-panels 4.14、zustand 5.0、motion 14、@tanstack/react-query 5.104、@tanstack/react-table 8.21 与 9.3、react-hook-form 7.90、zod 4.6），但"能编译"不等于"行为正确"，写业务时仍以项目已装版本的类型定义为准。
标 ⚠️ 的是已知容易写错的地方。

## 目录
- shadcn/ui
- Motion
- react-resizable-panels（v4）
- dnd-kit（新旧两套）
- Zustand
- TanStack Query
- TanStack Table
- React Hook Form + Zod

## shadcn/ui

组件通过 CLI 添加，源码落在 `components/ui/`，之后可直接改：

```bash
npx shadcn@latest add button
```

- 修改外观改 `components/ui/*` 或全局 CSS 变量，不要在业务页面里层层覆盖 className。
- 业务组合组件放 `components/` 下自己的目录（如 `components/data-table/`），不要塞进 `components/ui/`。
- 合并 className 一律用 `cn()`。

shadcn 默认实现里已知要改的地方（2026-10-23 在 shadcn CLI 4.22.1 实测发现，改在 `components/ui/` 里，改一次全站生效）：

- **Checkbox 半选状态**：默认 `checked="indeterminate"` 时仍显示对勾、而且没有主色底，和全选分不清（表格表头全选、权限分组全选都会用到）。在 `components/ui/checkbox.tsx` 里给根元素加 `group/checkbox` 和 `data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground`，指示器里放两个图标：

  ```tsx
  <CheckIcon className="group-data-[state=indeterminate]/checkbox:hidden" />
  <MinusIcon className="hidden group-data-[state=indeterminate]/checkbox:block" />
  ```

- **Sonner 依赖 next-themes**：`shadcn add sonner` 会装 `next-themes` 并在 `sonner.tsx` 里 `useTheme()`。项目已用 Zustand 管主题时，改成读自己的主题 store 并卸载 `next-themes`，不要两套主题管理并存。
- **图表颜色**：中性主题下 `--chart-1…5` 全是灰色。用图表前先把 `--chart-*`（深浅两套）设成品牌色系，否则图表是灰的。
- **横向滚动容器（手机上的页签、按钮组）**：只写 `overflow-x-auto` 时，浏览器会按 CSS 规则把纵向也变成 `auto`；shadcn Tabs 的隐藏下划线伸出底边，内容比容器高 1px，就会冒出纵向滚动条（Windows 上还带上下箭头）。必须同时写 `overflow-y-hidden`，桌面端放得下时直接关掉滚动（2026-10-23 实测）：

  ```tsx
  <div className="no-scrollbar -mx-4 overflow-x-auto overflow-y-hidden px-4 lg:mx-0 lg:overflow-visible lg:px-0">
    <Tabs>…</Tabs>
  </div>
  ```

- **Tabs 页签点击后出现灰色"气泡"框**：Chromium 里页面刚打开、还没有任何交互时，第一次用鼠标点 Radix Tabs 页签也会判定为 `:focus-visible`，shadcn 的焦点框（3px 灰圈 + 1px 轮廓）就显示出来，下划线样式下还会被截掉一截，像个气泡（2026-10-23 实测；普通按钮不会）。改法：
  1. 复制 `assets/shared/input-modality.ts` 到 `src/lib/`，在 `main.tsx` 里调用一次 `trackInputModality()`：它把最近一次输入方式写到 `<html data-input="keyboard|pointer">`。
  2. `components/ui/tabs.tsx` 的 `TabsTrigger` 里，把 5 个焦点类都加上 `in-data-[input=keyboard]:` 前缀，并补一个 `focus-visible:outline-none`（否则鼠标点击时浏览器会画自带的默认轮廓）：

     ```
     focus-visible:outline-none
     in-data-[input=keyboard]:focus-visible:border-ring
     in-data-[input=keyboard]:focus-visible:ring-[3px]
     in-data-[input=keyboard]:focus-visible:ring-ring/50
     in-data-[input=keyboard]:focus-visible:outline-1
     in-data-[input=keyboard]:focus-visible:outline-ring
     ```

  效果：鼠标点击不出现框；键盘（Tab、方向键）操作时焦点框照常显示，不影响键盘用户。页面里要覆盖这些焦点样式时，也要写成同样的 `in-data-[input=keyboard]:focus-visible:…`，否则覆盖不掉。
- **Tabs 选中色被悬停色盖掉**：shadcn Tabs 有 `hover:text-foreground`，自定义 `data-active:text-primary` 后，鼠标点完还停在页签上时文字会变黑。要再加 `data-active:hover:text-primary`。
- **切换页签时整块上下跳**：几个页签内容高度不同，外层又是上下居中时，切换一次整块就跳一下。把页签内容叠放在同一格，高度固定为最高的那个：

  ```tsx
  <div className="grid">
    <TabsContent value="a" forceMount className="col-start-1 row-start-1 data-[state=inactive]:invisible">…</TabsContent>
    <TabsContent value="b" forceMount className="col-start-1 row-start-1 data-[state=inactive]:invisible">…</TabsContent>
  </div>
  ```

  `forceMount` 让非当前的内容也保留在页面里，`invisible` 让它不可见、不可聚焦，也不会被读屏软件读到。

## Motion

⚠️ 导入自 `motion/react`，不是 `framer-motion`。

```tsx
import { motion, AnimatePresence } from "motion/react";

<AnimatePresence>
  {open && (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.15 }}
    />
  )}
</AnimatePresence>
```

后台里的动画保持短（150–250ms）、克制：页面切换淡入、列表项进出、抽屉/弹层。表格行、大批量元素不要逐个加动画。

## react-resizable-panels（v4）

⚠️ v4 重命名了导出，v3 的写法会直接报错：

| v3 | v4 |
|---|---|
| `PanelGroup` | `Group` |
| `PanelResizeHandle` | `Separator` |
| `<Panel ref>` | `<Panel panelRef>`（配合 `usePanelRef`） |
| `direction="horizontal"` | `orientation="horizontal"` |

⚠️ v4 支持 px / % / rem 等单位，尺寸的数值语义与 v3 不同。写尺寸时用带单位的写法（如 `"30%"`）并对照项目版本的文档确认，不要沿用 v3 的裸数字习惯。

优先通过 shadcn 的封装使用，它已适配 v4：

```tsx
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

<ResizablePanelGroup orientation="horizontal">
  <ResizablePanel>左</ResizablePanel>
  <ResizableHandle withHandle />
  <ResizablePanel>右</ResizablePanel>
</ResizablePanelGroup>
```

- `Panel` 和 `Separator` 必须是 `Group` 的直接 DOM 子节点。
- 保存布局用库提供的 `useDefaultLayout`，不要手写 localStorage 逻辑。

## dnd-kit

先看 `package.json` 判断用哪套，**不要混用**：

- 已有 `@dnd-kit/core` → 沿用旧 API（`DndContext`、`SortableContext`、`useSortable`、`arrayMove`、`CSS` 来自 `@dnd-kit/utilities`）。
- 新项目 → `@dnd-kit/react`（新核心，API 不同，旧教程会误导）。

新 API 形态（已在 `@dnd-kit/react` 0.5.1 编译验证）。⚠️ 该包仍是 0.x 版本，API 可能继续变动，写之前对照 `node_modules/@dnd-kit/react` 的类型确认：

```tsx
import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { move } from "@dnd-kit/helpers";

function Item({ id, index }: { id: string; index: number }) {
  const { ref } = useSortable({ id, index });
  return <li ref={ref}>{id}</li>;
}

<DragDropProvider onDragEnd={(event) => setItems((items) => move(items, event))}>
  <ul>{items.map((id, i) => <Item key={id} id={id} index={i} />)}</ul>
</DragDropProvider>
```

后台常见拖拽场景：列表/表格行排序、看板跨列移动、菜单/字段顺序配置。拖拽结束后要调接口持久化顺序，并做乐观更新 + 失败回滚。

## Zustand

⚠️ v5：`create` 具名导入；TypeScript 下用柯里化写法；选择器返回对象/数组时用 `useShallow`，否则会无限重渲染。

```ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

type UiState = {
  tableDensity: "compact" | "comfortable";
  setTableDensity: (d: UiState["tableDensity"]) => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      tableDensity: "comfortable",
      setTableDensity: (tableDensity) => set({ tableDensity }),
    }),
    { name: "ui" },
  ),
);

// 组件里：只订阅需要的字段
const density = useUiStore((s) => s.tableDensity);

// 一次取多个字段
import { useShallow } from "zustand/react/shallow";
const { a, b } = useUiStore(useShallow((s) => ({ a: s.a, b: s.b })));
```

store 按领域拆小（`useUiStore`、`useAuthStore`……），不要做一个巨型全局 store。
⚠️ 侧边栏折叠状态**不放 Zustand**：它由 shadcn 的 `SidebarProvider` 管理并写入 cookie，再存一份会不同步（见 `navigation.md`）。

## TanStack Query

⚠️ v5 只接受对象形式：`useQuery({ queryKey, queryFn })`。

```tsx
const { data, isPending, isError } = useQuery({
  queryKey: ["users", { page, pageSize, keyword }],
  queryFn: () => fetchUsers({ page, pageSize, keyword }),
  placeholderData: keepPreviousData, // 翻页时保留上一页，避免闪烁
});

const qc = useQueryClient();
const remove = useMutation({
  mutationFn: deleteUser,
  onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
});
```

- queryKey 把所有影响结果的参数放进去（分页、筛选、排序）。
- 把 `queryKey` 与请求函数按资源封装成自定义 hook（`useUsers`、`useDeleteUser`），页面不直接写 `useQuery`。
- mutation 成功后 `invalidateQueries`，并用 Sonner 提示结果。

## TanStack Table

⚠️ 先看 `package.json` 里的主版本。**v8 和 v9 的 API 不兼容**，导入名都不同（2026-10 实测：npm 上最新是 v9，shadcn 的 Data Table 示例与大量教程仍是 v8 写法）。已有项目沿用其版本，不要擅自升级；新项目看 shadcn Data Table 指南用哪个版本，二者保持一致。

逻辑与样式分离：TanStack Table 管状态，shadcn `Table` 组件负责渲染。

**v8**（`useReactTable`）：

```tsx
import { useReactTable, getCoreRowModel } from "@tanstack/react-table";

const table = useReactTable({
  data,
  columns,
  getCoreRowModel: getCoreRowModel(),
  manualPagination: true,   // 服务端分页/排序/过滤
  manualSorting: true,
  manualFiltering: true,
  rowCount: total,
  state: { pagination, sorting },
  onPaginationChange: setPagination,
  onSortingChange: setSorting,
});
```

**v9**（`useTable` + 显式声明 features；已编译验证 9.3.1）：

```tsx
import {
  tableFeatures, rowPaginationFeature, rowSortingFeature,
  createColumnHelper, useTable,
} from "@tanstack/react-table";

const features = tableFeatures({ rowPaginationFeature, rowSortingFeature }); // 模块级
const helper = createColumnHelper<typeof features, User>();
const columns = helper.columns([helper.accessor("name", { header: "姓名" })]); // 模块级
const emptyRows: User[] = [];                                                   // 模块级

const table = useTable({
  features, columns,
  data: rows ?? emptyRows,   // ⚠️ 别写 `?? []`，每次渲染新数组会让行模型反复失效
  rowCount: total,
  manualPagination: true,
  manualSorting: true,
  state: { pagination, sorting },
  onPaginationChange: setPagination,
  onSortingChange: setSorting,
});
// 渲染：table.getRowModel().rows → row.getAllCells() → <table.FlexRender cell={cell} />
```

v9 注意事项：
- 不要用已废弃的 `useLegacyTable`（`@tanstack/react-table/legacy`），它只是迁移过渡用的。
- 受控 state 要和对应的 `onXxxChange` 成对出现。
- 想了解 v9 的细节，直接读 `node_modules/@tanstack/react-table/skills/` 下的文档（包自带，含与 TanStack Query 配合的服务端分页示例）。

通用规则：
- 数据在服务端时一律 `manual*` + `rowCount`；纯前端小数据才用客户端分页/排序。
- `columns`、`features` 定义在组件外或用 `useMemo`，避免每次渲染重建。
- 操作列用 DropdownMenu 收纳，危险操作走 AlertDialog。

## React Hook Form + Zod

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1, "请输入名称"),
  email: z.email("邮箱格式不正确"),
});
type FormValues = z.infer<typeof schema>;

const form = useForm<FormValues>({
  resolver: zodResolver(schema),
  defaultValues: { name: "", email: "" },
});
```

- 错误文案写在 schema 里，用用户的语言。
- 编辑表单用接口数据 `reset(data)` 回填；提交按钮在提交中禁用并显示 Spinner。
- ⚠️ **`@hookform/resolvers` 请装 v5，zod 写成 `zod@4`**：`npm i react-hook-form @hookform/resolvers@5 zod@4`。v6 的可选依赖链会让 npm 报 ERESOLVE；在 shadcn 项目里 zod 不写版本也会报 ERESOLVE（2026-10-23 复现）。装完仍跑一遍 `tsc` 确认。
- ⚠️ **`<form>` 必须加 `noValidate`。** 否则 `type="email"`、`required`、`min` 等会先触发浏览器自带的校验气泡，拦在 Zod 之前，用户看到的是浏览器的提示而不是 schema 里的中文文案（2026-10-23 实测）。
- zod 4 的邮箱写法是 `z.email("…")`（`z.string().email()` 已不推荐）；数字输入用 `register("x", { valueAsNumber: true })` 配 `z.number({ error: "请输入数字" })`。以上已在 zod 4.6 实测编译并运行。
- 表单控件的布局用 shadcn 的 `Field` 系列（或项目已有的 `Form` 组件），沿用项目现状。
