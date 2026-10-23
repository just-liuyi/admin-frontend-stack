# 用 tsc 与 ESLint 约束

最后核实：2026-10-22（eslint 10.13、typescript-eslint 8.72、typescript 6.0.3）。配置在小型测试项目中验证过，未在真实 Vite + shadcn 项目中跑过。

## 目录
- 为什么用它们，而不是只靠脚本
- tsc 已经能抓到的
- ESLint 规则配置
- 安装与版本（⚠️ 锁定 TypeScript 6）
- 已有项目怎么接入
- 局限
- 与 check_deps.mjs 的分工

## 为什么用它们，而不是只靠脚本

`tsc` 和 ESLint 是项目自带的工具：编辑器里直接标红，提交前、CI 里自动运行，人写的代码和 AI 写的代码都受约束，不需要靠 AI 记得去运行某个脚本。因此「禁止混用」类规则优先落成 ESLint 规则，`scripts/check_deps.mjs` 只作补充。

## tsc 已经能抓到的

- 从 `lucide-react` 导入 v1 已删除的品牌图标（如 `Github`）：报 `TS2305: has no exported member`（已在 lucide-react 1.61 验证）。
- 因此这一项不需要额外写 ESLint 规则，只要 `tsc --noEmit` 在交付前跑过。

## ESLint 规则配置

下面是已验证的配置（ESLint flat config）。它做两件事：禁止新代码导入重复/废弃的库，禁止拼接式 Tailwind 类名。
`src/legacy/**` 这类历史遗留目录降为警告，不阻塞提交。

```js
// eslint.config.mjs
import tseslint from "typescript-eslint";

// 规则内容与 references/stack.md 的「禁止混用」保持同步
const restrictedImports = {
  patterns: [
    { group: ["react-icons", "react-icons/*", "@heroicons/*", "@tabler/icons-react"], message: "图标统一用 lucide-react" },
    { group: ["framer-motion"], message: "动画统一用 motion/react" },
    { group: ["react-beautiful-dnd", "@hello-pangea/dnd"], message: "已废弃，拖拽统一用 dnd-kit" },
    { group: ["moment"], message: "日期统一用 date-fns" },
  ],
};
const dynamicClass = {
  selector: "TemplateElement[value.raw=/(^|\\s)(bg|text|border|ring|fill|stroke|from|to|via)-$/]",
  message: "Tailwind 不识别拼接的类名，请改用完整类名的映射表",
};

export default tseslint.config(
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: { parser: tseslint.parser, parserOptions: { ecmaFeatures: { jsx: true } } },
    rules: {
      "no-restricted-imports": ["error", restrictedImports],
      "no-restricted-syntax": ["error", dynamicClass],
    },
  },
  // 历史遗留目录：降为警告，不阻塞提交，逐步迁移
  {
    files: ["src/legacy/**"],
    rules: {
      "no-restricted-imports": ["warn", restrictedImports],
      "no-restricted-syntax": ["warn", dynamicClass],
    },
  },
);
```

验证结果：新代码里的 `react-icons`、`framer-motion` 导入和 `bg-${t}` 被报为错误；`src/legacy` 中同样的写法只报警告；`motion/react`、`lucide-react` 和完整类名的映射表不报任何问题；以变量开头的合法模板字符串（例如 ``{`${tone[k]} p-4`}``）也不会误报。

`restrictedImports` 的名单要和 `references/stack.md` 的「各类别说明与禁止混用项」保持同步；增删禁用库时两处一起改。

## 安装与版本

```bash
npm i -D eslint typescript-eslint typescript@6
```

⚠️ **锁定 TypeScript 6。** 实测 `typescript-eslint` 8.72 不支持刚发布的 TypeScript 7.0，运行 ESLint 时会直接报错退出。新建项目若默认装了 TS 7，需要降级，或等 typescript-eslint 支持后再升级。

## 已有项目怎么接入

- 项目里**已经有** ESLint 配置时，把上面的两条规则**合并进现有配置**，不要新建第二份。
- 如果项目已经配置了 `no-restricted-imports` 或 `no-restricted-syntax`，不能直接再追加一份：后面的配置块对同一条规则的设置会覆盖前面的，选项不会自动合并。要把本文的条目并入已有的 `patterns` 和选择器列表。
- 项目里有历史遗留（如还在用 `react-icons`）时，用 `files` 把遗留目录单独设为 `"warn"`，如上面配置的最后一段。**不要为了通过检查而整体关掉规则。**
- 个别行确需例外时，用 `// eslint-disable-next-line <规则名>` 并写明原因。

## 局限

- 只能拦住「代码里新用到」重复的库，不会替你删掉 `package.json` 里多余的依赖。
- 不覆盖版本差异（如 TanStack Table v8/v9），那一类仍靠 `patterns.md`。
- 拼接类名规则按「模板字符串片段以 `bg-` 等结尾」来判断，极少数非类名的字符串恰好这样结尾时会误报，用行内禁用注释处理。

## 与 check_deps.mjs 的分工

| 工具 | 擅长 | 何时用 |
|---|---|---|
| `tsc --noEmit` | 已删除的图标导入、类型错误 | 每次交付前 |
| ESLint 规则 | 阻止新代码用重复/废弃库、拼接类名 | 新项目一开始就配置；已有项目合并接入 |
| `scripts/check_deps.mjs` | 读 `package.json` 做依赖级体检、版本提醒、历史遗留登记 | 可选；接手已有项目时跑一次 |
