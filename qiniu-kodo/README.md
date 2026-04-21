# ☁️ 七牛云 KODO 技能

一个精简的七牛云 KODO 图床上传技能：用于将本地生成的图片（例如封面图）上传到七牛云并返回公开 URL。

## ✨ 功能

- 📤 上传图片并返回公开 URL

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 配置凭证 (会优先在 ~/.kodo-config/qiniu-config.json 生成配置)
# 或者你也可以直接配置环境变量 QINIU_ACCESS_KEY, QINIU_SECRET_KEY, QINIU_REGION, QINIU_BUCKET, QINIU_DOMAIN
bash scripts/setup.sh --access-key "xxx" --secret-key "xxx" --region "z0" --bucket "mybucket"

# 测试连接
node scripts/qiniu_node.mjs test-connection
```

## 📖 使用示例

```bash
# 上传图片（默认输出单行 JSON，包含 url）
node scripts/qiniu_node.mjs upload --local /abs/path/to/cover.png --key image/post-cover.png

# 仅输出 URL（未配置 domain 时为空）
node scripts/qiniu_node.mjs upload --local /abs/path/to/cover.png --key image/post-cover.png --format text
```

## 🔧 架构

两层执行策略，保障环境兼容性：
1. **Node.js SDK** (`qiniu`) - 稳定可靠，推荐作为首选脚本调用方式
2. **qshell CLI** - 可选安装（当前主流程不依赖）

## 📄 许可证

MIT

## NOTE

本 Skill 在原 Clawhub 下载版本（`1.0.3`）基础上进行了优化：
- 移除了对 `qiniu-mcp-server` 强绑定的依赖逻辑，提升了在各种 Agent 平台上的通用兼容性
- 修复了 Node SDK 早期版本对于部分较新区域（如 `cn-east-2`）报 incorrect region 的错误
- 支持了更灵活的环境变量凭证读取机制
