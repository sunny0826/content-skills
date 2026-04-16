# content-skills

本仓库保存内容创建相关的 AI Skill，供 AI 编程代理调用，帮助自动化内容创作流程。

## Skills 列表

### content-creator

**路径**：`content-creator/SKILL.md`

根据提供的参考资料创作高质量内容，并将其保存为适配 [Hugo](https://gohugo.io/) 的 Markdown 文件。

**核心能力：**
- **深度分析**：支持从 URL、文本片段、PDF 或文档中提取核心观点和数据。
- **结构化创作**：严格遵循专业性、准确性、可读性等内容要求，自动排版并支持生成 Mermaid 可视化图表。
- **Hugo 兼容**：自动填充标准的 Hugo front matter（`title`、`date`、`draft`、`tags`、`categories`、`slug` 等）。
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
- **只读审核**：绝不直接修改用户文件，而是出具结构化的核查报告。
- **建设性建议**：针对翻译生硬、表达不当等问题，给出具体的重写参考与改进建议。

**使用示例：**

```text
使用 content-checker，核查 content/post/my-article/index.md，参考资料是：https://example.com/source
```

---

## ✅ 推荐工作流：生成 + 核查

为了保证事实准确性与表达质量，推荐在生成文章后立即进行内容核查：

```text
先使用 content-creator 生成文章；生成完成后，使用 content-checker 对刚生成的 index.md 做事实核查与质量建议输出；
注意：content-checker 只能给建议，不要直接修改文章，等我确认后再改。
```

## 📦 安装与配置

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
