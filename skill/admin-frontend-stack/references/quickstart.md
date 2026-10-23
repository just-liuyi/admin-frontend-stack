# 从零搭出后台骨架（导航 + 页签 + 登录）

新项目按本文一步步做，就能得到：带侧边栏和顶栏的外壳、多页签、登录页（含登录守卫）、深浅色主题。
本文的每一步都在一个全新的空项目里实际执行过（2026-10-23）：`tsc -b` 和 `vite build` 通过，登录页 36 项检查和页签、404、退出登录检查全部通过。

做完后的效果见 `assets/previews/`：`shell-desktop.jpg`（外壳，页面换成真实内容后）、`login-desktop.jpg`、`login-mobile.jpg`。

## 1. 建项目、装 Tailwind

```bash
npm create vite@latest my-admin -- --template react-ts --no-interactive
cd my-admin
npm install
npm install tailwindcss @tailwindcss/vite
```

- `vite.config.ts` 加 `tailwindcss()` 插件和 `@` 别名（`resolve.alias: { "@": path.resolve(import.meta.dirname, "./src") }`）。
- `tsconfig.json` 和 `tsconfig.app.json` 的 `compilerOptions` 都加 `"paths": { "@/*": ["./src/*"] }`。TypeScript 6 已弃用 `baseUrl`，不要加。
- `src/index.css` 先只写一行 `@import "tailwindcss";`，删掉 `src/App.css`。

## 2. 初始化 shadcn、加组件、装依赖

```bash
npx shadcn@latest init -t vite -b radix -p nova -y --no-monorepo
npx shadcn@latest add sidebar collapsible dropdown-menu context-menu avatar tooltip breadcrumb tabs field input button sonner
npm i lucide-react zustand react-router @tanstack/react-query react-hook-form @hookform/resolvers@5 zod@4
```

`zod` 必须写 `@4`，否则会报 ERESOLVE（见 `stack.md`）。

## 3. 复制代码

| 来源 | 放到 |
|---|---|
| `assets/shared/main.tsx` | `src/main.tsx`（覆盖） |
| `assets/shared/input-modality.ts` | `src/lib/input-modality.ts` |
| `assets/login/App.tsx` | `src/App.tsx`（覆盖） |
| `assets/navigation/nav.ts` | `src/config/nav.ts` |
| `assets/tabs/routes.tsx` | `src/config/routes.tsx` |
| `assets/navigation/app-shell.tsx`、`app-sidebar.tsx`、`user-menu.tsx`、`user-avatar.tsx` | `src/components/` |
| `assets/tabs/tab-bar.tsx`、`tab-views.tsx` | `src/components/` |
| `assets/login/login-mascots.tsx` | `src/components/` |
| `assets/login/login.tsx` | `src/pages/login.tsx` |
| `assets/login/auth-api.ts` | `src/api/auth.ts` |
| `assets/login/auth-store.ts` | `src/stores/auth.ts` |
| `assets/navigation/theme.ts` | `src/stores/theme.ts` |
| `assets/tabs/tabs.ts` | `src/stores/tabs.ts` |
| `assets/navigation/avatar-tokens.css`、`assets/login/login-tokens.css` | 合并进 `src/index.css` |

## 4. 改两个 shadcn 组件（见 `patterns.md`）

- `components/ui/tabs.tsx`：`TabsTrigger` 的焦点样式改成只在键盘操作时显示。
- `components/ui/sonner.tsx`：`useTheme()`（next-themes）改为读 `@/stores/theme` 的 `useThemeStore`，然后 `npm uninstall next-themes`。

## 5. 换成自己的内容

- `src/config/nav.ts`：菜单（标题、地址、图标、子菜单）。
- `src/config/routes.tsx`：把 `placeholder(...)` 换成真实页面组件，地址要和菜单一一对应。
- `src/pages/login.tsx`：顶部的 `APP_NAME` 和 `Brand`（系统名、Logo）。
- `src/api/auth.ts`：换成真实登录接口，保持函数名和返回值不变。
- 全局 CSS 的 `--primary`：品牌色。

## 6. 检查

```bash
npx tsc -b
npm run build
node <skill 目录>/scripts/check_deps.mjs . --strict
```

然后按 `navigation.md`、`tabs.md`、`login.md` 末尾的「交付检查」在浏览器里走一遍。

## 7. 部署到子路径（可选，如 GitHub Pages）

网站不在域名根目录时（例如 `https://用户名.github.io/仓库名/`）：

- `vite.config.ts` 写 `base: process.env.BASE_PATH ?? "/"`；`main.tsx` 的 `<BrowserRouter basename={import.meta.env.BASE_URL}>` 已经写好，路由会自动带上前缀。
- 构建时设置前缀，并把 `index.html` 复制一份为 `404.html`：静态托管找不到 `/users` 这类地址时会返回 `404.html`，页面照常由前端路由接管。

```bash
BASE_PATH=/仓库名/ npm run build
cp dist/index.html dist/404.html
```

已在模拟 GitHub Pages 的环境中实测：直接打开深层地址、在深层地址刷新、404 页、页签、登录与退出都正常。
