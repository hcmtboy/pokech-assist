#!/usr/bin/env node
"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const GAMEWITH_BASE = "https://gamewith.jp";

const sources = {
  championsRoster: {
    url: "https://gamewith.jp/pokemon-champions/546414",
    note: "内定ポケモン一覧・個別ページURL取得元",
  },
  usageRanking: {
    url: "https://gamewith.jp/pokemon-champions/555373",
    note: "シングル使用率ランキング順位取得元",
  },
};

const TYPE_NAMES = [
  "ノーマル",
  "ほのお",
  "みず",
  "でんき",
  "くさ",
  "こおり",
  "かくとう",
  "どく",
  "じめん",
  "ひこう",
  "エスパー",
  "むし",
  "いわ",
  "ゴースト",
  "ドラゴン",
  "あく",
  "はがね",
  "フェアリー",
];

const TYPE_CODE_MAP = {
  ノ: "ノーマル",
  炎: "ほのお",
  水: "みず",
  電: "でんき",
  草: "くさ",
  氷: "こおり",
  闘: "かくとう",
  格: "かくとう",
  毒: "どく",
  地: "じめん",
  飛: "ひこう",
  エ: "エスパー",
  虫: "むし",
  岩: "いわ",
  ゴ: "ゴースト",
  ド: "ドラゴン",
  悪: "あく",
  鋼: "はがね",
  妖: "フェアリー",
};

const args = new Set(process.argv.slice(2));
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : 0;

async function readJson(fileName) {
  return JSON.parse(await fs.readFile(path.join(DATA_DIR, fileName), "utf8"));
}

async function writeJson(fileName, data) {
  await fs.writeFile(path.join(DATA_DIR, fileName), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function writeBrowserData(pokemon, champions) {
  const content = `"use strict";\nwindow.POKECH_DATA = ${JSON.stringify(pokemon)};\nwindow.POKECH_CHAMPIONS = ${JSON.stringify(champions)};\n`;
  await fs.writeFile(path.join(DATA_DIR, "pokemon-data.js"), content, "utf8");
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 PokeChAssistDataUpdater/0.1",
    },
  });
  if (!response.ok) throw new Error(`${url} ${response.status}`);
  return response.text();
}

