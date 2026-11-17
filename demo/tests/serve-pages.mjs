// 模拟 GitHub Pages：按子路径 /admin-frontend-stack/ 构建到 dist-pages，只在该前缀下提供文件；
// 找不到的地址返回 404.html（状态码 404），和 Pages 的行为一致。供 deploy.spec.ts 使用。
import { execSync } from "node:child_process"
import fs from "node:fs"
import http from "node:http"
import path from "node:path"

const prefix = "/admin-frontend-stack/"
const root = path.resolve("dist-pages")
const port = 4174

execSync("npx vite build --outDir dist-pages --emptyOutDir", { stdio: "inherit", env: { ...process.env, BASE_PATH: prefix } })
fs.copyFileSync(path.join(root, "index.html"), path.join(root, "404.html"))

const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".woff2": "font/woff2" }
http
  .createServer((req, res) => {
    const url = decodeURIComponent((req.url ?? "/").split("?")[0])
    let file = url.startsWith(prefix) ? path.join(root, url.slice(prefix.length) || "index.html") : null
    if (file && fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html")
    if (file && fs.existsSync(file)) {
      res.writeHead(200, { "content-type": types[path.extname(file)] ?? "application/octet-stream" })
      fs.createReadStream(file).pipe(res)
      return
    }
    res.writeHead(404, { "content-type": types[".html"] })
    fs.createReadStream(path.join(root, "404.html")).pipe(res)
  })
  .listen(port, "127.0.0.1", () => console.log(`pages 模拟服务：http://127.0.0.1:${port}${prefix}`))
