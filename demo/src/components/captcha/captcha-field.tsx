import { useCallback, useEffect, useRef, useState } from "react"
import { createCaptcha, type CaptchaChallenge, type CaptchaKind, type CaptchaProof } from "@/api/captcha"
import { CaptchaDigits } from "./captcha-digits"
import { CaptchaSlider } from "./captcha-slider"

/**
 * 验证码字段：按类型取题、渲染、把验证结果交给父组件。
 * - 滑块：拖动成功后拿到 token，回调 { token }
 * - 数字：输入的数字随时回调 { id, answer }，由登录接口校验
 * 换一张 / 验证失败都会重新取题，并回调 null 清空之前的结果。
 * active=false（所在的页签没显示）时不取题，只占位，避免隐藏的表单白白请求。
 */
export function CaptchaField({ kind, onProof, active = true, disabled }: { kind: CaptchaKind; onProof: (proof: CaptchaProof | null) => void; active?: boolean; disabled?: boolean }) {
  const [challenge, setChallenge] = useState<CaptchaChallenge | null>(null)
  const [answer, setAnswer] = useState("")
  const boxRef = useRef<HTMLDivElement>(null)

  const load = useCallback(() => {
    setChallenge(null)
    setAnswer("")
    onProof(null)
    let alive = true
    // 按容器实际宽度生成滑块：窄屏上整块按比例变小，而不是压缩图片（否则拼图位置会对不上）
    createCaptcha(kind, { width: boxRef.current?.clientWidth }).then((c) => {
      if (alive) setChallenge(c)
    })
    return () => {
      alive = false
    }
  }, [kind, onProof])

  useEffect(() => (active ? load() : undefined), [load, active])

  return (
    <div ref={boxRef} className="flex flex-col gap-2">
      {!active || !challenge ? (
        // 占位要和真实内容同结构、同尺寸：滑块占满宽度，图片固定高 80px（h-20），下面是 h-10 轨道。
        // 用固定高度的骨架屏会在加载完成后把整块撑高，切换登录方式时页面会跳。
        <div data-captcha-placeholder data-captcha-loading={!active ? undefined : true} aria-hidden="true" className="flex flex-col gap-2">
          {kind === "slider" ? (
            <>
              <div className="h-20 w-full rounded-lg bg-muted" />
              <div className="h-10 w-full rounded-lg bg-muted" />
            </>
          ) : (
            <div className="flex items-center gap-3">
              <div className="h-10 flex-1 rounded-lg bg-muted" />
              <div className="h-10 w-30 shrink-0 rounded-lg bg-muted" />
            </div>
          )}
        </div>
      ) : challenge.kind === "digits" ? (
        <CaptchaDigits
          challenge={challenge}
          value={answer}
          disabled={disabled}
          onChange={(v) => {
            setAnswer(v)
            onProof(v.length === challenge.length ? { id: challenge.id, answer: v } : null)
          }}
          onRefresh={load}
        />
      ) : (
        <CaptchaSlider
          challenge={challenge}
          disabled={disabled}
          onVerified={(token) => onProof({ token })}
          onRefresh={() => {
            void load()
          }}
        />
      )}
    </div>
  )
}
