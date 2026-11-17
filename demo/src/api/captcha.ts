/**
 * 验证码（演示实现）。两种：
 * - digits：数字图形验证码，输入图片里的 4 位数字
 * - slider：滑块验证码，把拼图拖到缺口处
 *
 * ⚠️ 这里为了演示，题目和答案都在前端生成；题目图片是 SVG 文本，答案可以从 DOM 里读出来。
 * 真实项目必须由后端生成图片（位图）并校验，前端只负责展示和把用户的操作结果提交上去。
 */

export type CaptchaKind = "digits" | "slider"

/** 登录时提交给后端的验证结果：滑块成功后拿到的 token，或者数字验证码的答案 */
export type CaptchaProof = { token: string } | { id: string; answer: string }

export class CaptchaError extends Error {}

// ---------- 通用 ----------
const rand = (min: number, max: number) => min + Math.random() * (max - min)
const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)]
const id = () => Math.random().toString(36).slice(2, 10)

const TTL = 5 * 60 * 1000
type Stored = { kind: CaptchaKind; answer: string | number; at: number; tolerance?: number }
const challenges = new Map<string, Stored>()
const tokens = new Map<string, number>()

function take(key: string) {
  const item = challenges.get(key)
  challenges.delete(key) // 一次性：无论对错都作废
  if (!item || Date.now() - item.at > TTL) throw new CaptchaError("验证码已过期，请重新获取")
  return item
}

// ---------- 数字图形验证码 ----------
export type DigitsChallenge = { id: string; kind: "digits"; svg: string; length: number }

const DIGIT_COLORS = ["oklch(0.42 0.16 285)", "oklch(0.45 0.14 250)", "oklch(0.48 0.16 25)", "oklch(0.43 0.12 160)"]

function buildDigitsSvg(code: string) {
  const w = 120
  const h = 40
  const chars = [...code]
  const step = (w - 16) / chars.length
  const digits = chars
    .map((ch, i) => {
      const cx = 9 + step * i + step / 2 + rand(-2, 2)
      const cy = h / 2 + rand(-2, 2)
      const rotate = rand(-22, 22)
      const size = rand(24, 29)
      return `<text x="${cx}" y="${cy}" fill="${pick(DIGIT_COLORS)}" font-family="ui-monospace, monospace" font-size="${size}" font-weight="700" text-anchor="middle" dominant-baseline="central" transform="rotate(${rotate.toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)})" opacity="${rand(0.82, 1).toFixed(2)}">${ch}</text>`
    })
    .join("")
  const lines = Array.from({ length: 2 }, () => {
    const y1 = rand(6, h - 6)
    const y2 = rand(6, h - 6)
    return `<path d="M${rand(0, 12)} ${y1.toFixed(1)} Q${w / 2} ${rand(0, h).toFixed(1)} ${w - rand(0, 12)} ${y2.toFixed(1)}" stroke="${pick(DIGIT_COLORS)}" stroke-width="${rand(0.8, 1.6).toFixed(1)}" fill="none" opacity="0.45"/>`
  }).join("")
  const dots = Array.from({ length: 26 }, () => `<circle cx="${rand(2, w - 2).toFixed(1)}" cy="${rand(2, h - 2).toFixed(1)}" r="${rand(0.5, 1.4).toFixed(1)}" fill="oklch(0.5 0.04 285)" opacity="${rand(0.15, 0.45).toFixed(2)}"/>`).join("")
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="数字图形验证码"><rect width="${w}" height="${h}" fill="oklch(0.97 0.008 285)"/>${dots}${lines}${digits}</svg>`
}

async function createDigitsChallenge(): Promise<DigitsChallenge> {
  const code = Array.from({ length: 4 }, () => pick("23456789".split(""))).join("")
  const key = id()
  challenges.set(key, { kind: "digits", answer: code, at: Date.now() })
  return { id: key, kind: "digits", svg: buildDigitsSvg(code), length: 4 }
}

// ---------- 滑块验证码 ----------
/** 滑块图片固定高 80px：标题 + 图片 + 轨道整块正好等于"用户名 + 密码"两个字段的高度（2026-11-17 用户要求） */
export const SLIDER_IMAGE_HEIGHT = 80

/**
 * 滑块宽度按可用宽度生成（不缩放图片），高度固定：窄屏上图片变窄，而不是压缩图片，
 * 否则拼图的位置（绝对像素）会和背景对不上。
 */
export function sliderSize(available?: number) {
  const width = Math.min(480, Math.max(200, Math.round(available ?? 320)))
  // 拼图边长取图片高度的一半：再大显得挤，再小不好辨认、不好对准
  return { width, height: SLIDER_IMAGE_HEIGHT, piece: 40, knob: 7, tolerance: 6 }
}

export type SliderChallenge = {
  id: string
  kind: "slider"
  /** 带缺口的背景图（data URL）。缺口位置已经画在图里，答案不下发给前端 */
  image: string
  /** 不带缺口的原图，只用来给拼图取图案（真实项目里后端直接返回拼图小图） */
  pieceImage: string
  width: number
  height: number
  /** 拼图边长（不含凸起） */
  piece: number
  /** 凸起半径 */
  knob: number
  /** 拼图轮廓（SVG path），宽 piece + knob、高 piece */
  piecePath: string
  /** 拼图初始的纵向位置 */
  pieceY: number
  tolerance: number
}

const SLIDER_COLORS = ["oklch(0.58 0.21 285)", "oklch(0.68 0.15 220)", "oklch(0.78 0.15 70)", "oklch(0.64 0.19 345)", "oklch(0.66 0.15 160)", "oklch(0.52 0.18 265)"]

/** 拼图轮廓：正方形，右侧中部有一个圆形凸起 */
function puzzlePath(size: number, knob: number) {
  const mid = size / 2
  return `M0 0 H${size} V${mid - knob} A${knob} ${knob} 0 1 1 ${size} ${mid + knob} V${size} H0 Z`
}

function buildBackground(w: number, h: number) {
  // 底色用斜向渐变，图形颜色更饱满、更不透明，整张图不再发灰发淡
  const parts = [
    `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="oklch(0.86 0.07 285)"/><stop offset="1" stop-color="oklch(0.84 0.08 210)"/></linearGradient></defs>`,
    `<rect width="${w}" height="${h}" fill="url(#bg)"/>`,
  ]
  const count = Math.round(w / 34)
  for (let i = 0; i < count; i++) {
    const color = pick(SLIDER_COLORS)
    const opacity = rand(0.6, 0.95).toFixed(2)
    if (Math.random() < 0.5) {
      parts.push(`<circle cx="${rand(0, w).toFixed(0)}" cy="${rand(0, h).toFixed(0)}" r="${rand(12, 34).toFixed(0)}" fill="${color}" opacity="${opacity}"/>`)
    } else {
      const x = rand(-20, w - 30)
      const y = rand(-20, h - 20)
      parts.push(`<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${rand(30, 80).toFixed(0)}" height="${rand(20, 56).toFixed(0)}" rx="${rand(4, 12).toFixed(0)}" fill="${color}" opacity="${opacity}" transform="rotate(${rand(-25, 25).toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)})"/>`)
    }
  }
  return parts.join("")
}

