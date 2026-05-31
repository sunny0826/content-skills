# content-skills

本仓库保存内容创建相关的 AI Skill，供 AI 编程代理调用，帮助自动化内容创作流程。

## Skills 列表

### content-creator

**路径**：`content-creator/SKILL.md`

根据提供的参考资料创作高质量内容，并将其保存为适配 [Hugo](https://gohugo.io/) 的 Markdown 文件。

**核心能力：**
- **深度分析**：支持从 URL、文本片段、PDF 或文档中提取核心观点和数据。
- **低 Token 抽取**：内置 `scripts/extract_web.mjs`，会把网页正文、标题、链接和图片候选保存到临时文件，只在终端输出摘要，避免把整页 HTML 打进日志。
- **结构化创作**：严格遵循专业性、准确性、可读性等内容要求，自动排版并支持生成 Mermaid 可视化图表。
- **Hugo 兼容**：自动填充 Hugo front matter，并通过有界采样兼容目标项目已有字段（如 `summary`、`authors`、`lastmod`、`type` 等）。
- **一键输出**：自动保存至 `content/post/<slug>/index.md` 或指定路径（支持为每篇文章创建独立的目录）。

**使用示例：**

在对话中向你的 AI 助手发送以下指令：

```text
使用 content-creator，基于以下链接撰写一篇 Kubernetes 资源管理最佳实践的文章：
- https://example.com/k8s-resources
要求标签包含：Kubernetes, 云原生
```

### content-checker

**路径**：`content-checker/SKILL.md`

专门用于核查由 `content-creator` 生成的内容或任何 Markdown 文章，对比参考资料进行事实与质量核查。

**核心能力：**
- **事实对比**：深度比对原文与生成文章，捕捉数据、时间、逻辑等事实偏差。
- **授权模式**：默认只读出具结构化核查报告；当用户明确要求“无需确认直接改”时，可直接应用最小必要修改并列出修改清单。
- **建设性建议**：针对翻译生硬、表达不当等问题，给出具体的重写参考与改进建议。
- **发布检查**：额外检查 front matter、future date、图片路径、参考资料覆盖和 Hugo 构建可见性。

**使用示例：**

```text
使用 content-checker，核查 content/post/my-article/index.md，参考资料是：https://example.com/source
```

### xiaohongshu-content-creator

**路径**：`xiaohongshu-content-creator/SKILL.md`

用于创作“小红书风格”的技术文章/技术笔记，输出纯 Markdown（无 Hugo front matter），版式对齐 `content/xiaohongshu/*/index.md`；禁用封面与图床上传；生成后强制调用 `content-checker` 做发布前核查。

---

## ✅ 推荐工作流：生成 + 核查

为了保证事实准确性与表达质量，推荐在生成文章后立即进行内容核查：

```text
先使用 content-creator 生成文章；生成完成后，使用 content-checker 对刚生成的 index.md 做事实核查与质量建议输出；
注意：如果需要直接修改，请在 prompt 中明确写“无需确认直接改”；否则 content-checker 只输出建议。
```

## 低噪声网页抽取

当参考资料是 URL 时，可以先用抽取脚本生成正文和图片候选：

```bash
node content-creator/scripts/extract_web.mjs \
  "https://example.com/source" \
  --out-dir /tmp/content-creator-sources/example
```

脚本会写入 `source-01.txt` 和 `source-01.json`，终端只输出包含标题、路径、图片数量等信息的摘要，方便 Agent 后续读取文件而不是打印完整 HTML。

## 📦 安装与配置

### 同步本地安装副本

仓库中根目录是源码版 skill，`.agents/skills`、`.claude/skills`、`.trae/skills` 是本地宿主的安装副本。修改源码版后，可以运行：

```bash
scripts/sync-local-skills.sh
```

也可以指定其它项目的 skill 根目录：

```bash
scripts/sync-local-skills.sh /path/to/project/.agents/skills
```

### 使用 `npx skills add` 安装

你可以使用 `npx skills` 快速将本仓库中的 Skill 添加到你的本地项目中：

```bash
npx skills add https://github.com/sunny0826/content-skills --skill content-creator
```

### Claude Code Plugin 安装 (推荐)

如果你正在使用 [Claude Code](https://github.com/anthropics/claude-code)，可以通过以下命令将本仓库注册为 Claude Code Plugin Marketplace：

```bash
/plugin marketplace add sunny0826/content-skills
```

然后，你可以通过以下步骤安装特定的 skill：

1. 输入并选择 `/plugin browse` (或者在菜单中选择 Browse and install plugins)
2. 选择 `content-skills`
3. 选择你需要的 skill (例如 `content-creator`)
4. 选择 **Install now**
