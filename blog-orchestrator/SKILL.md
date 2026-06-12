---
name: blog-orchestrator
description: >-
  当用户要求写一篇博客、生成 Hugo 博客、发布博客、介绍文章内容并给出相关链接/资料、基于 URL/PDF/文本写博客，或需要端到端生成文章、核查、制作封面、上传图床、回填 image 字段时使用。
  对普通“写一篇博客/写博客，内容为/相关链接和内容”这类请求默认使用本 Skill；只有用户明确说“只生成正文/只用 content-creator/不要封面上传核查”时才改用单职责 Skill。
  本 Skill 只负责编排：先生成博客内容，再授权核查并直接修正，然后尽量使用 stop-slop 去除 AI 味，随后直接使用 baoyu-cover-image 自动生成封面，上传七牛 KODO 并回填文章 front matter 的 image 字段。
  不适用于只核查、只生成封面或只上传图片的单步任务；这些任务分别使用对应的单职责 Skill。
user-invocable: true
---

# 博客发布编排 Skill

你的任务是把多个单职责 Skill 串成一条可控的 Hugo 博客发布流水线。不要复制下游 Skill 的内部细节；把内容创作、核查、封面生成和上传分别交给对应 Skill，并尽量减少非阻塞交互。

## 编排目标

按固定顺序完成：

1. 使用 `content-creator` 生成 Hugo 博客内容。
2. 使用 `content-checker` 对刚生成的文章做内容核查，并明确授权“无需确认直接改”。
3. 如果 `stop-slop` 可用，则对核查后的正文做去 AI 味处理；不可用则记录并继续，不询问、不打断流程。
4. 直接使用 `baoyu-cover-image` 生成封面图，封面比例默认 `2.35:1`，参数根据文章内容自动设置。
5. 使用 `qiniu-kodo` 上传封面图，并将公开 URL 回填到文章 front matter 的 `image` 字段。
6. 清理封面生成临时产物，输出最终文章路径、封面 URL、核查、去 AI 味和修改摘要。

## 需要的信息

开始前尽量一次性收集这些信息；缺少非阻塞项时可用合理默认值继续：

- 参考资料：URL、PDF、文本、要点或代码片段。
- 文章主题/标题、分类、标签、作者、输出路径（可选）。
- 七牛对象 key 偏好（可选）：默认 `image/<slug>-cover.png`。

## 工作流程

### 1. 生成博客内容

- 调用 `content-creator`，传入用户资料、标题、标签、分类、作者、输出路径等信息。
- 要求 `content-creator` 只生成文章和编排交接信息，不触发封面、上传或核查。
- 从结果中记录：
  - 文章路径。
  - `slug`、`title`、`description`、`summary`、`tags`、`categories`、`authors`。
  - 参考资料与抽取结果路径（如有）。

如果没有拿到文章路径，先补齐这个阻塞信息，不要进入下一步。

### 2. 核查并直接修正

- 调用 `content-checker` 核查第 1 步生成的文章。
- 明确传入授权语句：`无需确认直接改，仅限修改刚生成的文章文件`。
- 核查输入应包含文章路径，以及第 1 步使用的同一批参考资料或抽取结果。
- 记录核查报告摘要和已应用修改清单。

安全边界：只允许修改第 1 步生成的文章文件；不要让核查过程改动其它文章、配置或生成物。

### 3. 去除 AI 味

先判断 `stop-slop` 是否可用：

- 可用条件：当前运行时的可用 Skill/工具清单中存在 `stop-slop`，或本地安装根能明确找到 `stop-slop/SKILL.md`。
- 不可用条件：清单中没有该 Skill、Skill 加载失败、或它要求进行首次配置。
- 不要自动从 GitHub 下载或安装 `stop-slop`。

如果可用，调用 `stop-slop` 处理第 2 步核查后的同一篇文章，目标是去除 AI 写作痕迹，而不是重写事实：

