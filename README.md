# content-skills

本仓库保存内容创建相关的 Copilot Skill，供 GitHub Copilot 编程代理（Copilot coding agent）调用，帮助自动化内容创作流程。

## Skills 列表

### content-creator

**路径**：`.github/agents/skills/content-creator/SKILL.md`

根据提供的参考资料创作内容，并将其保存为适配 [Hugo](https://gohugo.io/) 的 Markdown 文件。

**功能：**

- 分析一个或多个参考资料（URL、文本、文档）
- 生成结构化文章（引言、正文、结论、参考资料）
- 自动填充 Hugo front matter（`title`、`date`、`draft`、`description`、`tags`、`categories` 等）
- 将结果保存为 `.md` 文件，默认路径为 `content/posts/<slug>.md`

**使用示例：**

在 Copilot 对话中调用：

```
请使用 content-creator skill，基于以下参考资料撰写一篇关于 Kubernetes 资源管理的文章：
- https://example.com/k8s-resources
标签：Kubernetes, 云原生
分类：云原生
```
