#!/usr/bin/env node

const { program } = require('commander');
const puppeteer = require('puppeteer');
const path = require('path');

program
  .name('gen-cover')
  .description('生成微信公众号封面的 CLI 工具 (基于 article-tools)')
  .version('1.0.0')
  .requiredOption('-t, --title <string>', '文章标题')
  .option('-s, --subtitle <string>', '副标题或摘要', '')
  .option('-l, --label <string>', '系列标签', '')
  .option('-a, --author <string>', '作者 (如 @xxx · 姓名)', '')
  .option('-c, --scheme <number>', '配色方案 (0-12) 默认: 6', '6')
  .option('-d, --deco <string>', '装饰风格 (classic/cyberpunk/sphere/minimal) 默认: classic', 'classic')
  .option('-o, --output <string>', '输出文件路径', 'cover.png')
  .action(async (options) => {
    console.log('启动生成器...');
    let executablePath;
    if (process.platform === 'darwin') {
      executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    }
    
    const launchOptions = {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    };
    if (executablePath) {
      launchOptions.executablePath = executablePath;
    }
    
    const browser = await puppeteer.launch(launchOptions);
    
    const page = await browser.newPage();
    
    // Set viewport to the cover size
    await page.setViewport({ width: 1200, height: 480, deviceScaleFactor: 2 });
    
    const templatePath = path.resolve(__dirname, 'template.html');
    const fileUrl = `file://${templatePath}`;
    
    // Build query params
    const params = new URLSearchParams();
    params.append('title', options.title);
    if (options.subtitle) params.append('subtitle', options.subtitle);
    if (options.label) params.append('label', options.label);
    if (options.author) params.append('author', options.author);
    params.append('scheme', options.scheme);
    params.append('deco', options.deco);
    
    const fullUrl = `${fileUrl}?${params.toString()}`;
    
    console.log('加载模板并渲染...');
    await page.goto(fullUrl, { waitUntil: 'domcontentloaded' });
    
    // Wait for the render-ready element
    await page.waitForSelector('#render-ready', { timeout: 10000 });
    
    // Select the cover element and take screenshot
    const coverElement = await page.$('.cover');
    if (!coverElement) {
      console.error('未找到封面元素，生成失败。');
      await browser.close();
      process.exit(1);
    }
    
    const outputPath = path.resolve(process.cwd(), options.output);
    await coverElement.screenshot({ path: outputPath });
    
    console.log(`生成成功！已保存至: ${outputPath}`);
    
    await browser.close();
  });

program.parse();
