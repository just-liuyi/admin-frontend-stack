import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

/**
 * 登录页左侧的互动小人（纯 CSS 绘制，无图片）。
 * idle：跟着鼠标歪头、转眼珠；watch：看向右侧表单；peek：输入密码时最高的小人伸长脖子偷看；
 * avert：显示密码时全体站直、看向别处；error：登录失败时低头。
 * 四种颜色每次打开页面随机分配给四个小人（同一次访问内不变）。
 * 系统开启"减少动态效果"时不跟随鼠标、不做动画。
 */
export type Mood = "idle" | "watch" | "peek" | "avert" | "error"

type Look = { x: number; y: number }
type Pose = { skew: number; shift: number; grow: number; look: Look }
const P = (o: Partial<Pose> = {}): Pose => ({ skew: 0, shift: 0, grow: 0, look: { x: 0, y: 0 }, ...o })

/** 四种颜色（--mascot-1…4）。dark：深色身体，五官要用白色，否则看不见 */
const palette = [
  { body: "bg-mascot-1", dark: true },
  { body: "bg-mascot-2", dark: true },
  { body: "bg-mascot-3", dark: false },
  { body: "bg-mascot-4", dark: false },
] as const
type Color = (typeof palette)[number]

type Eye = { kind: "ball" | "dot"; top: number; left: number; gap: number; size: number }
type Char = { id: string; x: number; w: number; h: number; radius: string; eyes: Eye; mouth?: { top: number; left: number; w: number } }

// 坐标系：440 × 440 的舞台，所有小人底边贴着舞台底部
const chars: Char[] = [
  { id: "tall", x: 70, w: 180, h: 400, radius: "10px 10px 0 0", eyes: { kind: "ball", top: 30, left: 30, gap: 30, size: 18 } },
  { id: "dark", x: 232, w: 120, h: 310, radius: "8px 8px 0 0", eyes: { kind: "ball", top: 24, left: 20, gap: 22, size: 16 } },
  { id: "round", x: 0, w: 240, h: 200, radius: "120px 120px 0 0", eyes: { kind: "dot", top: 78, left: 62, gap: 30, size: 12 } },
  { id: "yellow", x: 300, w: 140, h: 230, radius: "70px 70px 0 0", eyes: { kind: "dot", top: 48, left: 38, gap: 24, size: 12 }, mouth: { top: 78, left: 26, w: 80 } },
]

const right: Look = { x: 4, y: 1 }
const moodPoses: Record<Exclude<Mood, "idle">, Pose[]> = {
  watch: chars.map(() => P({ skew: -6, look: right })),
  peek: [P({ skew: -18, shift: 40, grow: 40, look: { x: 4, y: 2 } }), P({ skew: -9, look: right }), P({ skew: -6, look: right }), P({ skew: -6, look: right })],
  avert: chars.map(() => P({ look: { x: -4, y: -4 } })),
  error: chars.map(() => P({ look: { x: 0, y: 3 } })),
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

/** 洗牌（Fisher–Yates） */
function shuffle<T>(list: readonly T[]): T[] {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function LoginMascots({ mood, shake }: { mood: Mood; shake: number }) {
  const refs = useRef<(HTMLDivElement | null)[]>([])
  const [follow, setFollow] = useState<Pose[]>(() => chars.map(() => P()))
  // 只在组件第一次挂载时随机一次：刷新页面换颜色，输入过程中不变
  const [colors] = useState<Color[]>(() => shuffle(palette))

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    let frame = 0
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        setFollow(
          chars.map((_, i) => {
            const el = refs.current[i]
            if (!el) return P()
            const r = el.getBoundingClientRect()
            const dx = e.clientX - (r.left + r.width / 2)
            const dy = e.clientY - (r.top + r.height * 0.15)
            const dist = Math.hypot(dx, dy) || 1
            return P({ skew: -clamp(dx / 80, -6, 6), look: { x: (dx / dist) * 4, y: (dy / dist) * 4 } })
          }),
        )
      })
    }
    window.addEventListener("pointermove", onMove)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("pointermove", onMove)
    }
  }, [])

  const poses = mood === "idle" ? follow : moodPoses[mood]

  return (
    // shake 变化时重新挂载这一层，触发一次摇头动画
    <div key={shake} className={cn("relative", shake > 0 && "animate-shake motion-reduce:animate-none")} style={{ width: 440, height: 440 }} aria-hidden="true">
      {chars.map((c, i) => {
        const p = poses[i]
        const color = colors[i]
        // 深色身体上用白色五官，浅色身体上用深色五官
        const ink = color.dark ? "bg-white" : "bg-mascot-ink"
        return (
          <div
            key={c.id}
            ref={(el) => {
              refs.current[i] = el
            }}
            data-mascot={c.id}
            data-color={color.body}
            className={cn("absolute bottom-0 origin-bottom transition-[transform,height] duration-700 ease-in-out motion-reduce:transition-none", color.body)}
            style={{ left: c.x, width: c.w, height: c.h + p.grow, borderRadius: c.radius, transform: `translateX(${p.shift}px) skewX(${p.skew}deg)` }}
          >
            {/* 每个小人错开眨眼，避免所有眼睛同时闭上 */}
            <Eyes eye={c.eyes} look={p.look} blinkDelay={-i * 1.3} ink={ink} />
            {c.mouth ? <span data-mouth className={cn("absolute h-1 rounded-full", ink)} style={{ top: c.mouth.top, left: c.mouth.left, width: c.mouth.w }} /> : null}
          </div>
        )
      })}
    </div>
  )
}

function Eyes({ eye, look, blinkDelay, ink }: { eye: Eye; look: Look; blinkDelay: number; ink: string }) {
  const lookStyle = { transform: `translate(${look.x}px, ${look.y}px)` }
  return (
    <div className="absolute flex" style={{ top: eye.top, left: eye.left, gap: eye.gap }}>
      {[0, 1].map((k) => (
        // 外层负责眨眼（scaleY），内层负责看向某处（translate），两个 transform 分开才不会互相覆盖
        <span key={k} className="flex animate-blink motion-reduce:animate-none" style={{ animationDelay: `${blinkDelay}s` }}>
          {eye.kind === "ball" ? (
            // 白眼球加一圈淡描边：落在浅色身体上也看得清
            <span className="flex items-center justify-center rounded-full bg-white ring-1 ring-mascot-ink/15" style={{ width: eye.size, height: eye.size }}>
              <span data-pupil className="rounded-full bg-mascot-ink transition-transform duration-200 ease-out motion-reduce:transition-none" style={{ width: eye.size * 0.4, height: eye.size * 0.4, ...lookStyle }} />
            </span>
          ) : (
            <span data-pupil className={cn("rounded-full transition-transform duration-200 ease-out motion-reduce:transition-none", ink)} style={{ width: eye.size, height: eye.size, ...lookStyle }} />
          )}
        </span>
      ))}
    </div>
  )
}
