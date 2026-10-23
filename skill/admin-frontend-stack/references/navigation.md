# 导航外壳：侧边栏、收放按钮、个人入口、头像

后台的"第一眼"就是导航。这里把侧边栏的结构、单级和多级菜单、折叠行为、右上角个人入口和头像一次定死，不让每次生成各写一套。

最后核实：2026-10-23（shadcn CLI 4.22.1、`radix-nova`、radix-ui 1.8、lucide-react 1.61、react-router 8.5、zustand 5.0、TypeScript 6.0、Vite 8）。
验证方式：`assets/navigation/` 里的代码在真实工程里通过了 `tsc -b` 和 `vite build`，并用无头浏览器（Edge）走查了下文「交付检查」里的 24 项行为，截图人工看过浅色、深色、手机三种情况。

效果图：`assets/previews/shell-desktop.jpg`（侧边栏 + 顶栏 + 页签栏 + 用户列表页）。

## 目录
- 直接用现成代码
- 整体布局
- 分组与分隔线
- 收放按钮
- 折叠状态只存一份
- 单级还是多级
- 选中状态
- 折叠时的二级菜单
- 手机端
- 右上角个人入口
- 头像
- 已踩过的坑
- 交付检查
- 未核实事项

## 直接用现成代码

`assets/navigation/` 下是验证过的完整实现，**新项目直接复制，再改菜单数据和 Logo**，不要从零重写：

| 文件 | 放到 | 作用 |
|---|---|---|
| `nav.ts` | `src/config/nav.ts` | 唯一的菜单数据 + 选中判断 + 面包屑查找 |
| `app-sidebar.tsx` | `src/components/` | 侧边栏：顶部 Logo 与收放按钮、单级/二级菜单、折叠浮层 |
| `app-shell.tsx` | `src/components/` | 外壳：`SidebarProvider`、顶栏、面包屑、右上角个人入口、页签栏（默认带页签，配套代码在 `assets/tabs/`）。当前用户和退出登录来自 `assets/login/auth-store.ts` |
| `app-shell-no-tabs.tsx` | 改名为 `src/components/app-shell.tsx` | 仅在用户明确不要页签时用：单页面外壳，内容区是 `<Outlet />` |
| `user-menu.tsx` | `src/components/` | 右上角个人菜单 |
| `user-avatar.tsx` | `src/components/` | 自动生成的 SVG 头像 |
| `theme.ts` | `src/stores/` | 主题偏好（Zustand `persist`） |
| `avatar-tokens.css` | 合并进全局 CSS | 头像配色 token |

需要的 shadcn 组件：`npx shadcn@latest add sidebar collapsible dropdown-menu context-menu avatar tooltip breadcrumb`（`context-menu` 用于页签右键菜单）。
需要的依赖：`lucide-react`、`zustand`、`react-router`、`@tanstack/react-query`（页签"刷新"要用）。代码按 React Router 写；用 TanStack Router 时只需替换 `Link`、`useLocation`、`Outlet`。
新项目的完整步骤（含登录页）见 `quickstart.md`。

**入口直接用 `assets/shared/main.tsx`**，它把最外层要包的东西一次放全：`QueryClientProvider`、`BrowserRouter`、`TooltipProvider`（shadcn 的 Sidebar 不会自动包，漏了会在运行时报错）、`Toaster`，以及 `trackInputModality()`。

已有项目：先看它现有的侧边栏，沿用其结构，只对照本文修正违反规则的地方，不要整体替换。

## 整体布局

```
┌──────────────┬──────────────────────────────────────────────┐
│ [N] Nova [◧] │ 用户管理 > 用户列表           🔍  🔔  (AD)   │ ← 顶栏：面包屑在左，个人入口在最右
├──────────────┼──────────────────────────────────────────────┤ ← 两边的底线在同一高度（56px），连成一条
│ ▦ 仪表盘      │ 📌仪表盘  [用户列表 ×]  角色权限          ⌄ │ ← 页签栏（默认开启，见 tabs.md）
│ ──────────── ├──────────────────────────────────────────────┤
│ 业务          │   内容区（滚动只发生在这里）                   │ ← 左侧：分组之间的分隔线
│ 👥 用户管理 ⌄ │                                              │
│  │ 用户列表   │                                              │
│  │ 角色权限   │                                              │
│ 🛍 订单管理   │                                              │
│ ──────────── │                                              │
│ 系统          │                                              │
│ ⚙ 系统设置   │                                              │
│ （底部留空）   │                                              │
└──────────────┴──────────────────────────────────────────────┘
  [◧] = 收放按钮，在侧边栏顶部、Logo 同一行
```

