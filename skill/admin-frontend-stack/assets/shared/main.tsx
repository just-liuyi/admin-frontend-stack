import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { trackInputModality } from "@/lib/input-modality"
import "./index.css"
import App from "./App.tsx"

/**
 * 应用入口：最外层要包的东西一次放全，缺一个都会在运行时报错或功能失效。
 * - QueryClientProvider：接口数据；页签"刷新"也靠它重新请求
 * - BrowserRouter：路由；basename 取 Vite 的 base，部署在子路径（如 GitHub Pages）时路由也能对上
 * - TooltipProvider：侧边栏折叠时的悬停提示依赖它
 * - Toaster：操作结果提示（登录成功等）
 * - trackInputModality()：区分键盘/鼠标，页签只在键盘操作时显示焦点框
 */
trackInputModality()

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } } })

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <TooltipProvider delayDuration={0}>
          <App />
          <Toaster richColors position="top-center" />
        </TooltipProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
