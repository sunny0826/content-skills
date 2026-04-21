#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');
const { createRequire } = require('module');

function getCacheDir() {
  const custom = process.env.GEN_COVER_CACHE_DIR;
  if (custom && custom.trim()) return custom.trim();
  return path.join(os.homedir(), '.cache', 'gen-cover-skill');
}

function ensureCachePackageJson(cacheDir) {
  const pkgPath = path.join(cacheDir, 'package.json');
  if (fs.existsSync(pkgPath)) return;
  fs.writeFileSync(
    pkgPath,
    JSON.stringify({ name: 'gen-cover-skill-cache', private: true }, null, 2),
    'utf-8'
  );
}

function ensureDeps(cacheDir) {
  const nmDir = path.join(cacheDir, 'node_modules');
  const puppeteerPkg = path.join(nmDir, 'puppeteer', 'package.json');
  const commanderPkg = path.join(nmDir, 'commander', 'package.json');
  if (fs.existsSync(puppeteerPkg) && fs.existsSync(commanderPkg)) return;

  fs.mkdirSync(cacheDir, { recursive: true });
  ensureCachePackageJson(cacheDir);
  console.log(`[gen-cover-skill] 正在初始化依赖到缓存目录: ${cacheDir}`);
  execSync('npm i puppeteer commander --no-save --silent --no-fund --no-audit', {
    cwd: cacheDir,
    stdio: 'ignore', // 丢弃安装过程的输出，实现静默
    env: { ...process.env, NPM_CONFIG_LOGLEVEL: 'error' }
  });
}

function loadDeps(optionsCacheDir) {
  try {
    const { program } = require('commander');
    const puppeteer = require('puppeteer');
    return { program, puppeteer };
  } catch {
    const cacheDir = optionsCacheDir || getCacheDir();
    ensureDeps(cacheDir);
    const cacheRequire = createRequire(path.join(cacheDir, 'package.json'));
    const { program } = cacheRequire('commander');
    const puppeteer = cacheRequire('puppeteer');
    return { program, puppeteer };
  }
}

function parsePreArgs() {
  const args = process.argv.slice(2);
  const cacheDirIndex = args.indexOf('--cache-dir');
  let cacheDir = undefined;
  if (cacheDirIndex !== -1 && args[cacheDirIndex + 1]) {
    cacheDir = path.resolve(process.cwd(), args[cacheDirIndex + 1]);
  }
  return { cacheDir };
}

const preArgs = parsePreArgs();
const { program, puppeteer } = loadDeps(preArgs.cacheDir);

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
  .option('--cache-dir <string>', '自定义依赖缓存目录 (优先于 GEN_COVER_CACHE_DIR)')
  .action(async (options) => {
    console.log('启动生成器...');
    let executablePath;
    if (process.platform === 'darwin') {
      executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    } else if (process.platform === 'win32') {
      executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    } else if (process.platform === 'linux') {
      executablePath = '/usr/bin/google-chrome';
    }

    if (executablePath && !fs.existsSync(executablePath)) {
      executablePath = undefined;
    }
    
    const launchOptions = {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    };
    if (executablePath) {
      console.log(`已检测到系统 Chrome，路径: ${executablePath}`);
      launchOptions.executablePath = executablePath;
    } else {
      console.log('未检测到系统 Chrome，将尝试使用 Puppeteer 内置浏览器...');
    }
    
    try {
      const browser = await puppeteer.launch(launchOptions);
      
      const page = await browser.newPage();
      
      // Set viewport to the cover size
      await page.setViewport({ width: 1200, height: 480, deviceScaleFactor: 2 });
      
      const templatePath = path.resolve(__dirname, '../assets/template.html');
      const fileUrl = `file://${templatePath}`;
      
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
      
      await page.waitForSelector('#render-ready', { timeout: 10000 });
      
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
    } catch (error) {
      console.error('生成失败:', error.message);
      process.exit(1);
    }
});

program.parse();