function decodeHtml(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripTags(html) {
  return decodeHtml(html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function absolutizeUrl(url) {
  if (url.startsWith("http")) return url;
  if (url.startsWith("/")) return `${GAMEWITH_BASE}${url}`;
  return `${GAMEWITH_BASE}/${url}`;
}

function fullType(code) {
  return TYPE_CODE_MAP[code] ?? code;
}

function formBaseName(name) {
  return name.replace(/\(.+\)$/, "");
}

const FORM_TAB_GROUPS = new Set(["ギルガルド", "ポワルン", "イルカマン", "イッカネズミ"]);

function formGroupNameFor(name, allNames) {
  const base = formBaseName(name);
  const members = allNames.filter((candidate) => candidate === base || candidate.startsWith(`${base}(`));
  return FORM_TAB_GROUPS.has(base) && members.length > 1 ? base : name;
}

function rankingKeyForName(name, allNames) {
  if (name.startsWith("メガ")) {
    const base = allNames
      .filter((candidate) => candidate !== name && name.startsWith(`メガ${candidate}`))
      .sort((a, b) => b.length - a.length)[0];
    if (base) return formGroupNameFor(base, allNames);
  }
  return formGroupNameFor(name, allNames);
}

function rankingAliases(key) {
  const aliases = new Set([key]);
  aliases.add(
    key
      .replace("えいえんのはな", "永遠")
      .replace("たそがれ", "黄昏")
      .replace("まひる", "昼")
      .replace("まよなか", "夜")
      .replace("ほのお", "炎")
      .replace("みず", "水")
      .replace("かくとう", "闘")
      .replace("こだましゅ", "こだま")
      .replace("ちゅうだましゅ", "ちゅうだま")
      .replace("おおだましゅ", "おおだま")
      .replace("ギガだましゅ", "ギガだま"),
  );
  return [...aliases].filter(Boolean);
}

function extractArticleBody(html) {
  const jsonMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/g);
  for (const match of jsonMatches) {
    try {
      const parsed = JSON.parse(match[1]);
      const candidates = Array.isArray(parsed) ? parsed : [parsed];
      const article = candidates.find((item) => item?.articleBody);
      if (article?.articleBody) return article.articleBody;
    } catch {
      const fallback = stripTags(match[1]);
      if (fallback.includes("articleBody")) return fallback;
    }
  }
  return "";
}

function extractUsageRanking(html, pokemonNames) {
  const body = decodeHtml(extractArticleBody(html));
  const startToken = "※特性込み※メガシンカ後のみ";
  const endToken = "ランキング&詳細データ";
  const start = body.indexOf(startToken);
  const end = body.indexOf(endToken, start);
  if (start < 0 || end < 0) return new Map();

  const rankingText = body.slice(start + startToken.length, end).replace(/\s+/g, "");
  const uniqueKeys = [...new Set(pokemonNames.map((name) => rankingKeyForName(name, pokemonNames)))];
  const aliasEntries = uniqueKeys.flatMap((key) => rankingAliases(key).map((alias) => [alias, key]));
  aliasEntries.sort((a, b) => b[0].length - a[0].length);

  const rankMap = new Map();
  let index = 0;
  while (index < rankingText.length) {
    const match = aliasEntries.find(([alias]) => rankingText.startsWith(alias, index));
    if (!match) {
      index += 1;
      continue;
    }
    const [alias, key] = match;
    if (!rankMap.has(key)) rankMap.set(key, rankMap.size + 1);
    index += alias.length;
  }

  return rankMap;
}

function articleUrl(articleId) {
  return articleId ? `${GAMEWITH_BASE}/pokemon-champions/${articleId}` : "";
}

function extractField(chunk, field) {
  return chunk.match(new RegExp(`${field}:'([^']*)'`))?.[1] ?? "";
}

function extractRosterEntries(html) {
  const entries = new Map();
  const pokemonBlock = html.match(/window\.wmt\.pokemonDatas=\[([\s\S]*?)\];/)?.[1] ?? html;
  const pokemonPattern = /\{id:'[^']+'[\s\S]*?(?=,\{id:'|$)/g;
  let match;
  const representativeByNo = new Map();

  while ((match = pokemonPattern.exec(pokemonBlock))) {
    const chunk = match[0];
    const name = decodeHtml(extractField(chunk, "n")).trim();
    const stats = extractField(chunk, "st").split("-").map(Number);
    const no = extractField(chunk, "no");
    const aid = extractField(chunk, "aid");
    const aid2 = extractField(chunk, "aid2");
    if (!name || stats.length !== 6 || stats.some(Number.isNaN)) continue;

    const types = [fullType(extractField(chunk, "t1")), fullType(extractField(chunk, "t2"))].filter(Boolean);
    const entry = {
      name,
      no,
      url: articleUrl(aid),
      usageUrl: articleUrl(aid2 || aid),
      types,
      base: {
        hp: stats[0],
        atk: stats[1],
        def: stats[2],
        spa: stats[3],
        spd: stats[4],
        spe: stats[5],
      },
      isMega: name.startsWith("メガ") || chunk.includes("fg:['mg']"),
    };
    if (no && entry.usageUrl) representativeByNo.set(no, entry);
    entries.set(name, entry);
  }

  const values = [...entries.values()];
  values.forEach((entry) => {
    if (entry.usageUrl || !entry.no) return;
    const representative = representativeByNo.get(entry.no);
    if (!representative) return;
    entry.url = representative.url;
    entry.usageUrl = representative.usageUrl;
  });
  return values.filter((entry) => entry.usageUrl);
}

function extractMoveDex(html) {
  const moveDex = new Map();
  const movePattern = /\{id:'[^']+',n:'([^']+)',t:'([^']+)',c:'[^']+',st:'[^']*',tx:'[\s\S]*?',aid:'[^']*'\}/g;
  let match;

  while ((match = movePattern.exec(html))) {
    moveDex.set(decodeHtml(match[1]), fullType(match[2]));
  }

  return moveDex;
}

function extractRankRows(section, label, maxRows, withMoveType = false) {
  const start = section.indexOf(label);
  if (start < 0) return [];
  const tail = section.slice(start + label.length);
  const end = tail.search(/順位\s+(わざ|持ち物|特性|性格|チーム|能力)\s+使用率/g);
  const chunk = end >= 0 ? tail.slice(0, end) : tail.slice(0, 2200);
  const rows = [];
  const rowPattern = /(\d+)位\s+((?:ノーマル|ほのお|みず|でんき|くさ|こおり|かくとう|どく|じめん|ひこう|エスパー|むし|いわ|ゴースト|ドラゴン|あく|はがね|フェアリー)\s+)?(.+?)\s+(\d+(?:\.\d+)?)%/g;
  let match;

  while ((match = rowPattern.exec(chunk)) && rows.length < maxRows) {
    const type = match[2]?.trim();
    const name = match[3].replace(/\s+/g, " ").trim();
    const rate = Number(match[4]);
    if (!name || name.includes("順位")) continue;
    rows.push(withMoveType && type ? [name, rate, type] : [name, rate]);
  }

  return rows;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractLabeledChunk(section, label, endLabels) {
  const pattern = new RegExp(`${escapeRegExp(label)}\\s+`, "g");
  let match;
  const chunks = [];
  while ((match = pattern.exec(section))) {
    const start = match.index + match[0].length;
    const tail = section.slice(start);
    const endIndexes = endLabels
      .map((endLabel) => tail.indexOf(endLabel))
      .filter((index) => index >= 0);
    const end = endIndexes.length ? Math.min(...endIndexes) : Math.min(tail.length, 2000);
    chunks.push(tail.slice(0, end).replace(/\s+/g, " ").trim());
  }
  return chunks.find((chunk) => /\d+(?:\.\d+)?%/.test(chunk)) ?? chunks[0] ?? "";
}

function extractPercentPairs(chunk, maxRows) {
  const rows = [];
  const rowPattern = /(.+?)(\d+(?:\.\d+)?)%/g;
  let match;
  while ((match = rowPattern.exec(chunk)) && rows.length < maxRows) {
    const name = match[1].replace(/[()]/g, "").replace(/\s+/g, " ").trim();
    const rate = Number(match[2]);
    if (!name || name.includes("順位")) continue;
    rows.push([name, rate]);
  }
  return rows;
}

function extractAbilityRows(section) {
  const chunk = extractLabeledChunk(section, "特性", ["全ポケモン", "技・持ち物", "技"]);
  const rows = [];
  const rowPattern = /([^()%]+)\((\d+(?:\.\d+)?)%\)/g;
  let match;
  while ((match = rowPattern.exec(chunk)) && rows.length < 5) {
    const name = match[1].replace(/.*メガ後特性:\s*/, "").trim();
    const rate = Number(match[2]);
    if (name) rows.push([name, rate]);
  }
  return rows;
}

function extractModernUsage(text, moveDex) {
  const singleStart = text.indexOf("シングルバトル使用率");
  const doubleStart = text.indexOf("ダブルバトル使用率");
  if (singleStart < 0) return null;

  const single = text.slice(singleStart, doubleStart > singleStart ? doubleStart : undefined);
  const double = doubleStart >= 0 ? text.slice(doubleStart) : "";
  const singleRank = single.match(/採用率\s*(\d+)位/)?.[1];
  const doubleRank = double.match(/採用率\s*(\d+)位/)?.[1];
  const moveChunk = extractLabeledChunk(single, "技", ["持ち物"]);
  const itemChunk = extractLabeledChunk(single, "持ち物", ["能力ポイント", "性格", "同じチーム"]);

  return {
    singleRank: singleRank ? Number(singleRank) : null,
    doubleRank: doubleRank ? Number(doubleRank) : null,
    moves: extractPercentPairs(moveChunk, 10).map(([name, rate]) => [name, rate, moveDex.get(name)]),
    items: extractPercentPairs(itemChunk, 5),
    abilities: extractAbilityRows(single),
  };
}

function extractUsage(text, moveDex) {
  const modern = extractModernUsage(text, moveDex);
  if (modern && (modern.moves.length || modern.items.length || modern.abilities.length)) return modern;

  const rankMatch = text.match(/使用率\s+シングル\s+(\d+)位\s+ダブル\s+(\d+)位/);
  const singleStart = text.indexOf("シングルバトル使用率");
  const doubleStart = text.indexOf("ダブルバトル使用率");
  const single = singleStart >= 0 ? text.slice(singleStart, doubleStart > singleStart ? doubleStart : undefined) : text;
  const moves = extractRankRows(single, "順位 わざ 使用率", 10, true).map(([name, rate, type]) => [
    name,
    rate,
    type ?? moveDex.get(name),
  ]);

  return {
    singleRank: rankMatch ? Number(rankMatch[1]) : null,
    doubleRank: rankMatch ? Number(rankMatch[2]) : null,
    moves,
    items: extractRankRows(single, "順位 持ち物 使用率", 5),
    abilities: extractRankRows(single, "順位 特性 使用率", 5),
  };
}

function firstIndexAfter(text, tokens) {
  const indexes = tokens.map((token) => text.indexOf(token)).filter((index) => index >= 0);
  return indexes.length ? Math.min(...indexes) : -1;
}

function skipSpaces(text, index) {
  let next = index;
  while (/\s/.test(text[next] ?? "")) next += 1;
  return next;
}

function moveRowEndIndex(text, index, name) {
  if (!text.startsWith(name, index)) return -1;
  let next = skipSpaces(text, index + name.length);
  if (!text.startsWith(name, next)) return -1;
  next = skipSpaces(text, next + name.length);
  return /[-\d０-９]/.test(text[next] ?? "") ? next : -1;
}

function extractLearnableMoves(text, pokemonName, moveDex) {
  const labels = [`${pokemonName}が覚える技`, `${formBaseName(pokemonName)}が覚える技`, "が覚える技"];
  const label = labels.find((item) => text.includes(item));
  if (!label) return [];

  let chunk = text.slice(text.indexOf(label) + label.length);
  const controlsEnd = chunk.indexOf("圧縮表示");
  if (controlsEnd >= 0) chunk = chunk.slice(controlsEnd + "圧縮表示".length);
  const end = firstIndexAfter(chunk, ["関連ページ", "この記事へ意見を送る", "コメント"]);
  if (end >= 0) chunk = chunk.slice(0, end);

  const moveNames = [...moveDex.keys()].sort((a, b) => b.length - a.length);
  const moves = [];
  const seen = new Set();
  let index = 0;
  while (index < chunk.length) {
    const name = moveNames.find((candidate) => moveRowEndIndex(chunk, index, candidate) >= 0);
    if (!name) {
      index += 1;
      continue;
    }
    if (!seen.has(name)) {
      seen.add(name);
      moves.push([name, moveDex.get(name)]);
    }
    index = moveRowEndIndex(chunk, index, name);
  }
  return moves;
}

async function scrapePokemonPage(entry, moveDex) {
  const html = await fetchHtml(entry.usageUrl);
  const text = stripTags(html);
  const usage = extractUsage(text, moveDex);
  let learnableMoves = extractLearnableMoves(text, entry.name, moveDex);
  if (!learnableMoves.length && entry.url && entry.url !== entry.usageUrl) {
    const detailHtml = await fetchHtml(entry.url);
    learnableMoves = extractLearnableMoves(stripTags(detailHtml), entry.name, moveDex);
  }

  return {
    name: entry.name,
    url: entry.url,
    usageUrl: entry.usageUrl,
    isMega: entry.isMega,
    types: entry.types,
    base: entry.base,
    singleRank: usage.singleRank,
    doubleRank: usage.doubleRank,
    moves: usage.moves,
    learnableMoves,
    items: usage.items,
    abilities: usage.abilities,
  };
}

async function scrapeGameWith() {
  const today = new Date().toISOString().slice(0, 10);
  const rosterHtml = await fetchHtml(sources.championsRoster.url);
  const rosterEntries = extractRosterEntries(rosterHtml);
  const usageRankingHtml = await fetchHtml(sources.usageRanking.url);
  const moveDex = extractMoveDex(rosterHtml);
  const targets = limit > 0 ? rosterEntries.slice(0, limit) : rosterEntries;
  const pokemon = [];

  if (!rosterEntries.length) {
    throw new Error("No roster entries parsed from GameWith. Existing data files were not changed.");
  }

  for (const [index, entry] of targets.entries()) {
    console.log(`[${index + 1}/${targets.length}] ${entry.name}`);
    try {
      pokemon.push(await scrapePokemonPage(entry, moveDex));
    } catch (error) {
      console.warn(`  skipped: ${error.message}`);
    }
  }

  const validPokemon = pokemon.filter((entry) => entry.base && entry.types.length);
  if (!validPokemon.length) {
    throw new Error("No valid pokemon parsed from GameWith. Existing data files were not changed.");
  }

  const rankMap = extractUsageRanking(usageRankingHtml, validPokemon.map((entry) => entry.name));
  const allNames = validPokemon.map((entry) => entry.name);
  const fallbackRankMap = new Map();
  validPokemon.forEach((entry) => {
    const key = rankingKeyForName(entry.name, allNames);
    if (!fallbackRankMap.has(key)) fallbackRankMap.set(key, rankMap.size + fallbackRankMap.size + 1);
    entry.singleRank = rankMap.get(key) ?? fallbackRankMap.get(key);
  });

  const pokemonData = {
    source: sources.championsRoster.url,
    lastUpdated: today,
    pokemon: validPokemon,
  };
  const championsData = {
    source: sources.championsRoster.url,
    lastUpdated: today,
    names: validPokemon.map((entry) => entry.name),
  };
  await writeJson("pokemon.json", pokemonData);
  await writeJson("champions.json", championsData);
  await writeBrowserData(pokemonData, championsData);

  console.log(`Saved ${validPokemon.length} pokemon.`);
}

async function updateMetadata() {
  const today = new Date().toISOString().slice(0, 10);
  const pokemon = await readJson("pokemon.json");
  const champions = await readJson("champions.json");

  pokemon.lastUpdated = today;
  champions.lastUpdated = today;

  await writeJson("pokemon.json", pokemon);
  await writeJson("champions.json", champions);
  await writeBrowserData(pokemon, champions);
}

async function main() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  if (args.has("--scrape-gamewith")) {
    await scrapeGameWith();
    return;
  }

  await updateMetadata();
  console.log("Data metadata refreshed.");
  console.log("Run with --scrape-gamewith to fetch from GameWith.");
  console.log("Example: node scripts/update-data.js --scrape-gamewith --limit=10");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
