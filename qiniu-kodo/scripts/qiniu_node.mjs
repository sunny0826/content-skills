#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import os from 'os';
import { execSync } from 'child_process';
import { createRequire } from 'module';

let qiniu;

function getCacheDir() {
  const args = process.argv.slice(2);
  const cacheDirIndex = args.indexOf('--cache-dir');
  if (cacheDirIndex !== -1 && args[cacheDirIndex + 1]) {
    return path.resolve(process.cwd(), args[cacheDirIndex + 1]);
  }
  const custom = process.env.QINIU_KODO_CACHE_DIR;
  if (custom && custom.trim()) return custom.trim();
  return path.join(os.homedir(), '.cache', 'qiniu-kodo-skill');
}

async function ensureDeps() {
  try {
    const localRequire = createRequire(import.meta.url);
    qiniu = localRequire('qiniu');
    return;
  } catch (err) {
    // 忽略本地找不到模块的错误，继续走缓存逻辑
  }

  const cacheDir = getCacheDir();
  const nmDir = path.join(cacheDir, 'node_modules');
  const qiniuPkg = path.join(nmDir, 'qiniu', 'package.json');
  
  if (!fs.existsSync(qiniuPkg)) {
    fs.mkdirSync(cacheDir, { recursive: true });
    const pkgPath = path.join(cacheDir, 'package.json');
    if (!fs.existsSync(pkgPath)) {
      fs.writeFileSync(
        pkgPath,
        JSON.stringify({ name: 'qiniu-kodo-skill-cache', private: true }, null, 2),
        'utf-8'
      );
    }
    console.error(`[qiniu-kodo-skill] 正在初始化依赖到缓存目录: ${cacheDir}`);
    execSync('npm i qiniu@^7.14.0 --no-save --silent --no-fund --no-audit', {
      cwd: cacheDir,
      stdio: 'ignore',
      env: { ...process.env, NPM_CONFIG_LOGLEVEL: 'error' }
    });
  }
  
  const cacheRequire = createRequire(path.join(cacheDir, 'package.json'));
  qiniu = cacheRequire('qiniu');
}

// 配置文件路径
const SKILL_DIR = path.dirname(__dirname);
const CONFIG_DIR = path.join(SKILL_DIR, 'config');
const CONFIG_FILE = path.join(CONFIG_DIR, 'qiniu-config.json');

function loadConfig() {
  let configPath = CONFIG_FILE;
  
  // 检查 qiniu-kodo/config/qiniu-config.json
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (isValidConfig(config)) return normalizeConfig(config);
  }
  
  // 备用检查路径：尝试找 ~/.kodo-config/qiniu-config.json
  const altConfigPath = path.join(os.homedir(), '.kodo-config', 'qiniu-config.json');
  if (fs.existsSync(altConfigPath)) {
    const config = JSON.parse(fs.readFileSync(altConfigPath, 'utf-8'));
    if (isValidConfig(config)) return normalizeConfig(config);
  }

  const envConfig = normalizeConfig({
    accessKey: process.env.QINIU_ACCESS_KEY,
    secretKey: process.env.QINIU_SECRET_KEY,
    bucket: process.env.QINIU_BUCKET || 'guoxudong-io',
    region: process.env.QINIU_REGION || 'z0',
    domain: process.env.QINIU_DOMAIN || ''
  });

  if (isValidConfig(envConfig)) return envConfig;

  throw new Error(
    `配置未找到: 既没有有效的 ${CONFIG_FILE}，也没有对应的环境变量 QINIU_ACCESS_KEY/QINIU_SECRET_KEY/QINIU_BUCKET`
  );
}

function normalizeConfig(config) {
  return {
    accessKey: config.accessKey,
    secretKey: config.secretKey,
    bucket: config.bucket,
    region: config.region || 'z0',
    domain: config.domain || ''
  };
}

function isValidConfig(config) {
  const required = ['accessKey', 'secretKey', 'bucket'];
  return required.every((k) => typeof config?.[k] === 'string' && config[k].trim() && !config[k].startsWith('你的'));
}

class QiniuKodo {
  constructor(config) {
    this.config = config;
    this.mac = new qiniu.auth.digest.Mac(config.accessKey, config.secretKey);
    this.bucketManager = new qiniu.rs.BucketManager(this.mac);
    this.bucket = config.bucket;
    this.domain = config.domain || '';
  }

