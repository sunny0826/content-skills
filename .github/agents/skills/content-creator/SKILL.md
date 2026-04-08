---
name: content-creator
description: >-
    根据提供的参考资料创作内容，并将其保存为适配 Hugo 的 Markdown 文件。
    支持从 URL、文本片段或其他来源提取素材，自动生成标准 Hugo front matter（title、date、draft、tags、categories 等）。
user-invocable: true
---

# 内容创作 Skill（Hugo Markdown 格式）

本 Skill 帮助你基于参考资料创作博客文章、技术文档或其他内容，并将结果保存为符合 Hugo 规范的 `.md` 文件。

## 使用方式

调用此 Skill 时，请提供以下信息：

1. **参考资料**：可以是一个或多个 URL、文本片段、文档内容或关键要点列表。
2. **目标主题 / 标题**（可选）：若未提供，Skill 会根据参考资料自动推断。
3. **分类与标签**（可选）：Hugo 文章的 `categories` 和 `tags`。
4. **输出路径**（可选）：保存文件的相对路径，默认为 `content/posts/<slug>.md`。

## 工作流程

1. **分析参考资料**：阅读并理解所有提供的参考内容，提炼核心观点、数据和结构。
2. **生成文章大纲**：根据参考资料的主题和深度，规划文章结构（引言、正文各节、结论）。
3. **撰写正文**：以清晰、流畅的语言撰写文章，保持原创性，正确引用参考来源。
4. **生成 Hugo front matter**：自动填充以下字段：
   - `title`：文章标题
   - `date`：创建日期（ISO 8601 格式，如 `2025-01-01T00:00:00+08:00`）
   - `draft`：默认 `false`
   - `description`：文章摘要（150 字以内）
   - `tags`：标签列表
   - `categories`：分类列表
   - `author`（可选）
   - `slug`（可选，URL 友好的文章标识符）
5. **保存文件**：将生成的内容写入指定路径的 `.md` 文件。

## 输出文件格式

生成的 Markdown 文件遵循以下结构：

```markdown
---
title: "文章标题"
date: 2025-01-01T00:00:00+08:00
draft: false
description: "文章简短描述，用于 SEO 和列表展示。"
tags:
  - 标签一
  - 标签二
categories:
  - 分类
author: "作者名称"
slug: "article-slug"
---

## 引言

...

## 正文

...

## 结论

...

## 参考资料

- [来源一](https://example.com/source1)
- [来源二](https://example.com/source2)
```

## 注意事项

- 生成的内容**不会直接照搬**参考资料，而是在理解的基础上进行再创作。
- 若参考资料为中文，默认输出中文内容；若参考资料为英文，可根据需求选择输出语言。
- 所有参考来源将在文章末尾的"参考资料"部分列出。
- 如未指定 `date`，使用当前日期和时间（北京时间 UTC+8）。
- 文件名默认使用 `slug` 字段的值，若无 `slug` 则从标题自动生成（转为小写、空格替换为连字符）。

## 示例

**输入：**

> 参考资料：https://example.com/article-about-kubernetes
> 主题：Kubernetes 资源管理最佳实践
> 标签：Kubernetes, 云原生, DevOps
> 分类：云原生

**输出文件路径：** `content/posts/kubernetes-resource-management.md`

```markdown
---
title: "Kubernetes 资源管理最佳实践"
date: 2025-01-01T10:00:00+08:00
draft: false
description: "本文介绍在 Kubernetes 中进行资源管理的关键最佳实践，包括 requests/limits 配置、LimitRange、ResourceQuota 等。"
tags:
  - Kubernetes
  - 云原生
  - DevOps
categories:
  - 云原生
slug: "kubernetes-resource-management"
---

## 引言

合理的资源管理是 Kubernetes 集群稳定运行的基础...

...

## 参考资料

- [原文链接](https://example.com/article-about-kubernetes)
```
