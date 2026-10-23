/**
 * 记录用户最近一次用的是键盘还是鼠标/触屏，写到 <html data-input="keyboard|pointer">。
 * 用途：Chromium 在页面刚打开、还没有任何交互时，第一次鼠标点击 Radix Tabs 页签也会判定为 :focus-visible，
 * 出现键盘焦点框。需要"只在键盘操作时显示焦点框"的组件，用 in-data-[input=keyboard]:focus-visible:… 写样式。
 * 在 main.tsx 里调用一次。
 */
export function trackInputModality() {
  const root = document.documentElement
  root.dataset.input = "pointer"
  window.addEventListener("keydown", (e) => {
    // 只有导航类按键才算键盘操作；在输入框里打字不改变
    if (e.key === "Tab" || e.key.startsWith("Arrow") || e.key === "Home" || e.key === "End") root.dataset.input = "keyboard"
  }, true)
  window.addEventListener("pointerdown", () => {
    root.dataset.input = "pointer"
  }, true)
}
