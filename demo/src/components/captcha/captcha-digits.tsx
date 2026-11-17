import { RotateCw, ShieldCheck } from "lucide-react"

import { Input } from "@/components/ui/input"
import type { DigitsChallenge } from "@/api/captcha"

/**
 * 数字图形验证码：左边输入框（和登录页其他输入框同样式、同高 h-10，占满剩余宽度），右边是验证码图片。
 * 点图片换一张（常见做法），鼠标移上去显示"换一张"遮罩。答案在登录时随表单一起提交，由接口校验。
 */
export function CaptchaDigits({ challenge, value, onChange, onRefresh, disabled }: { challenge: DigitsChallenge; value: string; onChange: (v: string) => void; onRefresh: () => void; disabled?: boolean }) {
  return (
    <div className="flex w-full items-center gap-3" data-captcha="digits">
      <div className="relative min-w-0 flex-1">
        <ShieldCheck className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          id="captcha"
          data-captcha-input
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, challenge.length))}
          inputMode="numeric"
          autoComplete="off"
          placeholder="请输入右侧 4 位数字"
          maxLength={challenge.length}
          className="h-10 pl-9 tabular-nums"
          disabled={disabled}
        />
      </div>
      {/* ⚠️ 演示：图片是本地生成的 SVG；真实项目用后端返回的图片地址 */}
      <button
        type="button"
        onClick={onRefresh}
        disabled={disabled}
        title="看不清？换一张"
        aria-label="换一张验证码"
        className="group/captcha relative h-10 w-30 shrink-0 overflow-hidden rounded-lg ring-1 ring-input transition-shadow outline-none hover:ring-primary/50 disabled:opacity-50 in-data-[input=keyboard]:focus-visible:ring-3 in-data-[input=keyboard]:focus-visible:ring-ring/50"
      >
        <span className="block size-full [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: challenge.svg }} />
        <span className="absolute inset-0 flex items-center justify-center gap-1 bg-background/85 text-xs font-medium text-primary opacity-0 transition-opacity group-hover/captcha:opacity-100" aria-hidden="true">
          <RotateCw className="size-3.5" /> 换一张
        </span>
      </button>
    </div>
  )
}
