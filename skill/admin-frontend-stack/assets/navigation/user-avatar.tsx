import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

// ⚠️ 完整类名写在数组里，不能拼接 `bg-avatar-${n}`（Tailwind 不识别）
const colorfulTones = [
  "bg-avatar-1 text-avatar-foreground",
  "bg-avatar-2 text-avatar-foreground",
  "bg-avatar-3 text-avatar-foreground",
  "bg-avatar-4 text-avatar-foreground",
  "bg-avatar-5 text-avatar-foreground",
  "bg-avatar-6 text-avatar-foreground",
]
const softTone = "bg-primary/10 text-primary dark:bg-primary/20"

/** 同一个名字永远得到同一个颜色 */
function hashName(name: string) {
  let h = 0
  for (const ch of name) h = (h * 31 + (ch.codePointAt(0) ?? 0)) >>> 0
  return h
}

/** 中文取第一个字；英文取前两个单词的首字母，只有一个单词时取前两个字母 */
export function getInitials(name: string) {
  const n = name.trim()
  if (!n) return ""
  if (/[\u3400-\u9fff]/.test(n)) return Array.from(n)[0]
  const words = n.split(/[\s._-]+/).filter(Boolean)
  const raw = words.length >= 2 ? words[0][0] + words[1][0] : words[0].slice(0, 2)
  return raw.toUpperCase()
}

function InitialsSvg({ text }: { text: string }) {
  return (
    <svg viewBox="0 0 40 40" className="size-full" aria-hidden="true">
      <text
        x="20"
        y="20"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={text.length > 1 ? 15 : 18}
        fontWeight={600}
        fill="currentColor"
      >
        {text}
      </text>
    </svg>
  )
}

function PersonSvg() {
  return (
    <svg viewBox="0 0 40 40" className="size-full" aria-hidden="true" fill="currentColor">
      <circle cx="20" cy="16" r="7" />
      <path d="M6 38c1.5-7.5 7.2-12 14-12s12.5 4.5 14 12z" />
    </svg>
  )
}

type UserAvatarProps = {
  name?: string
  /** 用户上传的头像；加载失败或为空时自动回落到生成的 SVG */
  src?: string
  size?: "sm" | "default" | "lg"
  /** soft：主色浅底（当前用户、单个头像）；colorful：按姓名配色（成员列表等多人场景） */
  variant?: "soft" | "colorful"
  className?: string
}

export function UserAvatar({ name = "", src, size = "default", variant = "soft", className }: UserAvatarProps) {
  const initials = getInitials(name)
  const tone = initials && variant === "colorful" ? colorfulTones[hashName(name) % colorfulTones.length] : softTone

  return (
    <Avatar size={size} className={className}>
      {src ? <AvatarImage src={src} alt={name} /> : null}
      <AvatarFallback role="img" aria-label={name || "未设置头像"} className={cn("overflow-hidden", tone)}>
        {initials ? <InitialsSvg text={initials} /> : <PersonSvg />}
      </AvatarFallback>
    </Avatar>
  )
}
