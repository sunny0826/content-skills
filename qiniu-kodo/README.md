# ☁️ 七牛云 KODO 技能

一个通用的七牛云对象存储（KODO）管理技能，适配各大主流 AI Agent 平台及 OpenClaw。

## ✨ 功能

- 📤 上传文件
- 📥 下载文件
- 📋 列出文件
- 🗑️ 删除文件
- 🔗 获取文件 URL（支持私有空间签名）
- 📊 查看文件信息
- 📁 移动/复制文件

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 配置凭证
# 或者你也可以直接配置环境变量 QINIU_ACCESS_KEY, QINIU_SECRET_KEY, QINIU_REGION, QINIU_BUCKET
bash scripts/setup.sh --access-key "xxx" --secret-key "xxx" --region "z0" --bucket "mybucket"

# 测试连接
node scripts/qiniu_node.mjs test-connection
```

## 📖 使用示例

```bash
# 上传
node scripts/qiniu_node.mjs upload --local file.txt --key image/file.txt

# 列出
node scripts/qiniu_node.mjs list --prefix image/

# 下载
node scripts/qiniu_node.mjs download --key image/file.txt --local file.txt

# 删除
node scripts/qiniu_node.mjs delete --key image/file.txt --force

# 获取 URL
node scripts/qiniu_node.mjs url --key image/file.txt
```

## 🔧 架构

两层执行策略，保障环境兼容性：
1. **Node.js SDK** (`qiniu`) - 稳定可靠，推荐作为首选脚本调用方式
2. **qshell CLI** - 官方命令行工具，用于辅助与兜底

## 📄 许可证

MIT

## NOTE

本 Skill 在原 Clawhub 下载版本（`1.0.3`）基础上进行了优化：
- 移除了对 `qiniu-mcp-server` 强绑定的依赖逻辑，提升了在各种 Agent 平台上的通用兼容性
- 修复了 Node SDK 早期版本对于部分较新区域（如 `cn-east-2`）报 incorrect region 的错误
- 支持了更灵活的环境变量凭证读取机制
