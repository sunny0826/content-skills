---
name: generate-cover
description: |
  当用户需要为文章、博客、技术内容或 content-creator 工作流生成本地 PNG 封面图时使用。
  基于 Puppeteer 和内置 HTML 模板生成现代感封面；需要 title，通常也带 subtitle、label、author、scheme(0-12)、deco(classic/cyberpunk/sphere/minimal)、output。
  只负责生成本地图片；上传公开 URL 交给 qiniu-kodo。
---

# generate-cover

这个 Skill 用于根据用户的要求，快速生成具有现代感的文章封面图。

## 核心能力
它内置了一个强大的 HTML 渲染引擎模板（支持极光背景、毛玻璃组件、噪点纹理等高级视觉效果），通过 Puppeteer 无头浏览器将这些网页元素完美捕捉并输出为高质量的 PNG 图片。

## 可用资源

- `scripts/index.js`：封面生成入口。
- `assets/cover.html` / `assets/template.html`：内置模板资源，脚本会读取，不需要复制到用户项目。

## Gotchas

- **本技能只生成本地 PNG**：不要上传图片或回填文章 `image` 字段；需要公开 URL 时交给 `qiniu-kodo`。
- **不要固定赛博朋克**：`scheme` 和 `deco` 应按文章主题选择；技术深度文章常用克制、清晰的风格。
- **Puppeteer 下载很重**：macOS 下优先设置 `PUPPETEER_SKIP_DOWNLOAD=1`，让脚本探测系统 Chrome。
- **参数比追问更重要**：缺少可选参数时可用合理默认值；只有缺少标题或用户明确要求定制视觉时再追问。

## 交互与参数要求

在调用此 Skill 时，你**必须**提取或向用户询问以下信息，以确保生成的封面图内容完整且符合预期：

1. **`title`** (必填)：文章的标题。如："探索 2024 前端新特性"
2. **`subtitle`** (选填)：副标题或摘要。如："深入理解 Server Components"
3. **`label`** (选填)：系列标签或分类。如："TECH TRENDS" 或 "前端开发"
4. **`author`** (选填)：作者信息。如："@Trae · AI Assistant"
5. **`scheme`** (选填)：配色方案，必须是 `0` 到 `12` 之间的整数（默认推荐：`6`）。不同的数值对应不同的背景色系（如深蓝、翡翠绿、赛博红、极光紫等）。
6. **`deco`** (选填)：装饰风格，必须是以下四者之一（默认推荐：`classic`）：
   - `classic`: 经典网格与极光弥散风格。
   - `cyberpunk`: 赛博朋克风格，包含扫描线、代码片段和科技感 HUD 元素。
   - `sphere`: 球体网格风格，包含悬浮的虚线球体。
   - `minimal`: 极简风格，内容居中，去除所有冗余装饰和作者信息。
7. **`output`** (选填)：输出的图片路径。默认保存在当前工作目录的 `cover.png`。

## 执行步骤

当用户触发此 Skill 时，请按照以下步骤执行：

1. **定位入口**：
   本 Skill 的可执行入口在 `gen-cover-skill/scripts/index.js`，模板资源存放在 `assets/` 目录下。脚本会自动读取模板文件，因此不需要把源码复制到用户工作区。

2. **检查与初始化依赖**：
   封面生成依赖 `puppeteer` 和 `commander`。执行脚本时，会优先检查当前环境是否已有依赖；若无，脚本会**自动静默安装**到依赖缓存目录中。
   - 默认缓存目录：`~/.cache/gen-cover-skill`
   - 自定义缓存目录：支持通过环境变量 `GEN_COVER_CACHE_DIR` 或 CLI 参数 `--cache-dir` 覆盖。
   - *注意：在 macOS 下，推荐设置环境变量 `PUPPETEER_SKIP_DOWNLOAD=1`，跳过 Puppeteer 庞大的内置 Chromium 下载，脚本将自动探测并使用系统自带的 Chrome。*

3. **执行生成命令**：
   在用户期望输出图片的目录下运行命令，并将 `-o/--output` 指向最终输出路径。
   示例命令：
   ```bash
   node "<本 Skill 安装路径>/scripts/index.js" -t "用户标题" -s "副标题" -l "标签" -a "作者" -c 6 -d cyberpunk -o cover.png --cache-dir ./.cover-deps
   ```

4. **缓存清理**（可选）：
   如需清理依赖缓存，可手动删除 `~/.cache/gen-cover-skill/`（或你设置的 `GEN_COVER_CACHE_DIR`）。

5. **完成与展示**：
   生成完成后，告知用户图片已成功保存，并提供图片的文件路径供用户预览。

## 注意事项
- 在组装命令参数时，务必将带有空格的字符串用双引号包裹，例如 `-t "Hello World"`。
- 如果用户没有提供某些选填参数，可以使用默认值或忽略该参数（脚本会自动处理回退逻辑）。
- 确保在执行前检查当前环境是否支持 Node.js 和 npm。