- 删除寒暄式开头、强调拐杖、元叙述和模板化过渡。
- 打破公式化结构、二元对比、排比式三段和口号式收尾。
- 改成主动语态，保留真实 actor。
- 让抽象判断更具体，但不得新增来源没有支持的新事实。
- 调整句长节奏，去掉不必要的副词和过度润色。

硬边界：

- 不修改 front matter 字段，尤其是 `title`、`date`、`slug`、`image`。
- 不改数字、日期、链接、引用、代码块、命令、专有名词或参考资料列表，除非只是修正明显的标点/空格。
- 不引入新的事实、案例、观点或来源。
- 修改后输出短摘要和评分/检查结果；不要打印整篇文章或完整 diff。

如果 `stop-slop` 不可用，记录“已跳过去 AI 味：stop-slop 不可用”并继续封面生成；不要询问用户，也不要打断流程。

### 4. 轻量事实保护验证

`stop-slop` 执行或跳过后，做一次轻量验证，再进入封面生成：

- 检查 front matter 的 `title`、`date`、`slug`、`image` 是否被无故改动。
- 检查正文中的 URL、数字、日期、代码块、命令、引用块和参考资料列表是否被无故改动。
- 若发现非表达层面的改动，恢复这些事实性内容或重新调用 `content-checker` 针对该点修正。
- 只输出验证摘要，不打印整篇文章或完整 diff。

### 5. 生成封面

先判断 `baoyu-cover-image` 是否可用：

- 可用条件：当前运行时的可用 Skill/工具清单中存在 `baoyu-cover-image`，或本地安装根能明确找到 `baoyu-cover-image/SKILL.md`。
- 不可用条件：清单中没有该 Skill、Skill 加载失败、或它要求进行首次配置。
- 不要自动从 GitHub 下载或安装 `baoyu-cover-image`；如果用户想安装，停下来让用户另行确认。

如果 `baoyu-cover-image` 不可用，停止封面、上传和回填步骤，报告不可用原因，并保留已生成和已核查的文章；不要降级到 `generate-cover`。

使用 `baoyu-cover-image` 时，封面宽高比固定默认 `2.35:1`。

根据文章内容直接设置参数，不询问用户。至少自动决策这些维度，并在最终摘要中说明选择理由：

- `type`：`hero`、`conceptual`、`typography`、`metaphor`、`scene`、`minimal`。
- `palette`：例如 `warm`、`elegant`、`cool`、`dark`、`earth`、`vivid`、`pastel`、`mono`、`retro`、`duotone`、`macaron`。
- `rendering`：`flat-vector`、`hand-drawn`、`painterly`、`digital`、`pixel`、`chalk`、`screen-print`。
- `text`：`none`、`title-only`、`title-subtitle`、`text-rich`。
- `mood`：`subtle`、`balanced`、`bold`。
- `font`：`clean`、`handwritten`、`serif`、`display`。

选择原则：

- 技术解释、数据分析、工程实践类文章优先 `conceptual` 或 `metaphor`。
- 产品发布、工具介绍、可视化能力展示类文章优先 `hero` 或 `scene`。
- 观点评论、方法论和抽象主题可用 `typography` 或 `minimal`。
- `palette` 与文章情绪一致：数据/分析偏 `cool`、稳重技术偏 `elegant`、创造力/产品偏 `vivid` 或 `duotone`。
- `text` 默认 `title-subtitle`；如果标题过长，使用 `title-only`。
- `mood` 默认 `balanced`；重大发布或强观点可用 `bold`。
- `font` 默认 `clean`；叙事或观点类可用 `serif` 或 `display`。

调用 `baoyu-cover-image` 生成封面图，并保存本地输出路径。

封面临时目录安全规则：

- 优先使用带时间戳或 run id 的本次专属目录，例如 `cover-image/<slug>-<YYYYMMDDHHmmss>/`，避免覆盖已有素材。
- 生成前记录目标目录是否已存在；如果已存在，不要把整个目录标记为可删除。
- 记录本次流程创建的文件清单，至少包括封面 PNG 和 prompts 文件。
- `baoyu-cover-image` 常见输出形态是 `cover-image/<slug>/cover.png` 以及 `cover-image/<slug>/prompts/*.md`；这些文件只用于上传，不应在流程成功结束后留在仓库中。