- 侧边栏：顶部（Logo + 收放按钮）→ 分组菜单。**底部不放任何东西**：不放用户菜单，不放收放按钮。
- 层次靠两种线，不靠给每一项加框（详见「分组与分隔线」）。
- 顶栏：左侧面包屑（手机端在它前面多一个打开菜单的按钮），右侧依次是搜索、通知、个人入口。个人入口永远在最右。
- 主题切换放进个人菜单里，顶栏不再单独放一个主题按钮。
- 顶栏下方是**页签栏，默认开启**，和顶栏一起吸顶；只在电脑上显示。规则和代码见 `tabs.md`。

## 分组与分隔线

只有两种线，不再加别的：

1. **侧边栏顶部的底线**：顶部区域固定为顶栏的高度（`h-14`，56px），底部画一条线，和顶栏底线落在同一高度，视觉上连成一条贯穿整页的横线。两条线差几个像素没对齐，会显得很不整齐，所以高度必须一致。
2. **分组之间的分隔线**：第二组起，每组前面放一个 `<SidebarSeparator />`。折叠成图标后分组标题会隐藏，靠分隔线仍能看出哪几个图标是一组。

```tsx
<SidebarHeader className="h-14 justify-center border-b border-sidebar-border group-data-[collapsible=icon]:h-auto group-data-[collapsible=icon]:border-b-0">
  …
</SidebarHeader>

{navGroups.map((group, i) => (
  <Fragment key={group.label ?? i}>
    {i > 0 ? <SidebarSeparator /> : null}
    <SidebarGroup>…</SidebarGroup>
  </Fragment>
))}
```

- 折叠后顶部变成上下两行（Logo 和按钮），放不进 56px，所以取消固定高度，也不画底线。
- 不要这样做（实测对比过）：
  - 每个菜单项下面都加横线：看起来像表格，二级菜单处尤其乱；
  - 每组装进一个带边框的卡片：框太多，还占掉菜单宽度，折叠时还得额外处理。
- 只有一个分组时就没有分隔线，这是正常的；侧边栏顶部的底线仍然保留。

## 收放按钮

| 状态 | 位置 |
|---|---|
| 展开 | 侧边栏顶部，和 Logo 在同一行，靠右 |
| 折叠（图标态） | 侧边栏顶部，在 Logo 正下方（实测位置：距顶 48px，宽 32px） |
| 手机端 | 侧边栏变成抽屉；抽屉顶部这个按钮变成"关闭菜单"，另外在顶栏左侧放一个只在手机端显示的打开按钮 |

规则：
- 用 `Button variant="outline" size="icon"`，要一眼能看到；图标展开时用 `PanelLeftClose`，折叠时用 `PanelLeftOpen`。
- **不要**把收放按钮放在侧边栏底部，也**不要**做成一个菜单项（会占掉一个菜单位置，还会被当成导航）。
- 桌面端加 Tooltip，写明动作和快捷键（shadcn 内置 `Ctrl/⌘ + B`）；`aria-label` 跟着状态变（"收起侧边栏" / "展开侧边栏" / "关闭菜单"）。
- 折叠和展开时按钮位置会从"Logo 右边"移到"Logo 下面"，这是侧边栏宽度变化的必然结果，属于正常现象。
- 折叠模式用 `collapsible="icon"`（只剩图标）。`offcanvas`（整个藏起来）会让侧边栏顶部的按钮跟着消失，必须另在顶栏补一个按钮，后台默认不用。

核心写法（Logo 与按钮同一行，折叠时改成上下排列，纯 CSS 完成）：

