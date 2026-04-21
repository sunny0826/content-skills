# gen-cover

## 安装

1. 确保安装了 Node.js (v16+)
2. 在该目录下执行安装依赖：
   ```bash
   pnpm install
   ```
3. (可选) 将工具链接到全局：
   ```bash
   pnpm link
   ```

## 使用

通过命令行传入参数快速生成高清（2倍图，尺寸：2400x960）的公众号封面：

```bash
node index.js -t "我的第一篇文章" -s "副标题或摘要内容" -l "系列标签" -a "@作者 · 姓名" -c 6 -d classic -o output.png
```
或者，如果链接到了全局：
```bash
gen-cover -t "快速开始" -c 12 -d sphere
```

### 参数说明

- `-t, --title <string>`: **(必填)** 文章标题
- `-s, --subtitle <string>`: 副标题或摘要
- `-l, --label <string>`: 系列标签
- `-a, --author <string>`: 作者 (如 @xxx · 姓名)
- `-c, --scheme <number>`: 配色方案 (0-12)，默认为 6 (海蓝渐变)
- `-d, --deco <string>`: 装饰风格 (classic / cyberpunk / sphere / minimal)，默认为 classic
- `-o, --output <string>`: 输出文件路径，默认为当前目录的 `cover.png`

### 配色方案参考

- `0`: 宝蓝
- `1`: 翡翠
- `2`: 紫罗兰
- `3`: 玫红
- `4`: 石墨
- `5`: 琥珀
- `6`: 海蓝 (渐变)
- `7`: 翠绿 (渐变)
- `8`: 深紫 (渐变)
- `9`: 玫瑰 (渐变)
- `10`: 烈焰 (渐变)
- `11`: 午夜 (渐变)
- `12`: 智核 (渐变)