### 6. 上传并回填 image

- 调用 `qiniu-kodo` 上传刚生成的本地封面图。
- 上传前先执行 `test-connection`；失败则停止上传并报告原因，不修改文章 `image` 字段。
- 默认对象 key：`image/<slug>-cover.png`。如果冲突或用户指定其它 key，以用户指定为准。
- 上传时优先使用 `--format text` 获取公开 URL。
- 拿到 URL 后，只修改第 1 步生成文章的 front matter：
  - 若存在 `image:` 字段，替换为公开 URL。
  - 若不存在 `image:` 字段，在 front matter 中补充 `image: "<url>"`。
- 修改后只做短验证：检查文章 front matter 中的 `image` 值，不输出整篇文章或完整 diff。

### 7. 清理临时产物

上传并回填成功后，默认清理本流程创建的封面临时产物：

- 清理本次流程记录的文件清单，例如封面 PNG 和 prompts 文件。
- 如果本次创建的是空的专属临时目录，可以删除该空目录。

清理边界：

- 只删除本次流程创建、且已成功上传的封面临时文件。
- 不删除用户显式指定要保留的输出路径。
- 不删除生成前已经存在的 `cover-image/<slug>/` 目录或其中的历史文件。
- 不删除文章目录、文章正文、抽取来源文件或七牛配置文件。
- 如果上传失败或用户取消流程，询问是否清理本地封面临时目录，不要擅自删除。

### 8. 完成汇报

最终汇报保持简短：

- 文章路径。
- 核查是否已直接修正，以及关键修改摘要。
- `stop-slop` 是否已执行；若不可用，说明已自动跳过。
- 封面参数选择摘要。
- 七牛公开 URL。
- `image` 字段是否已回填。
- 封面临时产物是否已清理。

## Gotchas

- **先核查，再生成封面**：封面文案和视觉建议应基于核查后的文章，而不是初稿。
- **先事实，再风格**：`stop-slop` 必须在 `content-checker` 之后执行；它只处理表达，不改变事实、链接、数字、代码或 front matter。
- **stop-slop 后要轻量验证**：进入封面生成前，确认 front matter、链接、数字、代码块、引用和参考资料未被无故改动。
- **stop-slop 不可用时继续流程**：记录跳过原因即可，不询问、不暂停。
- **封面不走人工 review**：`baoyu-cover-image` 生成后直接上传，减少发布流水线中断点。
- **临时封面产物要精确清理**：只清理本次创建的文件清单，不要删除生成前已存在的目录或历史文件。
- **baoyu-cover-image 是唯一封面方案**：不可用时停止封面、上传和回填，不降级到 `generate-cover`。
- **content-checker 的直接修改授权只限当前文章**：不要让“无需确认直接改”扩大到其它文件。
- **qiniu-kodo 不读 `.env`**：配置可用性只通过它的连接检查判断。
- **日志低噪声**：不要打印整篇文章、整页 HTML、完整 diff 或密钥相关信息。

## 验证清单

- 文章文件存在，且 Hugo front matter 日期不晚于当前时间。
- `content-checker` 已对同一篇文章输出核查报告，并在授权模式下应用必要修正。
- `stop-slop` 已处理核查后的正文，或因不可用被记录并自动跳过；front matter、链接、数字、代码块和参考资料未被无故改动。
- `stop-slop` 后已完成轻量事实保护验证。
- `baoyu-cover-image` 已按文章内容自动设置参数并生成 `2.35:1` 封面。
- 上传成功时，文章 front matter 的 `image` 字段是七牛公开 URL。
- 上传并回填成功后，本流程创建的封面临时文件已清理，生成前已存在的目录和历史文件未被删除。
- 上传失败时，文章 `image` 字段保持不变，并清楚说明失败原因。
