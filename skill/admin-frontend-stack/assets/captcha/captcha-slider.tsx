import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react"
import { Check, ChevronsRight, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { verifySlider, type SliderChallenge } from "@/api/captcha"

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

/** 滑块按钮宽 44px，轨道有 1px 边框、按钮四周留 2px：可拖动的最大距离 = 宽度 - 50 */
export const SLIDER_TRACK_RESERVED = 50

/**
 * 滑块验证码：拖动下方滑块，把上方的拼图移到缺口处。
 * 外观和登录页的输入框统一：占满表单宽度、圆角 rounded-lg、1px 输入框边框、轨道高 h-10（与输入框同高）。
 * 松手时把偏移量交给接口校验（答案不保存在前端），成功后回调 token。
 */
export function CaptchaSlider({ challenge, onVerified, onRefresh, disabled }: { challenge: SliderChallenge; onVerified: (token: string) => void; onRefresh: () => void; disabled?: boolean }) {
  const max = challenge.width - SLIDER_TRACK_RESERVED
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [status, setStatus] = useState<"idle" | "checking" | "ok" | "error">("idle")
  const [message, setMessage] = useState<string | null>(null)
  const startX = useRef(0)
  const retryTimer = useRef<number | undefined>(undefined)
  const done = status === "ok"

  // 组件卸载（换页签、换题）时清掉"失败后换一张"的定时器，避免对已卸载的组件操作
  useEffect(() => () => window.clearTimeout(retryTimer.current), [])

  async function verify(offset: number) {
    // 没拖动（只是点了一下）不算一次尝试，不消耗题目
    if (offset < 4) {
      setDragX(0)
      return
    }
    setStatus("checking")
    setMessage(null)
    try {
      const { token } = await verifySlider(challenge.id, Math.round(offset))
      setStatus("ok")
      onVerified(token)
    } catch (e) {
      setStatus("error")
      setMessage(e instanceof Error ? e.message : "验证失败，请重试")
      // 题目已作废：稍等让用户看清提示，再换一张
      retryTimer.current = window.setTimeout(onRefresh, 900)
    }
  }

  const locked = disabled || done || status === "checking" || status === "error"
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (locked) return
    e.currentTarget.setPointerCapture(e.pointerId)
    startX.current = e.clientX - dragX
    setDragging(true)
  }
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragging) setDragX(clamp(e.clientX - startX.current, 0, max))
  }
  const onPointerUp = () => {
    if (!dragging) return
    setDragging(false)
    void verify(dragX)
  }
  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (locked) return
    const keys = ["ArrowRight", "ArrowLeft", "Home", "End", "Enter", " "]
    if (!keys.includes(e.key)) return
    e.preventDefault()
    if (e.key === "Enter" || e.key === " ") return void verify(dragX)
    const step = e.shiftKey ? 20 : 4
    setDragX((x) => clamp(e.key === "ArrowRight" ? x + step : e.key === "ArrowLeft" ? x - step : e.key === "Home" ? 0 : max, 0, max))
  }

  const tip = done ? "验证通过" : status === "checking" ? "验证中…" : status === "error" ? (message ?? "验证失败，请重试") : "向右拖动滑块完成拼图"

  return (
    <div className="flex w-full flex-col gap-2" data-captcha="slider">
      {/* 背景图（缺口已画在图里） + 跟随滑块移动的拼图 */}
      {/* ⚠️ 用 ring 而不是 border：border 会占 2px，图片和拼图的像素坐标就对不上了 */}
      <div className="relative overflow-hidden rounded-lg shadow-sm ring-1 ring-black/10 dark:ring-white/15" style={{ width: challenge.width, height: challenge.height }}>
        <img src={challenge.image} alt="拖动下方滑块，把拼图缺口补齐" width={challenge.width} height={challenge.height} className="block select-none" draggable={false} />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-lg shadow-[inset_0_1px_3px_oklch(0_0_0/0.25)]" />
        {/* 拼图：图案取自"不带缺口的原图"（用带缺口的图，拖到位后看到的就是灰色缺口本身）。
            阴影加在外层：clip-path 会把元素自己的阴影也裁掉 */}
        <div aria-hidden="true" className="pointer-events-none absolute drop-shadow-[0_3px_5px_oklch(0_0_0/0.55)]" style={{ left: dragX, top: challenge.pieceY }}>
          <div
            data-piece
            style={{
              width: challenge.piece + challenge.knob,
              height: challenge.piece,
              clipPath: `path("${challenge.piecePath}")`,
              backgroundImage: `url("${challenge.pieceImage}")`,
              backgroundSize: `${challenge.width}px ${challenge.height}px`,
              backgroundPosition: `${-dragX}px ${-challenge.pieceY}px`,
            }}
          />
        </div>
        {/* 描边：clip-path 会把元素自身的边框裁掉，所以单独画一层轮廓 */}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute"
          style={{ left: dragX, top: challenge.pieceY, width: challenge.piece + challenge.knob, height: challenge.piece }}
          viewBox={`0 0 ${challenge.piece + challenge.knob} ${challenge.piece}`}
        >
          <path d={challenge.piecePath} fill="none" stroke="oklch(1 0 0 / 0.95)" strokeWidth="2" />
        </svg>
      </div>

      {/* 轨道：和输入框同高、同边框、同圆角 */}
      <div
        className={cn(
          "relative h-10 overflow-hidden rounded-lg border border-input bg-linear-to-b from-muted to-muted/40 shadow-[inset_0_1px_3px_oklch(0_0_0/0.12)] transition-colors dark:from-input/60 dark:to-input/20",
          done && "border-success/60 from-success/20 to-success/10",
          status === "error" && "animate-shake border-destructive/50 bg-destructive/5 motion-reduce:animate-none",
        )}
        style={{ width: challenge.width }}
      >
        {/* 已拖过的部分 */}
        {!done ? <div className="absolute inset-y-0 left-0 bg-linear-to-r from-primary/10 to-primary/25" style={{ width: dragX + 24 }} /> : null}
        {/* 拖动时提示淡出（否则被按钮压住）；通过后按钮隐藏，整条变绿、居中显示结果 */}
        <span
          aria-live="polite"
          className={cn(
            "pointer-events-none absolute inset-0 flex items-center justify-center gap-1.5 text-sm transition-opacity",
            !done && "pl-12",
            done ? "font-medium text-success" : status === "error" ? "text-destructive" : "text-muted-foreground",
            status === "idle" && dragX > 0 && "opacity-0",
          )}
        >
          {done ? <Check className="size-4" /> : null}
          {tip}
        </span>
        <div
          role="slider"
          tabIndex={disabled || done ? -1 : 0}
          aria-label="拖动滑块完成拼图"
          aria-valuemin={0}
          aria-valuemax={Math.round(max)}
          aria-valuenow={Math.round(dragX)}
          aria-valuetext={done ? "验证通过" : `已拖动 ${Math.round((dragX / max) * 100)}%`}
          aria-disabled={locked}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => setDragging(false)}
          onKeyDown={onKeyDown}
          className={cn(
            "absolute top-0.5 bottom-0.5 left-0.5 flex w-11 touch-none items-center justify-center rounded-md border border-black/10 bg-linear-to-b from-white to-zinc-100 text-primary shadow-[0_1px_2px_oklch(0_0_0/0.15),0_3px_8px_oklch(0_0_0/0.12)] outline-none transition-[color,box-shadow,background] dark:border-white/10 dark:from-zinc-600 dark:to-zinc-800 dark:text-primary-foreground in-data-[input=keyboard]:focus-visible:ring-3 in-data-[input=keyboard]:focus-visible:ring-ring/50",
            !locked && "cursor-grab hover:shadow-[0_1px_2px_oklch(0_0_0/0.18),0_4px_12px_oklch(0_0_0/0.18)] active:cursor-grabbing",
            dragging && "cursor-grabbing border-primary from-primary to-primary text-primary-foreground shadow-[0_2px_10px_var(--color-primary)]",
            done && "hidden",
            status === "error" && "border-destructive/50 text-destructive",
          )}
          style={{ transform: `translateX(${dragX}px)` }}
        >
          {done ? <Check className="size-4" /> : status === "error" ? <X className="size-4" /> : <ChevronsRight className="size-4" />}
        </div>
      </div>
    </div>
  )
}