function svgToDataUrl(inner: string, w: number, h: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${inner}</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

async function createSliderChallenge(available?: number): Promise<SliderChallenge> {
  const { width, height, piece, knob, tolerance } = sliderSize(available)
  const pieceY = Math.round(rand(8, height - piece - 8))
  const holeX = Math.round(rand(piece + 20, Math.min(width - piece - knob - 10, width - 50)))
  const path = puzzlePath(piece, knob)
  const background = buildBackground(width, height)
  // 缺口：深色填充 + 左上内阴影 + 白色描边，看起来是"凹进去"的
  const at = `translate(${holeX} ${pieceY})`
  const hole = [
    `<defs><clipPath id="hole"><path d="${path}" transform="${at}"/></clipPath></defs>`,
    `<g clip-path="url(#hole)"><path d="${path}" transform="${at}" fill="oklch(0.18 0.03 285 / 0.62)"/>`,
    `<path d="${path}" transform="translate(${holeX + 2} ${pieceY + 3})" fill="none" stroke="oklch(0 0 0 / 0.5)" stroke-width="6"/></g>`,
    `<path d="${path}" transform="${at}" fill="none" stroke="oklch(1 0 0 / 0.8)" stroke-width="1.2"/>`,
  ].join("")
  const key = id()
  challenges.set(key, { kind: "slider", answer: holeX, at: Date.now(), tolerance })
  return { id: key, kind: "slider", image: svgToDataUrl(background + hole, width, height), pieceImage: svgToDataUrl(background, width, height), width, height, piece, knob, piecePath: path, pieceY, tolerance }
}

// ---------- 对外接口 ----------
export type CaptchaChallenge = DigitsChallenge | SliderChallenge

export async function createCaptcha(kind: CaptchaKind, opts?: { width?: number }): Promise<CaptchaChallenge> {
  await new Promise((r) => setTimeout(r, 180))
  return kind === "digits" ? createDigitsChallenge() : createSliderChallenge(opts?.width)
}

/** 滑块松手时调用：偏移量对得上就发一个 token，之后登录带上它 */
export async function verifySlider(challengeId: string, offset: number): Promise<{ token: string }> {
  const item = take(challengeId)
  if (item.kind !== "slider") throw new CaptchaError("验证码类型不匹配")
  if (Math.abs(Number(item.answer) - offset) > (item.tolerance ?? 6)) throw new CaptchaError("拼图没对上，请再试一次")
  const token = `${id()}${id()}`
  tokens.set(token, Date.now() + TTL)
  return { token }
}

/** 滑块成功后的 token 只能用一次 */
export function consumeCaptchaToken(token: string): boolean {
  const expire = tokens.get(token)
  tokens.delete(token)
  return expire !== undefined && Date.now() < expire
}

/** 数字验证码在登录时一起提交，这里由登录接口调用 */
export function verifyDigits(challengeId: string, answer: string): boolean {
  const item = take(challengeId)
  if (item.kind !== "digits") throw new CaptchaError("验证码类型不匹配")
  return String(item.answer) === answer.trim()
}
