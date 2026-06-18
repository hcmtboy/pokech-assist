#!/usr/bin/env node
"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const DETAIL_DATA_PATH = path.join(DATA_DIR, "detail-data.js");

const TYPE_MAP = {
  normal: "ノーマル",
  fire: "ほのお",
  water: "みず",
  electric: "でんき",
  grass: "くさ",
  ice: "こおり",
  fighting: "かくとう",
  poison: "どく",
  ground: "じめん",
  flying: "ひこう",
  psychic: "エスパー",
  bug: "むし",
  rock: "いわ",
  ghost: "ゴースト",
  dragon: "ドラゴン",
  dark: "あく",
  steel: "はがね",
  fairy: "フェアリー",
};

const DAMAGE_CLASS_MAP = {
  physical: "物理",
  special: "特殊",
  status: "変化",
};

function normalizeText(text) {
  return String(text ?? "")
    .replace(/\r?\n|\f/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickJapaneseName(names) {
  return names.find((entry) => entry.language.name === "ja-hrkt")?.name
    ?? names.find((entry) => entry.language.name === "ja-Hrkt")?.name
    ?? names.find((entry) => entry.language.name === "ja")?.name
    ?? "";
}

function pickFlavor(entries) {
  const japanese = entries.filter((entry) => entry.language.name === "ja-hrkt" || entry.language.name === "ja-Hrkt" || entry.language.name === "ja");
  const latest = japanese.at(-1);
  return normalizeText(latest?.flavor_text ?? latest?.text ?? "");
}

function pickEffect(entries) {
  const japanese = entries.find((entry) => entry.language.name === "ja-hrkt")
    ?? entries.find((entry) => entry.language.name === "ja-Hrkt")
    ?? entries.find((entry) => entry.language.name === "ja");
  return normalizeText(japanese?.short_effect ?? japanese?.effect ?? "");
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

async function fetchResourceMap(endpoint, transform) {
  const list = await fetchJson(`https://pokeapi.co/api/v2/${endpoint}?limit=100000&offset=0`);
  const map = new Map();
  let done = 0;
  const workers = Array.from({ length: 16 }, async (_, workerIndex) => {
    for (let index = workerIndex; index < list.results.length; index += 16) {
      const item = list.results[index];
      const detail = await fetchJson(item.url);
      const japaneseName = pickJapaneseName(detail.names ?? []);
      if (japaneseName) map.set(japaneseName, transform(detail, japaneseName));
      done += 1;
      if (done % 100 === 0 || done === list.results.length) console.log(`${endpoint}: ${done}/${list.results.length}`);
    }
  });
  await Promise.all(workers);
  return map;
}

async function fetchNeededResourceMap(endpoint, targetNames, transform) {
  const list = await fetchJson(`https://pokeapi.co/api/v2/${endpoint}?limit=100000&offset=0`);
  const unresolved = new Set(targetNames);
  const map = new Map();
  let done = 0;
  const workers = Array.from({ length: 16 }, async (_, workerIndex) => {
    for (let index = workerIndex; index < list.results.length; index += 16) {
      if (!unresolved.size) break;
      const item = list.results[index];
      const detail = await fetchJson(item.url);
      const japaneseName = pickJapaneseName(detail.names ?? []);
      if (unresolved.has(japaneseName)) {
        map.set(japaneseName, transform(detail, japaneseName));
        unresolved.delete(japaneseName);
      }
      done += 1;
      if (done % 100 === 0 || !unresolved.size) console.log(`${endpoint}: scanned ${done}/${list.results.length}, matched ${map.size}/${targetNames.length}`);
    }
  });
  await Promise.all(workers);
  return map;
}

/*
async function fetchResourceMap(endpoint, transform) {
  const list = await fetchJson(`https://pokeapi.co/api/v2/${endpoint}?limit=100000&offset=0`);
  const map = new Map();
  for (const item of list.results) {
    const detail = await fetchJson(item.url);
    const japaneseName = pickJapaneseName(detail.names ?? []);
    if (japaneseName) map.set(japaneseName, transform(detail, japaneseName));
  }
  return map;
}
*/

async function readDetailData() {
  const content = await fs.readFile(DETAIL_DATA_PATH, "utf8");
  const json = content.replace(/^window\.POKECH_DETAILS\s*=\s*/, "").replace(/;\s*$/, "");
  return JSON.parse(json);
}

async function addUsedDetails(details) {
  const pokemonData = JSON.parse(await fs.readFile(path.join(DATA_DIR, "pokemon.json"), "utf8"));
  for (const pokemon of pokemonData.pokemon ?? []) {
    for (const [name, , type] of pokemon.moves ?? []) {
      if (!name) continue;
      details.moves[name] ??= { name };
      if (type && !details.moves[name].type) details.moves[name].type = type;
    }
    for (const [name, type] of pokemon.learnableMoves ?? []) {
      if (!name) continue;
      details.moves[name] ??= { name };
      if (type && !details.moves[name].type) details.moves[name].type = type;
    }
    for (const [name] of pokemon.items ?? []) {
      if (!name) continue;
      details.items[name] ??= { name };
    }
    for (const [name] of pokemon.abilities ?? []) {
      if (!name) continue;
      details.abilities[name] ??= { name };
    }
  }
  return details;
}

async function writeDetailData(details) {
  const ordered = {
    moves: Object.fromEntries(Object.entries(details.moves).sort(([a], [b]) => a.localeCompare(b, "ja"))),
    items: Object.fromEntries(Object.entries(details.items).sort(([a], [b]) => a.localeCompare(b, "ja"))),
    abilities: Object.fromEntries(Object.entries(details.abilities).sort(([a], [b]) => a.localeCompare(b, "ja"))),
  };
  await fs.writeFile(DETAIL_DATA_PATH, `window.POKECH_DETAILS = ${JSON.stringify(ordered, null, 2)};\n`, "utf8");
}

function mergeKnown(base, fetched) {
  const hit = fetched.get(base.name);
  return hit ? { ...base, ...hit, name: base.name } : base;
}

function countMissing(details) {
  return Object.fromEntries(
    Object.entries(details).map(([kind, values]) => [
      kind,
      Object.values(values).filter((entry) => !(entry.description || entry.effect)).length,
    ]),
  );
}

function applyFallbackDetails(details) {
  const moveDescriptions = {
    アーマーキャノン: "自分の防御と特防を下げる代わりに、強力な砲撃で攻撃する。",
    アイススピナー: "足を回転させて攻撃する。場のフィールドを破壊する。",
    アクアカッター: "水の刃で攻撃する。急所に当たりやすい。",
    アクアステップ: "軽やかなステップで攻撃し、自分の素早さを上げる。",
    ウェーブタックル: "水をまとって全力で突撃する。自分も反動ダメージを受ける。",
    うらみつらみ: "相手への恨みをこめて攻撃し、相手の攻撃を下げることがある。",
    エレクトロビーム: "1ターン目に電気を集めて特攻を上げ、2ターン目に攻撃する。雨のときはすぐに攻撃できる。",
    おかたづけ: "場の設置物やみがわりを片づけ、自分の攻撃と素早さを上げる。",
    おはかまいり: "倒れた味方が多いほど威力が上がる。",
    がんせきアックス: "岩の斧で攻撃し、相手の場にステルスロックを設置する。",
    きまぐレーザー: "光線で攻撃する。ときどき威力が大きく上がる。",
    キラースピン: "相手を毒状態にすることがあり、しめつけ・やどりぎ・設置技などを解除する。",
    くさわけ: "草をかき分けるように攻撃し、自分の素早さを上げる。",
    サイコノイズ: "不快な音波で攻撃し、相手をしばらく回復できない状態にする。",
    さむいギャグ: "雪を降らせたあと、控えのポケモンと交代する。",
    サンダーダイブ: "電気をまとって突撃する。外すと自分が大きなダメージを受ける。",
    ジェットパンチ: "目にも止まらぬ速さのパンチで先制攻撃する。",
    しおづけ: "相手をしおづけ状態にし、毎ターンダメージを与える。みず・はがねタイプには効果が大きい。",
    しっぽきり: "HPを削ってみがわりを残し、控えのポケモンと交代する。",
    シャカシャカほう: "お茶をまき散らして攻撃し、与えたダメージに応じて自分のHPを回復する。やけどにすることがある。",
    たてこもる: "硬い殻にこもって、自分の防御を大きく上げる。",
    ツインビーム: "不思議な光線を2回連続で放って攻撃する。",
    デカハンマー: "大きなハンマーで攻撃する。連続して使うことはできない。",
    ドゲザン: "相手に斬りかかって攻撃する。攻撃は必ず命中する。",
    とびつく: "相手に飛びついて攻撃し、相手の素早さを下げる。",
    トリックフラワー: "必中で攻撃し、必ず急所に当たる。",
    ネズミざん: "連続で攻撃する。最大10回まで当たる。",
    はやてがえし: "相手が先制技を使うときだけ成功し、相手をひるませる。",
    バリアーラッシュ: "バリアをまとって突進し、自分の防御を上げることがある。",
    "ひけん・ちえなみ": "鋭い刃で攻撃し、相手の場にまきびしを設置する。",
    ひゃっきやこう: "相手が状態異常のとき威力が上がる。やけどにすることがある。",
    ひやみず: "冷たい水で攻撃し、相手の攻撃を下げる。",
    ひょうざんおろし: "大きな氷の塊をぶつけて攻撃し、相手をひるませることがある。",
    フェイタルクロー: "爪で攻撃し、相手を毒・まひ・ねむりのいずれかにすることがある。",
    ぶちかまし: "全力で突撃して攻撃する。自分の防御と特防が下がる。",
    フレアソング: "歌いながら炎で攻撃し、自分の特攻を上げる。",
    ほうふく: "そのターンに受けたダメージをもとに、相手へ大きなダメージを返す。",
    みずあめボム: "相手をみずあめまみれにし、数ターンのあいだ素早さを下げ続ける。",
    みわくのボイス: "魅惑の声で攻撃する。そのターン能力が上がった相手を混乱させる。",
    むねんのつるぎ: "剣で斬りつけ、与えたダメージに応じて自分のHPを回復する。",
    やけっぱち: "前のターンに技を外すなど失敗していると威力が上がる。",
    ゆきげしき: "天気を雪にする。こおりタイプの防御が上がる。",
    ルミナコリジョン: "精神に作用する光で攻撃し、相手の特防を大きく下げる。",
    レイジングブル: "荒々しく突進して攻撃する。壁やオーロラベールを破壊する。使うポケモンによってタイプが変わる。",
    "10まんばりき": "全身を使って相手に猛アタックする。",
    かかとおとし: "かかと落としで攻撃する。外すと自分が大きなダメージを受ける。",
    ゴールドラッシュ: "大量のコインを投げつけて攻撃し、自分の特攻が下がる。",
    だいふんげき: "荒れ狂う炎で2-3ターン攻撃し、その後混乱する。",
    どくばりセンボン: "毒の針を大量に飛ばして攻撃する。相手が毒状態なら威力が上がる。",
    ドラゴンエール: "味方を鼓舞して急所率を上げる。ドラゴンタイプには効果が大きい。",
    ハードプレス: "相手を押しつぶして攻撃する。相手の残りHPが多いほど威力が上がる。",
    ハバネロエキス: "相手の攻撃を大きく上げる代わりに、防御を大きく下げる。",
  };

  Object.entries(moveDescriptions).forEach(([name, description]) => {
    if (details.moves[name] && !(details.moves[name].description || details.moves[name].effect)) {
      details.moves[name].description = description;
    }
  });
  const moveFallbacks = {
    "10まんばりき": { type: "じめん", category: "物理", power: 95, accuracy: 95, pp: 10, priority: 0 },
    かかとおとし: { type: "かくとう", category: "物理", power: 120, accuracy: 90, pp: 10, priority: 0 },
    ゴールドラッシュ: { type: "はがね", category: "特殊", power: 120, accuracy: 100, pp: 5, priority: 0 },
    だいふんげき: { type: "ほのお", category: "物理", power: 120, accuracy: 100, pp: 10, priority: 0 },
    どくばりセンボン: { type: "どく", category: "物理", power: 60, accuracy: 100, pp: 10, priority: 0 },
    ドラゴンエール: { type: "ドラゴン", category: "変化", power: null, accuracy: null, pp: 15, priority: 0 },
    ハードプレス: { type: "はがね", category: "物理", power: null, accuracy: 100, pp: 10, priority: 0 },
    ハバネロエキス: { type: "くさ", category: "変化", power: null, accuracy: null, pp: 15, priority: 0 },
  };
  Object.entries(moveFallbacks).forEach(([name, fallback]) => {
    if (!details.moves[name]) return;
    Object.entries(fallback).forEach(([key, value]) => {
      if (details.moves[name][key] === undefined || details.moves[name][key] === "") details.moves[name][key] = value;
    });
  });
  if (details.items["ようせいのハネ"] && !(details.items["ようせいのハネ"].description || details.items["ようせいのハネ"].effect)) {
    details.items["ようせいのハネ"].category = "タイプ強化";
    details.items["ようせいのハネ"].description = "持たせるとフェアリータイプの技の威力が上がる。";
  }
  Object.entries(details.items).forEach(([name, item]) => {
    if (name.endsWith("ナイト") && !(item.description || item.effect)) {
      item.category = "メガストーン";
      item.description = "対応するポケモンに持たせると、メガシンカできる。";
    }
  });
}

async function main() {
  const details = await addUsedDetails(await readDetailData());
  const [moves, items, abilities] = await Promise.all([
    fetchNeededResourceMap("move", Object.keys(details.moves), (detail, name) => ({
      name,
      type: TYPE_MAP[detail.type?.name] ?? undefined,
      category: DAMAGE_CLASS_MAP[detail.damage_class?.name] ?? undefined,
      power: detail.power,
      accuracy: detail.accuracy,
      pp: detail.pp,
      priority: detail.priority,
      description: pickFlavor(detail.flavor_text_entries ?? []) || pickEffect(detail.effect_entries ?? []),
    })),
    fetchNeededResourceMap("item", Object.keys(details.items), (detail, name) => ({
      name,
      category: pickJapaneseName(detail.category?.names ?? []),
      description: pickFlavor(detail.flavor_text_entries ?? []) || pickEffect(detail.effect_entries ?? []),
    })),
    fetchNeededResourceMap("ability", Object.keys(details.abilities), (detail, name) => ({
      name,
      description: pickFlavor(detail.flavor_text_entries ?? []) || pickEffect(detail.effect_entries ?? []),
    })),
  ]);

  Object.keys(details.moves).forEach((name) => {
    details.moves[name] = mergeKnown(details.moves[name], moves);
  });
  Object.keys(details.items).forEach((name) => {
    details.items[name] = mergeKnown(details.items[name], items);
  });
  Object.keys(details.abilities).forEach((name) => {
    details.abilities[name] = mergeKnown(details.abilities[name], abilities);
  });
  applyFallbackDetails(details);

  await writeDetailData(details);
  console.log({
    moves: Object.keys(details.moves).length,
    items: Object.keys(details.items).length,
    abilities: Object.keys(details.abilities).length,
    missing: countMissing(details),
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