```tsx
<SidebarHeader>
  <div className="flex items-center gap-2 group-data-[collapsible=icon]:flex-col">
    <Link to="/" className="flex min-w-0 flex-1 items-center gap-2 group-data-[collapsible=icon]:flex-none">
      {/* Logo 图形 size-8 */}
      <span className="truncate font-semibold group-data-[collapsible=icon]:hidden">Nova</span>
    </Link>
    <SidebarToggle />
  </div>
</SidebarHeader>
```

## 折叠状态只存一份

- 折叠状态由 `SidebarProvider` 管理，它在每次切换时自动写 cookie `sidebar_state`。**不要再把折叠状态存进 Zustand 或 localStorage**，两份状态迟早不同步。
- Vite 项目里 Provider 不会自己读回 cookie，要在外壳里读一次作为初始值（刷新后保持折叠已实测）：

```tsx
function readSidebarCookie() {
  const match = document.cookie.match(/(?:^|;\s*)sidebar_state=(true|false)/)
  return match ? match[1] === "true" : true
}
const [defaultOpen] = useState(readSidebarCookie)
<SidebarProvider defaultOpen={defaultOpen}>…</SidebarProvider>
```

- 需要在别处读或改折叠状态时用 `useSidebar()`（`state`、`open`、`setOpen`、`toggleSidebar`、`isMobile`、`setOpenMobile`）。

## 单级还是多级

| 情况 | 做法 |
|---|---|
| 一级菜单不超过 7 个，彼此没有明显归类 | 单级，不加分组标题 |
| 菜单多，可以按业务归类 | 单级 + 分组标题（`SidebarGroupLabel`：业务、系统…） |
| 某个模块有 2 个以上并列页面（用户列表、角色权限） | 该模块做成二级菜单 |
| 某个父级下只有 1 个子页面 | 不做二级，直接提成一级菜单 |
| 想要第三级 | 不做。第三级放进页面里的 Tabs，或重新划分模块 |

二级菜单的规则：
- **最多两级**。父级只负责展开和收起，本身不跳转、没有自己的页面。
- 子菜单不带图标，只有文字；左侧有一条竖向引导线（`SidebarMenuSub` 自带）。
- 父级右侧用 `ChevronRight`，展开时旋转 90°。
- 菜单数据用一份配置描述（`nav.ts`），一个菜单项要么有 `url`，要么有 `children`，类型上就不允许两者同时存在。侧边栏、面包屑、路由守卫都读这一份。
- 有权限控制时，先按权限过滤这份数据再渲染；过滤后子菜单为空的父级整项隐藏，只剩 1 个子项的按"提成一级"处理。

## 选中状态

- 选中状态**只由当前路由决定**，不要另存一个"当前菜单"状态。判断规则：`"/"` 精确匹配，其余路径同时匹配其子路径（`/users/42` 也让"用户列表"高亮）。
- 进入某个子页面时，它的父级自动展开；路由变化后也会自动展开（在渲染时调整状态，不用 `useEffect`）。
- 用户手动收起父级、而当前页就在里面时，父级显示为选中，用户才知道自己在哪。
- 选中样式用主色浅底 `bg-primary/10 text-primary`（深色 `bg-primary/20`），和悬停的灰底区分开。写在一个常量里所有菜单按钮共用，并且必须带 `!`（原因见「已踩过的坑」）。

## 折叠时的二级菜单

`SidebarMenuSub` 在图标态下会被隐藏，所以折叠时有子菜单的项改成**点击图标向右弹出浮层**（`DropdownMenu side="right"`）：浮层顶部是父级名称，下面是子项，当前页带对勾。没有子菜单的项悬停时显示名称（`SidebarMenuButton` 的 `tooltip` 属性，展开时自动不显示）。

有子菜单的项要手动嵌套 Tooltip，不能用 `tooltip` 属性：

```tsx
<DropdownMenu>
  <Tooltip>
    <TooltipTrigger asChild>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton isActive={childActive} aria-label={item.title}>
          <item.icon />
          <span>{item.title}</span>
        </SidebarMenuButton>
      </DropdownMenuTrigger>
    </TooltipTrigger>
    <TooltipContent side="right">{item.title}</TooltipContent>
  </Tooltip>
  <DropdownMenuContent side="right" align="start">…</DropdownMenuContent>
</DropdownMenu>
```

