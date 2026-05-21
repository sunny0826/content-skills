#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const DEFAULT_MAX_TEXT_CHARS = 200000;
const DEFAULT_MAX_IMAGES = 40;

function usage() {
  return [
    'Usage:',
    '  node content-creator/scripts/extract_web.mjs <url...> [--out-dir <dir>] [--max-text-chars <n>] [--max-images <n>]',
    '',
    'Writes extracted source files to disk and prints only a compact summary to stdout.',
  ].join('\n');
}

function readFlag(args, name) {
  const index = args.indexOf(name);
  if (index === -1) return null;
  return args[index + 1] ?? null;
}

function parseArgs(argv) {
  const urls = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      i += 1;
      continue;
    }
    urls.push(arg);
  }

  const outDir =
    readFlag(argv, '--out-dir') ||
    path.join(os.tmpdir(), `content-creator-sources-${Date.now()}`);
  const maxTextChars = Number(readFlag(argv, '--max-text-chars') || DEFAULT_MAX_TEXT_CHARS);
  const maxImages = Number(readFlag(argv, '--max-images') || DEFAULT_MAX_IMAGES);

  return { urls, outDir: path.resolve(outDir), maxTextChars, maxImages };
}

function decodeEntities(value) {
  const named = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
    mdash: '-',
    ndash: '-',
  };
  return String(value || '').replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity) => {
    if (entity[0] === '#') {
      const isHex = entity[1]?.toLowerCase() === 'x';
      const code = Number.parseInt(entity.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return named[entity] ?? match;
  });
}

function stripNoise(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<header\b[^>]*>[\s\S]*?<\/header>/gi, ' ')
    .replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, ' ');
}

function firstMatch(html, regex) {
  const match = html.match(regex);
  return match ? decodeEntities(stripTags(match[1])).trim() : '';
}

function stripTags(html) {
  return String(html || '').replace(/<[^>]+>/g, ' ');
}

function attrValue(tag, name) {
  const regex = new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  const match = tag.match(regex);
  return decodeEntities(match?.[2] ?? match?.[3] ?? match?.[4] ?? '').trim();
}

function resolveUrl(base, maybeUrl) {
  try {
    return new URL(maybeUrl, base).toString();
  } catch {
    return maybeUrl;
  }
}

function extractMainHtml(html) {
  const candidates = [
    /<main\b[^>]*>([\s\S]*?)<\/main>/i,
    /<article\b[^>]*>([\s\S]*?)<\/article>/i,
    /<[^>]+role=["']main["'][^>]*>([\s\S]*?)<\/[^>]+>/i,
  ];
  for (const regex of candidates) {
    const match = html.match(regex);
    if (match?.[1] && match[1].length > 500) return match[1];
  }
  return html;
}

function extractText(html, maxTextChars) {
  const withBreaks = html
    .replace(/<\/(p|div|section|article|main|li|h[1-6]|tr|blockquote|pre)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '- ');
  return decodeEntities(stripTags(withBreaks))
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
    .slice(0, maxTextChars);
}

function extractHeadings(html) {
  const headings = [];
  const regex = /<h([1-3])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const text = decodeEntities(stripTags(match[2])).replace(/\s+/g, ' ').trim();
    if (text) headings.push({ level: Number(match[1]), text });
    if (headings.length >= 80) break;
  }
  return headings;
}

function extractImages(html, baseUrl, maxImages) {
  const images = [];
  const regex = /<img\b[^>]*>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const tag = match[0];
    const src = attrValue(tag, 'src') || attrValue(tag, 'data-src') || attrValue(tag, 'data-original');
    if (!src || src.startsWith('data:')) continue;
    images.push({
      src: resolveUrl(baseUrl, src),
      alt: attrValue(tag, 'alt'),
      title: attrValue(tag, 'title'),
    });
    if (images.length >= maxImages) break;
  }
  return images;
}

function extractLinks(html, baseUrl) {
  const links = [];
  const regex = /<a\b[^>]*href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const href = decodeEntities(match[2] ?? match[3] ?? match[4] ?? '').trim();
    const text = decodeEntities(stripTags(match[5])).replace(/\s+/g, ' ').trim();
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) continue;
    links.push({ href: resolveUrl(baseUrl, href), text });
    if (links.length >= 80) break;
  }
  return links;
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'user-agent':
          'Mozilla/5.0 (compatible; content-creator-skill/1.0; +https://github.com/sunny0826/content-skills)',
        accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8',
      },
    });
    const html = await response.text();
    return { finalUrl: response.url || url, status: response.status, html };
  } finally {
    clearTimeout(timeout);
  }
}

async function extractSource(url, index, options) {
  const { finalUrl, status, html } = await fetchHtml(url);
  const cleaned = stripNoise(html);
  const mainHtml = extractMainHtml(cleaned);
  const title =
    firstMatch(html, /<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
    firstMatch(html, /<title\b[^>]*>([\s\S]*?)<\/title>/i) ||
    firstMatch(mainHtml, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  const description =
    firstMatch(html, /<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
    firstMatch(html, /<meta\b[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  const text = extractText(mainHtml, options.maxTextChars);
  const headings = extractHeadings(mainHtml);
  const images = extractImages(mainHtml, finalUrl, options.maxImages);
  const links = extractLinks(mainHtml, finalUrl);

  const baseName = `source-${String(index + 1).padStart(2, '0')}`;
  const textPath = path.join(options.outDir, `${baseName}.txt`);
  const jsonPath = path.join(options.outDir, `${baseName}.json`);
  const payload = {
    url,
    finalUrl,
    status,
    title,
    description,
    headings,
    images,
    links,
    textPath,
    textChars: text.length,
  };

  fs.writeFileSync(textPath, text, 'utf8');
  fs.writeFileSync(jsonPath, JSON.stringify({ ...payload, text }, null, 2), 'utf8');
  return { ...payload, jsonPath };
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(usage());
    return;
  }

  const options = parseArgs(argv);
  if (options.urls.length === 0) {
    console.error(usage());
    process.exit(2);
  }

  fs.mkdirSync(options.outDir, { recursive: true });
  const sources = [];
  for (let i = 0; i < options.urls.length; i += 1) {
    sources.push(await extractSource(options.urls[i], i, options));
  }

  const summary = {
    outDir: options.outDir,
    sources: sources.map((source) => ({
      url: source.url,
      finalUrl: source.finalUrl,
      status: source.status,
      title: source.title,
      description: source.description,
      textPath: source.textPath,
      jsonPath: source.jsonPath,
      textChars: source.textChars,
      imageCount: source.images.length,
      images: source.images.slice(0, 10),
      headingCount: source.headings.length,
    })),
  };
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(`extract_web failed: ${error.message}`);
  process.exit(1);
});
