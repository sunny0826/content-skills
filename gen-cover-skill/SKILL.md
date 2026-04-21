---
name: generate-cover
description: |
  当用户需要为文章、博客或任何内容生成具有现代设计感的精美封面图时，请务必使用此 Skill。
  该 Skill 会基于 `puppeteer` 和预设的现代风 HTML 模板，生成带有毛玻璃、极光弥散渐变和高质感排版的封面图片。
  使用时，必须收集文章的标题（title）、副标题（subtitle）、标签（label）、作者（author）、配色方案（scheme 0-12）和装饰风格（deco: classic/cyberpunk/sphere/minimal），并将它们作为参数传递给生成脚本。
---

# generate-cover

这个 Skill 用于根据用户的要求，快速生成具有现代感的文章封面图。

## 核心能力
它内置了一个强大的 HTML 渲染引擎模板（支持极光背景、毛玻璃组件、噪点纹理等高级视觉效果），通过 Puppeteer 无头浏览器将这些网页元素完美捕捉并输出为高质量的 PNG 图片。

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

1. **准备脚本与模板**：
   从本 Skill 的 `assets` 目录中，将 `index.js`、`template.html` 和 `package.json` 复制到用户指定的工作目录（如果未指定，则在当前目录创建一个 `cover-generator` 文件夹）。

2. **依赖检查**：
   由于生成封面依赖 `puppeteer` 和 `commander`，为了提高执行速度和稳定性，推荐**优先使用系统全局安装的依赖**。在 Node.js 中，如果包已全局安装，你可以在命令前设置环境变量 `NODE_PATH` 使其能够解析全局模块。
   
   例如，如果你使用 `npm` 或 `pnpm` 全局安装过依赖，可以直接在执行前动态获取全局路径：
   ```bash
   export NODE_PATH=$(npm root -g) || export NODE_PATH=$(pnpm root -g)
   ```
   *注意：如果你使用 `pnpm link`，必须提供具体的包名（例如 `pnpm link -g puppeteer commander`），不要直接使用不带参数的 `pnpm link`。*
   如果环境变量配置后仍提示找不到模块，再降级使用本地安装（`npm i puppeteer commander --no-save`）。
   
   *注意：如果在 Mac 环境下遇到 Puppeteer 启动失败的问题，脚本已经内置了调用本地 Chrome 的兼容逻辑。*

3. **执行生成命令**：
   使用 Node.js 运行 `index.js` 并传入相应的参数。
   示例命令：
   ```bash
   node index.js -t "用户标题" -s "副标题" -l "标签" -a "作者" -c 6 -d cyberpunk -o cover.png
   ```

4. **清理环境**（可选但推荐）：
   如果是作为管道节点被其他 Skill（如 `content-creator`）调用，你应该在生成成功并交接文件路径后，删除运行所产生的临时代码文件（`index.js`, `template.html`, `package.json`, `node_modules` 等），避免污染用户的工作区。

5. **完成与展示**：
   生成完成后，告知用户图片已成功保存，并提供图片的文件路径供用户预览。

## 注意事项
- 在组装命令参数时，务必将带有空格的字符串用双引号包裹，例如 `-t "Hello World"`。
- 如果用户没有提供某些选填参数，可以使用默认值或忽略该参数（脚本会自动处理回退逻辑）。
- 确保在执行前检查当前环境是否支持 Node.js 和 npm。