## 手机端

- 宽度小于 768px 时，shadcn 自动把侧边栏变成左侧抽屉（Sheet）。侧边栏顶部的按钮此时在抽屉里，抽屉关着时看不到，所以**顶栏左侧必须有一个只在手机端显示的按钮**：`<SidebarTrigger className="md:hidden" aria-label="打开菜单" />`。
- 点击菜单项后要关闭抽屉：链接上加 `onClick={() => isMobile && setOpenMobile(false)}`，否则抽屉会一直挡着新页面。
- 手机端的收放按钮不加 Tooltip：抽屉打开时焦点会自动落在它上面，Tooltip 会无故弹出。
- **顶栏在手机上必须保持一行。** 面包屑只显示当前页，过长用省略号截断；电脑上显示完整路径，同样不换行。顶栏右侧按钮区加 `shrink-0`，不被挤压。已在 320 / 360 / 390 / 768 / 1280 五种宽度实测：顶栏始终 56px、无横向滚动。
- 顶栏图标按钮统一 32px（`size-8`）。shadcn 的 `SidebarTrigger` 默认只有 28px，要手动加 `size-8`。

```tsx
<Breadcrumb className="min-w-0 flex-1">
  <BreadcrumbList className="flex-nowrap">
    {/* 非当前页的项和分隔符：className="hidden md:inline-flex" */}
    {/* 当前页：<BreadcrumbItem className="min-w-0"><BreadcrumbPage className="truncate"> */}
  </BreadcrumbList>
</Breadcrumb>
```

## 右上角个人入口

- 整个应用只有这一个用户菜单，位置在顶栏最右；侧边栏里不再放。
- 触发按钮：`Button variant="ghost" size="icon" className="rounded-full"` 包一个 `UserAvatar`，`aria-label="个人菜单"`。
- 菜单 `align="end"`，内容从上到下：
  1. 头像 + 姓名 + 邮箱（`DropdownMenuLabel`，过长截断）
  2. 个人设置
  3. 切换主题（子菜单，单选：浅色 / 深色 / 跟随系统）
  4. 分隔线后是退出登录（`variant="destructive"`）
- 主题偏好存 Zustand（`persist`），默认跟随系统；在 `App.tsx` 最外层调用一次 `useApplyTheme()` 把它同步到 `<html class="dark">`（不要放在外壳里，否则登录页不会变深色，见 `login.md`）。

## 头像

统一用 `UserAvatar`，**不要直接用 `Avatar` 拼，也不要用外链默认头像图片**。它在 shadcn `Avatar` 外面包了一层：有图片显示图片，没有图片或加载失败时显示自动生成的 SVG（加载失败的回退已实测）。

| 情况 | 显示 |
|---|---|
| 没有名字 | 默认人形剪影（主色浅底） |
| 有名字，`variant="soft"`（默认） | 首字母（主色浅底）：当前用户、单个头像 |
| 有名字，`variant="colorful"` | 首字母 + 按姓名配色：成员列表、评论、负责人等多人并列的地方 |

- 首字母规则：中文取第一个字（张小明 → 张）；英文取前两个单词的首字母（Li Xiao → LX），只有一个单词取前两个字母（Admin → AD）。
- 文字画在 SVG 里（`viewBox="0 0 40 40"`、`fill="currentColor"`），头像放大缩小时字号自动跟着变；颜色来自 token，深色模式自动适配。
- 按姓名配色：同一个名字永远得到同一个颜色（对名字做哈希后取色）。颜色来自 `--avatar-1…6`（见 `assets/navigation/avatar-tokens.css`），**只用于头像**。shadcn 中性主题的 `--chart-1…5` 全是灰色，不能拿来做头像配色。
- 尺寸用 `Avatar` 自带的 `sm`（24px）/ `default`（32px）/ `lg`（40px）。
- 名字为空时 `aria-label` 为"未设置头像"；头像旁边已有姓名文字时，屏幕阅读器会读两遍，可以接受，不要为此去掉 `aria-label`。

