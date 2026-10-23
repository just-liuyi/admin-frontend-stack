import { useEffect } from "react"
import { create } from "zustand"
import { persist } from "zustand/middleware"

export type Theme = "light" | "dark" | "system"

type ThemeState = { theme: Theme; setTheme: (theme: Theme) => void }

export const useThemeStore = create<ThemeState>()(
  persist((set) => ({ theme: "system", setTheme: (theme) => set({ theme }) }), { name: "theme" }),
)

/** 在应用根部调用一次：把主题偏好同步到 <html class="dark"> */
export function useApplyTheme() {
  const theme = useThemeStore((s) => s.theme)
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && media.matches)
      document.documentElement.classList.toggle("dark", dark)
    }
    apply()
    media.addEventListener("change", apply)
    return () => media.removeEventListener("change", apply)
  }, [theme])
}