  async upload(localPath, key) {
    if (!fs.existsSync(localPath)) {
      throw new Error(`文件不存在: ${localPath}`);
    }

    return new Promise((resolve, reject) => {
      const putPolicy = new qiniu.rs.PutPolicy({ scope: `${this.bucket}:${key}` });
      const uploadToken = putPolicy.uploadToken(this.mac);
      
      const config = new qiniu.conf.Config();
      config.zone = resolveZone(this.config.region);
      
      const formUploader = new qiniu.form_up.FormUploader(config);
      const putExtra = new qiniu.form_up.PutExtra();
      
      formUploader.putFile(uploadToken, key, localPath, putExtra, (respErr, respBody, respInfo) => {
        if (respErr) {
          reject(respErr);
          return;
        }
        
        if (respInfo.statusCode === 200) {
          resolve({
            success: true,
            key: respBody.key,
            hash: respBody.hash,
            url: this.domain ? buildPublicUrl(this.domain, respBody.key) : null,
            size: fs.statSync(localPath).size,
            bucket: this.bucket
          });
        } else {
          reject(new Error(`上传失败: ${respInfo.statusCode} ${JSON.stringify(respBody)}`));
        }
      });
    });
  }

  async testConnection() {
    return new Promise((resolve, reject) => {
      this.bucketManager.listPrefix(
        this.bucket,
        { prefix: '', limit: 1 },
        (err, respBody, respInfo) => {
          if (err) {
            reject(err);
            return;
          }
          if (respInfo.statusCode === 200) {
            resolve({ success: true, bucket: this.bucket, count: (respBody?.items || []).length });
          } else {
            reject(new Error(`连接验证失败: ${respInfo.statusCode}`));
          }
        }
      );
    });
  }
}

function resolveZone(region) {
  if (region === 'cn-east-2') return qiniu.zone.Zone_cn_east_2;
  if (region === 'z1') return qiniu.zone.Zone_z1;
  if (region === 'z2') return qiniu.zone.Zone_z2;
  if (region === 'na0') return qiniu.zone.Zone_na0;
  if (region === 'as0') return qiniu.zone.Zone_as0;
  return qiniu.zone.Zone_z0;
}

function buildPublicUrl(domain, key) {
  const d = String(domain || '').replace(/\/+$/, '');
  const k = String(key || '').replace(/^\/+/, '');
  return `${d}/${k}`;
}

function readFlag(args, name) {
  const idx = args.indexOf(name);
  if (idx === -1) return null;
  return args[idx + 1] ?? null;
}

function hasFlag(args, name) {
  return args.includes(name);
}

function normalizeKey(key) {
  return String(key || '')
    .replaceAll('\\', '/')
    .replace(/^\/+/, '');
}

function buildDefaultKey(localPath, prefix = 'image/') {
  const p = prefix ? String(prefix).replaceAll('\\', '/').replace(/^\/+/, '') : '';
  const finalPrefix = p.endsWith('/') ? p : `${p}/`;
  return normalizeKey(`${finalPrefix}${path.basename(localPath)}`);
}

function printUsage() {
  const lines = [
    '用法:',
    '  node scripts/qiniu_node.mjs upload --local <LocalPath> [--key <Key>] [--prefix <Prefix>] [--format json|text] [--cache-dir <dir>]',
    '  node scripts/qiniu_node.mjs test-connection [--cache-dir <dir>]',
    '',
    '示例:',
    '  node scripts/qiniu_node.mjs upload --local ./cover.png --key image/post-cover.png',
    '  node scripts/qiniu_node.mjs upload --local ./cover.png --prefix image/',
    '',
    '说明:',
    '  - 默认输出 json，便于其它 Skill/Agent 解析（包含 url/key/hash/size/bucket）',
    '  - 首次运行会自动在 ~/.cache/qiniu-kodo-skill/ 安装依赖，可通过 --cache-dir 或 QINIU_KODO_CACHE_DIR 自定义',
    '  - 若要返回公开 URL，请在 config/qiniu-config.json、~/.kodo-config/qiniu-config.json 或环境变量中配置 QINIU_DOMAIN'
  ];
  console.log(lines.join('\n'));
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  try {
    if (!command || command === 'help' || command === '--help' || command === '-h') {
      printUsage();
      return;
    }

    await ensureDeps();

    if (command === 'upload') {
      const localPath = readFlag(args, '--local');
      if (!localPath) throw new Error('缺少参数 --local <LocalPath>');

      const keyInput = readFlag(args, '--key');
      const prefix = readFlag(args, '--prefix') || 'image/';
      const key = normalizeKey(keyInput || buildDefaultKey(localPath, prefix));

      const outputFormat = readFlag(args, '--format') || 'json';
      const config = loadConfig();
      const kodo = new QiniuKodo(config);
      const result = await kodo.upload(localPath, key);

      if (outputFormat === 'text') {
        console.log(result.url || '');
      } else {
        console.log(JSON.stringify(result));
      }
      return;
    }

    if (command === 'test-connection') {
      const outputFormat = readFlag(args, '--format') || 'json';
      const config = loadConfig();
      const kodo = new QiniuKodo(config);
      const result = await kodo.testConnection();
      if (outputFormat === 'text') {
        console.log('ok');
      } else {
        console.log(JSON.stringify(result));
      }
      return;
    }
    if (hasFlag(args, '--help') || hasFlag(args, '-h')) {
      printUsage();
      return;
    }

    throw new Error(`未知命令: ${command}`);
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    process.exit(1);
  }
}

main();