## 已踩过的坑

以下都是实测中真实出现过的问题，代码里已处理，改代码时不要把它们改回去：

1. **折叠后最后一个菜单项点不到。** 折叠时分组标题被上移 32px 并变成透明，但它仍然拦截鼠标，会盖住上一组最后一项。分组标题要加 `group-data-[collapsible=icon]:pointer-events-none`。
2. **悬停时选中色消失。** shadcn 的 `data-active:` 变体用 `:where()` 实现，优先级比 `hover:` 低，自定义的选中色在悬停时会被灰色盖掉。选中样式要写成 `data-active:bg-primary/10!` 这样带 `!` 的形式。
3. **折叠时点有子菜单的图标没反应。** 给它的 `SidebarMenuButton` 传了 `tooltip`，组件会在外面多包一层 Tooltip，`DropdownMenuTrigger asChild` 就套不到真正的按钮上。要按上文手动嵌套。
4. **漏了 `TooltipProvider`。** Sidebar 不会自动提供，必须在应用入口包一层。
5. **两份折叠状态。** 同时用 Provider 和 Zustand 存折叠状态，刷新或用快捷键切换后两边对不上。只用 Provider + cookie。
6. **手机端看不到菜单入口。** 收放按钮只放在侧边栏里，手机端抽屉关着时就没有入口了。顶栏要补一个 `md:hidden` 的按钮。
7. **`data-slot` 被覆盖。** `CollapsibleTrigger asChild` 套在 `SidebarMenuButton` 外时，按钮的 `data-slot` 会变成 `collapsible-trigger`。写样式或测试选择器时用 `data-sidebar="menu-button"`，不要用 `data-slot`。
8. **菜单名长时顶栏被撑破。** shadcn 的 `BreadcrumbList` 默认 `flex-wrap`，320px 手机上长名称会折成 3~4 行，超出 56px 顶栏、上半截被裁掉。必须按「手机端」一节改成单行截断。

## 交付检查

下面 24 项在参考实现上已全部实测通过；改动导航后至少手动走一遍：

- 展开：收放按钮在侧边栏顶部；侧边栏没有底部用户菜单；当前页所在的二级菜单自动展开并高亮；侧边栏顶部底线与顶栏底线对齐；分组之间有分隔线
- 折叠后侧边栏顶部不显示底线
- 折叠：点击后变为图标态；按钮仍在侧边栏顶部；状态写入 cookie；悬停图标显示名称；点击有子菜单的图标弹出浮层，点子项能跳转；刷新后仍是折叠
- 展开回来后当前子项高亮；手动收起父级时父级显示为选中
- 个人入口在右上角；菜单里有姓名、邮箱、个人设置、切换主题、退出登录；切换深色生效
- 头像：无名字、首字母、按姓名配色、图片加载失败四种情况都显示 SVG
- 手机端：顶栏有打开菜单按钮；长菜单名不换行、不出现横向滚动；抽屉顶部按钮是"关闭菜单"；点菜单后跳转并自动关闭抽屉
- 控制台没有运行时错误

用浏览器自动化走查时注意：Radix 的 DropdownMenu（折叠浮层、个人菜单）在**鼠标按下（pointerdown）**时打开，只派发合成 `click` 事件的工具打不开它，这不是代码缺陷。要用真实鼠标输入（如按坐标点击、Playwright 的 `click()`）。

## 未核实事项

- Next.js 项目里在服务端用 `cookies()` 读 `sidebar_state` 作为 `defaultOpen` 的写法（本文只验证了 Vite）。
- TanStack Router 下的替换写法（只做了 React Router 的完整验证）。
- 按权限过滤菜单的代码（规则已写，代码未提供）。
- 头像配色在其他品牌主色下的观感，需在真实主题下目测。
- 本文只管导航外壳的手机适配；表格、表单等页面内容在手机上的做法见 `admin-layouts.md`。
- 只在模拟的手机视口（无头浏览器）里测过，没有在真机上测；顶栏按钮 32px 小于苹果建议的 44pt 触控尺寸，真机上若觉得难点，可在手机端改成 `size-9`/`size-10`。
