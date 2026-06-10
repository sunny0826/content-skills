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
- **单职责输出**：自动保存至 `content/post/<slug>/index.md` 或指定路径，并输出文章路径、来源摘要和可供外部编排层继续处理的发布元数据。

**使用示例：**

在对话中向你的 AI 助手发送以下指令：

```text
使用 content-creator，基于以下链接撰写一篇 Kubernetes 资源管理最佳实践的文章：
- https://example.com/k8s-resources
要求标签包含：Kubernetes, 云原生
```

### content-checker

**路径**：`content-checker/SKILL.md`

专门用于核查 Markdown 文章，对比参考资料进行事实与质量核查。

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

用于创作“小红书风格”的技术文章/技术笔记，输出纯 Markdown（无 Hugo front matter），版式对齐 `content/xiaohongshu/*/index.md`；不负责封面、图床上传或发布前核查。

### generate-cover

**路径**：`gen-cover-skill/SKILL.md`

用于根据标题、副标题、标签、作者、配色和装饰风格生成本地 PNG 封面图。只负责本地图片生成，不上传图床、不回填文章字段。

**核心能力：**
- **本地封面生成**：基于 Puppeteer 和内置 HTML 模板输出高质量 PNG。
- **可控视觉参数**：支持 `scheme`、`deco`、`title`、`subtitle`、`label`、`author` 和 `output`。
- **单职责边界**：公开 URL、上传和文章字段回填由外部编排 Skill 或用户后续指令处理。

### qiniu-kodo

**路径**：`qiniu-kodo/SKILL.md`

用于把本地图片上传到七牛云 KODO，并返回可用于 Hugo/Markdown 的公开 URL。只负责 `test-connection` 和 `upload` 主流程。

**核心能力：**
- **连接检查**：通过脚本判断七牛配置是否可用，不读取或展示 `.env`。
- **图片上传**：支持指定 `local`、`key`、`prefix` 和输出格式。
- **低噪声输出**：推荐使用 `--format text` 只返回 URL，便于外部编排层回填。

---

## ✅ 解耦后的职责边界

当前各 Skill 保持单一职责，不再互相直接触发：

- `content-creator`：生成并保存 Hugo Markdown，输出编排交接信息。
- `xiaohongshu-content-creator`：生成并保存小红书 Markdown，输出编排交接信息。
- `content-checker`：只在用户或外部编排层明确发起核查任务时运行。
- `generate-cover`：只生成本地 PNG 封面。
- `qiniu-kodo`：只上传本地图片并返回公开 URL。

后续如果需要“生成文章 -> 生成封面 -> 上传图床 -> 回填 image -> 内容核查”的完整流水线，应由单独的编排 Skill 负责串联这些步骤。

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
