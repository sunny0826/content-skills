---
name: qiniu-kodo
description: |
  当用户要把本地图片上传到七牛云 KODO、为 Hugo/Markdown 封面获取公开 URL、或 content-creator/generate-cover 需要上传 cover.png 并回填 image 字段时使用。
  主流程只有 test-connection 和 upload；不要读取 .env/.env.* 猜配置，配置可用性通过脚本判断。
metadata:
  {
    "openclaw":
      {
        "emoji": "☁️",
        "requires": { "bins": ["node"] },
        "install":
          [
            { "id": "qiniu-sdk", "kind": "node", "package": "qiniu", "label": "Install qiniu Node.js SDK" },
          ],
      },
  }
---

# ☁️ 七牛云 KODO 图床上传 Skill

此 Skill 用于把本地生成的图片（最常见是封面 `cover.png`）上传到七牛云 KODO，并返回可用于 Hugo/Markdown 的公开 URL。

## 你需要提供的信息

- `local`：要上传的本地图片绝对路径（通常来自 generate-cover 的输出）
- `key`：上传到 KODO 的对象 Key（推荐统一使用 `image/` 前缀，例如 `image/<slug>-cover.png`）
- `domain`：用于拼接公开访问 URL 的 CDN 域名（强烈建议配置）

## 可用资源

- `scripts/qiniu_node.mjs`：唯一推荐入口，支持 `test-connection` 和 `upload`。
- `config/qiniu-config.example.json`：配置格式参考；不要读取真实配置文件内容并展示给用户。

## Gotchas

- **不要探测 `.env`**：不得用 `find`、`cat`、`rg` 等方式寻找或打印密钥配置。
- **先测再传**：上游工作流里先跑 `test-connection`；失败就让上游保留空 `image` 并说明配置问题。
- **没有 domain 就没有可回填 URL**：上传可能成功但 `--format text` 为空，表示缺少 `QINIU_DOMAIN` 或配置域名。
- **日志保持短**：能用 `--format text` 时只返回 URL；需要调试时再看 JSON。

## 配置方式

优先读取 `~/.kodo-config/qiniu-config.json`，其次读取 `qiniu-kodo/config/qiniu-config.json`（向后兼容），否则读取环境变量：
- `QINIU_ACCESS_KEY`
- `QINIU_SECRET_KEY`
- `QINIU_BUCKET`
- `QINIU_REGION`（可选，默认 `z0`）
- `QINIU_DOMAIN`（可选，但若不配置则无法返回 `url`）

`~/.kodo-config/qiniu-config.json` 示例：

```json
{
  "accessKey": "YOUR_ACCESS_KEY",
  "secretKey": "YOUR_SECRET_KEY",
  "bucket": "mybucket",
  "region": "z0",
  "domain": "https://cdn.example.com"
}
```

## 运行方式（唯一主流程：上传图片）

### 推荐工作流（先测再传）

- **禁止探测或读取 `.env` / `.env.*`**：不得通过 `find . -name '.env*'`、`cat .env` 等方式确认配置；这会引入误读密钥文件的风险。配置可用性只允许通过 `test-connection` 判断。
- 推荐在上传前先执行一次连通性测试：失败则直接跳过上传，让上游流程保留空 `image` 并提示用户修复配置。

```bash
node scripts/qiniu_node.mjs test-connection --cache-dir ./.qiniu-deps
```

```bash
node scripts/qiniu_node.mjs upload \
  --local "/abs/path/to/cover.png" \
  --key "image/my-post-cover.png" \
  --cache-dir ./.qiniu-deps  # (可选) 自定义依赖缓存目录，默认 ~/.cache/qiniu-kodo-skill
```

*提示：`qiniu-kodo` 使用了和 `gen-cover-skill` 一致的依赖管理策略，首次运行时会自动静默安装 `qiniu` 依赖并进行缓存，不再需要手动执行 `npm install`。*

也可以不传 `--key`，此时会按 `--prefix` 与文件名自动生成：

```bash
node scripts/qiniu_node.mjs upload \
  --local "/abs/path/to/cover.png" \
  --prefix "image/"
```

## 输出格式

默认输出为单行 JSON，便于其它 Skill/Agent 稳定解析：

```json
{"success":true,"key":"image/my-post-cover.png","hash":"...","url":"https://cdn.example.com/image/my-post-cover.png","size":12345,"bucket":"mybucket"}
```

推荐默认使用 `--format text` 仅输出 URL，降低日志噪声（若未配置 domain，则输出为空行，表示无法回填 `image` 字段）：

```bash
node scripts/qiniu_node.mjs upload --local "/abs/path/to/cover.png" --key "image/x.png" --format text
```
