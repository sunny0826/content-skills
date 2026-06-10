---
name: blog-orchestrator
description: >-
  当用户要求写一篇博客、生成 Hugo 博客、发布博客、介绍文章内容并给出相关链接/资料、基于 URL/PDF/文本写博客，或需要端到端生成文章、核查、制作封面、上传图床、回填 image 字段时使用。
  对普通“写一篇博客/写博客，内容为/相关链接和内容”这类请求默认使用本 Skill；只有用户明确说“只生成正文/只用 content-creator/不要封面上传核查”时才改用单职责 Skill。
  本 Skill 只负责编排：先生成博客内容，再授权核查并直接修正，然后使用 stop-slop 去除 AI 味，随后生成封面并让用户 review，满意后上传七牛 KODO 并回填文章 front matter 的 image 字段。
  不适用于只核查、只生成封面或只上传图片的单步任务；这些任务分别使用对应的单职责 Skill。
user-invocable: true
---

# 博客发布编排 Skill

你的任务是把多个单职责 Skill 串成一条可控的 Hugo 博客发布流水线。不要复制下游 Skill 的内部细节；把内容创作、核查、封面生成和上传分别交给对应 Skill，并在关键节点向用户确认。

## 编排目标

按固定顺序完成：

1. 使用 `content-creator` 生成 Hugo 博客内容。
2. 使用 `content-checker` 对刚生成的文章做内容核查，并明确授权“无需确认直接改”。
3. 使用 `stop-slop` 对核查后的正文做去 AI 味处理。
4. 生成封面图：优先判断 `baoyu-cover-image` 是否可用；可用则使用它，不可用则降级使用 `generate-cover`。
5. 将封面图展示给用户 review；如果用户要求修改，按反馈重新生成封面图。
6. 用户确认满意后，使用 `qiniu-kodo` 上传封面图，并将公开 URL 回填到文章 front matter 的 `image` 字段。
7. 清理封面生成临时产物，输出最终文章路径、封面 URL、核查、去 AI 味和修改摘要。

## 需要的信息

开始前尽量一次性收集这些信息；缺少非阻塞项时可用合理默认值继续：

- 参考资料：URL、PDF、文本、要点或代码片段。
- 文章主题/标题、分类、标签、作者、输出路径（可选）。
- 是否有特殊封面偏好：风格、颜色、是否显示标题、是否包含人物/产品/代码元素。
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
- 不可用条件：清单中没有该 Skill、Skill 加载失败、或它要求进行首次配置且用户不想在本流程中配置。
- 不要自动从 GitHub 下载或安装 `stop-slop`；如果用户想安装，停下来让用户另行确认。

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

如果 `stop-slop` 不可用，告知用户并询问是否跳过去 AI 味步骤继续封面生成；不要静默跳过。

### 4. 选择封面生成方案

先判断 `baoyu-cover-image` 是否可用：

- 可用条件：当前运行时的可用 Skill/工具清单中存在 `baoyu-cover-image`，或本地安装根能明确找到 `baoyu-cover-image/SKILL.md`。
- 不可用条件：清单中没有该 Skill、Skill 加载失败、或它要求进行首次配置且用户不想在本流程中配置。
- 不要自动从 GitHub 下载或安装 `baoyu-cover-image`；如果用户想安装，停下来让用户另行确认。

#### 4A. 首选：使用 baoyu-cover-image

默认封面宽高比为 `2.35:1`。

根据文章内容给出推荐选项，并询问用户选择。至少覆盖这些维度：

- `type`：`hero`、`conceptual`、`typography`、`metaphor`、`scene`、`minimal`。
- `palette`：例如 `warm`、`elegant`、`cool`、`dark`、`earth`、`vivid`、`pastel`、`mono`、`retro`、`duotone`、`macaron`。
- `rendering`：`flat-vector`、`hand-drawn`、`painterly`、`digital`、`pixel`、`chalk`、`screen-print`。
- `text`：`none`、`title-only`、`title-subtitle`、`text-rich`。
- `mood`：`subtle`、`balanced`、`bold`。
- `font`：`clean`、`handwritten`、`serif`、`display`。

把推荐项放在每个问题的第一位，并用一句话说明理由。若当前运行时有结构化提问工具，优先批量提问；否则用简短编号列表让用户回复。

确认后调用 `baoyu-cover-image` 生成封面图，并保存本地输出路径。

记录封面生成临时目录。`baoyu-cover-image` 常见输出形态是 `cover-image/<slug>/cover.png` 以及 `cover-image/<slug>/prompts/*.md`；这些文件只用于 review 和上传，不应在流程成功结束后留在仓库中。

#### 4B. 降级：使用 generate-cover

如果 `baoyu-cover-image` 不可用，说明降级原因，然后使用 `generate-cover`。

