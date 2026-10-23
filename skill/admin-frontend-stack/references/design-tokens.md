# 设计语言与 Token

"统一设计语言"落到具体规则，才能让每一次生成都长得一样。
基本原则：**所有视觉值来自 shadcn 的 CSS 变量与 Tailwind 刻度，业务代码里不出现魔法值。**

## 目录
- 颜色
- 圆角
- 间距与密度
- 字体
- 深色模式
- 常用组合速查

## 颜色

只使用语义 token，不写死色值：

| 用途 | 使用 | 不要 |
|---|---|---|
| 页面背景 | `bg-background` | `bg-white`、`bg-gray-50` |
| 主文字 | `text-foreground` | `text-black`、`text-gray-900` |
| 次要文字 | `text-muted-foreground` | `text-gray-500` |
| 卡片/浮层 | `bg-card`、`bg-popover` | 自己挑白色/灰色 |
| 弱背景（表头、悬停） | `bg-muted`、`bg-accent` | |
| 边框 | `border`、`border-input` | `border-gray-200` |
| 主色/主按钮 | `bg-primary text-primary-foreground` | `bg-blue-600` |
| 危险 | `text-destructive` / `variant="destructive"` | `text-red-500` |
| 焦点环 | `ring-ring` | |
| 图表 | `--chart-1` … `--chart-5`（⚠️ 中性主题下默认全是灰色，先改成品牌色系，深浅两套） | 自选调色板 |
| 按姓名配色的头像 | `--avatar-1` … `--avatar-6`（定义见 `assets/navigation/avatar-tokens.css`，仅用于头像） | 拿 `--chart-*` 凑（中性主题下全是灰色） |

成功/警告/信息等状态色：shadcn 默认没有，需要时在全局 CSS 里新增语义变量（如 `--success`、`--warning`，并同时定义深色值），再通过 Tailwind 主题映射使用；不要在页面里散落 `text-green-600`。

新增状态色的写法（Tailwind v4 + shadcn，具体写法请对照项目里已有的 `@theme inline` 块，保持一致）：

```css
:root {
  --success: oklch(0.62 0.17 150);
  --success-foreground: oklch(0.99 0 0);
  --warning: oklch(0.75 0.16 75);
  --warning-foreground: oklch(0.2 0 0);
}
.dark {
  --success: oklch(0.7 0.17 150);
  --warning: oklch(0.8 0.15 75);
}
@theme inline {
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
}
```

上面的数值只是示例起点，需在项目真实主题下目测深浅两种模式的对比度后调整。有了这些变量，`bg-success`、`text-warning/10` 等类名才可用（IconTile 依赖它们）。

换品牌色：只改全局 CSS 里 `--primary` 等变量（或用 shadcn preset / theme），全站自动生效。

## 圆角

- 统一由 `--radius` 派生（`rounded-md`、`rounded-lg` 等映射到该变量）。
- 同一层级的元素圆角一致：按钮、输入框、卡片用 shadcn 默认的对应档位，不手写 `rounded-[7px]`。
- 头像、状态点用 `rounded-full`。

## 间距与密度

- 只用 Tailwind 间距刻度（4px 基准）：`gap-2/3/4/6`、`p-4/6`。禁止任意值 `p-[13px]`。
- 区块之间 `gap-6`；表单字段之间 `gap-4`；行内元素之间 `gap-2`。
- Nova 风格本身偏紧凑，不要再额外压缩间距；也不要为了"看起来大气"随意加大。
- 表格行高使用 shadcn Table 默认；需要更密时换 Mira 风格或加统一的 `density` 开关，不在单个页面里偷偷改。

## 字体

- 字体栈要包含中文回退，示例：
  `font-family: "Inter", ui-sans-serif, system-ui, "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif;`
- 全站一种无衬线字体 + 一种等宽字体（用于代码、ID、JSON）。
- 字号阶梯：页面标题 `text-xl/2xl font-semibold`；区块标题 `text-base/lg font-medium`；正文 `text-sm`；辅助说明 `text-xs text-muted-foreground`。后台以 `text-sm` 为主。
- 数字列（金额、数量）右对齐并使用 `tabular-nums`。

## 深色模式

- 通过 `.dark` 类切换；只要全程用语义 token，就不需要在组件里写 `dark:` 分支。
- 必须写 `dark:` 的场景（如特殊状态色）要两套值同时给出，并在深浅两种模式下都检查对比度。
- 主题偏好存 Zustand（`persist`），默认跟随系统。

## 常用组合速查

```tsx
// 页面标题区
<div className="flex items-center justify-between">
  <div>
    <h1 className="text-xl font-semibold">用户管理</h1>
    <p className="text-sm text-muted-foreground">管理系统内的账号与角色</p>
  </div>
  <Button><Plus /> 新增用户</Button>
</div>

// 次要说明文字
<span className="text-xs text-muted-foreground">最后更新于 2 分钟前</span>

// 金额列
<TableCell className="text-right tabular-nums">¥1,280.00</TableCell>
```