询问并确认：

- `title`：默认使用文章标题。
- `subtitle`：默认使用文章 description 或 summary。
- `label`：默认使用主分类或主标签。
- `author`：默认使用文章 authors。
- `scheme`：根据文章主题推荐一个数值。
- `deco`：在 `classic`、`cyberpunk`、`sphere`、`minimal` 中推荐一个。

注意：`generate-cover` 只负责本地 PNG，且可能不支持精确设置 `2.35:1`。如果用户坚持精确比例，建议安装/启用 `baoyu-cover-image` 或先确认可接受 fallback 的内置尺寸，不要擅自裁切或后处理封面图。

### 5. 用户 review 封面图

- 生成封面后，把本地图片展示给用户 review。
- 如果当前界面支持本地图片展示，使用 Markdown 图片语法展示绝对路径；否则给出绝对路径。
- 询问用户是否满意。
- 如果用户要求修改，收集具体反馈，并回到第 4 步使用同一封面方案重新生成。重新生成成功后，清理上一轮被淘汰的封面临时目录；只清理本流程创建的目录。
- 只有用户明确满意后，才进入上传步骤。

### 6. 上传并回填 image

- 调用 `qiniu-kodo` 上传用户确认后的本地封面图。
- 上传前先执行 `test-connection`；失败则停止上传并报告原因，不修改文章 `image` 字段。
- 默认对象 key：`image/<slug>-cover.png`。如果冲突或用户指定其它 key，以用户指定为准。
- 上传时优先使用 `--format text` 获取公开 URL。
- 拿到 URL 后，只修改第 1 步生成文章的 front matter：
  - 若存在 `image:` 字段，替换为公开 URL。
  - 若不存在 `image:` 字段，在 front matter 中补充 `image: "<url>"`。
- 修改后只做短验证：检查文章 front matter 中的 `image` 值，不输出整篇文章或完整 diff。

### 7. 清理临时产物

上传并回填成功后，默认清理本流程创建的封面临时产物：

- `baoyu-cover-image` 生成的 `cover-image/<slug>/`，包括 `prompts/*.md` 和 `cover.png`。
- `generate-cover` 降级分支中创建的临时封面工作目录。

清理边界：

- 只删除本次流程创建、且已成功上传的封面临时目录。
- 不删除用户显式指定要保留的输出路径。
- 不删除文章目录、文章正文、抽取来源文件或七牛配置文件。
- 如果上传失败或用户取消流程，询问是否清理本地封面临时目录，不要擅自删除。

### 8. 完成汇报

最终汇报保持简短：

- 文章路径。
- 核查是否已直接修正，以及关键修改摘要。
- `stop-slop` 是否已执行，以及去 AI 味处理摘要。
- 封面生成方式：`baoyu-cover-image` 或 `generate-cover`。
- 七牛公开 URL。
- `image` 字段是否已回填。
- 封面临时产物是否已清理；如果用户要求保留，再给出本地封面路径。

## Gotchas

- **先核查，再生成封面**：封面文案和视觉建议应基于核查后的文章，而不是初稿。
- **先事实，再风格**：`stop-slop` 必须在 `content-checker` 之后执行；它只处理表达，不改变事实、链接、数字、代码或 front matter。
- **stop-slop 不可用时不要静默跳过**：停下来说明原因，询问用户是否跳过去 AI 味步骤继续。
- **review 是硬门槛**：不要在用户确认封面满意前上传图床或回填 `image`。
- **临时封面产物要收尾**：`cover-image/<slug>/prompts/*.md`、`cover-image/<slug>/cover.png` 等中间文件在上传并回填成功后默认清理，避免污染仓库。
- **baoyu-cover-image 只做可用性判断**：不可用时降级，不自动安装。
- **content-checker 的直接修改授权只限当前文章**：不要让“无需确认直接改”扩大到其它文件。
- **qiniu-kodo 不读 `.env`**：配置可用性只通过它的连接检查判断。
- **日志低噪声**：不要打印整篇文章、整页 HTML、完整 diff 或密钥相关信息。

## 验证清单

- 文章文件存在，且 Hugo front matter 日期不晚于当前时间。
- `content-checker` 已对同一篇文章输出核查报告，并在授权模式下应用必要修正。
- `stop-slop` 已处理核查后的正文，或用户明确同意在不可用时跳过；front matter、链接、数字、代码块和参考资料未被无故改动。
- 用户已 review 并确认最终封面。
- 上传成功时，文章 front matter 的 `image` 字段是七牛公开 URL。
- 上传并回填成功后，本流程创建的封面临时目录已清理，或用户明确要求保留。
- 上传失败时，文章 `image` 字段保持不变，并清楚说明失败原因。
