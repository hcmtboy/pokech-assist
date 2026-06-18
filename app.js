"use strict";

const STAT_LABELS = {
  hp: "HP",
  atk: "こうげき",
  def: "ぼうぎょ",
  spa: "とくこう",
  spd: "とくぼう",
  spe: "すばやさ",
};

const TYPE_COLORS = {
  ノーマル: "#919aa2",
  ほのお: "#ff9d55",
  みず: "#5090d6",
  でんき: "#f4d23c",
  くさ: "#63bc5a",
  こおり: "#73cec0",
  かくとう: "#e85d5d",
  どく: "#aa6bc8",
  じめん: "#d97845",
  ひこう: "#8fa9de",
  エスパー: "#fa7179",
  むし: "#91c12f",
  いわ: "#c5b78c",
  ゴースト: "#5269ad",
  ドラゴン: "#0b6dc3",
  あく: "#5a5465",
  はがね: "#5a8ea2",
  フェアリー: "#ec8fe6",
};

const TYPE_ORDER = [
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

const TYPE_ALIASES = {
  格: "かくとう",
};

const NAME_CORRECTIONS = {
  ドグロック: "ドクロッグ",
  ドグロッグ: "ドクロッグ",
};

const DETAIL_LABELS = {
  moves: "技",
  items: "持ち物",
  abilities: "特性",
};

const DETAIL_STORAGE_KEY = "pokechAssistCustomDetails";
let DETAIL_DATA = mergeDetailData(window.POKECH_DETAILS ?? { moves: {}, items: {}, abilities: {} }, loadCustomDetails());

const FORM_TAB_GROUPS = new Set(["ギルガルド", "ポワルン", "イルカマン", "イッカネズミ"]);

const TYPE_CHART = {
  ノーマル: { いわ: 0.5, ゴースト: 0, はがね: 0.5 },
  ほのお: { ほのお: 0.5, みず: 0.5, くさ: 2, こおり: 2, むし: 2, いわ: 0.5, ドラゴン: 0.5, はがね: 2 },
  みず: { ほのお: 2, みず: 0.5, くさ: 0.5, じめん: 2, いわ: 2, ドラゴン: 0.5 },
  でんき: { みず: 2, でんき: 0.5, くさ: 0.5, じめん: 0, ひこう: 2, ドラゴン: 0.5 },
  くさ: { ほのお: 0.5, みず: 2, くさ: 0.5, どく: 0.5, じめん: 2, ひこう: 0.5, むし: 0.5, いわ: 2, ドラゴン: 0.5, はがね: 0.5 },
  こおり: { ほのお: 0.5, みず: 0.5, くさ: 2, こおり: 0.5, じめん: 2, ひこう: 2, ドラゴン: 2, はがね: 0.5 },
  かくとう: { ノーマル: 2, こおり: 2, どく: 0.5, ひこう: 0.5, エスパー: 0.5, むし: 0.5, いわ: 2, ゴースト: 0, あく: 2, はがね: 2, フェアリー: 0.5 },
  どく: { くさ: 2, どく: 0.5, じめん: 0.5, いわ: 0.5, ゴースト: 0.5, はがね: 0, フェアリー: 2 },
  じめん: { ほのお: 2, でんき: 2, くさ: 0.5, どく: 2, ひこう: 0, むし: 0.5, いわ: 2, はがね: 2 },
  ひこう: { でんき: 0.5, くさ: 2, かくとう: 2, むし: 2, いわ: 0.5, はがね: 0.5 },
  エスパー: { かくとう: 2, どく: 2, エスパー: 0.5, あく: 0, はがね: 0.5 },
  むし: { ほのお: 0.5, くさ: 2, かくとう: 0.5, どく: 0.5, ひこう: 0.5, エスパー: 2, ゴースト: 0.5, あく: 2, はがね: 0.5, フェアリー: 0.5 },
  いわ: { ほのお: 2, こおり: 2, かくとう: 0.5, じめん: 0.5, ひこう: 2, むし: 2, はがね: 0.5 },
  ゴースト: { ノーマル: 0, エスパー: 2, ゴースト: 2, あく: 0.5 },
  ドラゴン: { ドラゴン: 2, はがね: 0.5, フェアリー: 0 },
  あく: { かくとう: 0.5, エスパー: 2, ゴースト: 2, あく: 0.5, フェアリー: 0.5 },
  はがね: { ほのお: 0.5, みず: 0.5, でんき: 0.5, こおり: 2, いわ: 2, はがね: 0.5, フェアリー: 2 },
  フェアリー: { ほのお: 0.5, かくとう: 2, どく: 0.5, ドラゴン: 2, あく: 2, はがね: 0.5 },
};

let POKEMON_DATA = [
  {
    name: "サーナイト",
    types: ["エスパー", "フェアリー"],
    base: { hp: 68, atk: 65, def: 65, spa: 125, spd: 115, spe: 80 },
    moves: [["ムーンフォース", 71, "フェアリー"], ["サイコキネシス", 49, "エスパー"], ["マジカルフレイム", 35, "ほのお"], ["アンコール", 32, "ノーマル"], ["トリック", 28, "エスパー"], ["こごえるかぜ", 24, "こおり"], ["シャドーボール", 21, "ゴースト"], ["みちづれ", 18, "ゴースト"], ["めいそう", 15, "エスパー"], ["いやしのねがい", 12, "エスパー"]],
    items: [["きあいのタスキ", 33], ["こだわりスカーフ", 28], ["こだわりメガネ", 15], ["いのちのたま", 9], ["オボンのみ", 6]],
    abilities: [["トレース", 58], ["シンクロ", 29], ["テレパシー", 13]],
  },
  {
    name: "カイリュー",
    types: ["ドラゴン", "ひこう"],
    base: { hp: 91, atk: 134, def: 95, spa: 100, spd: 100, spe: 80 },
    moves: [["しんそく", 82, "ノーマル"], ["じしん", 57, "じめん"], ["りゅうのまい", 48, "ドラゴン"], ["テラバースト", 31, "ノーマル"], ["アイススピナー", 27, "こおり"], ["ほのおのパンチ", 22, "ほのお"], ["アンコール", 18, "ノーマル"], ["はねやすめ", 16, "ひこう"], ["げきりん", 12, "ドラゴン"], ["かわらわり", 9, "かくとう"]],
    items: [["こだわりハチマキ", 32], ["あつぞこブーツ", 21], ["じゃくてんほけん", 14], ["ラムのみ", 11], ["いかさまダイス", 8]],
    abilities: [["マルチスケイル", 96], ["せいしんりょく", 4]],
  },
  {
    name: "ガブリアス",
    types: ["ドラゴン", "じめん"],
    base: { hp: 108, atk: 130, def: 95, spa: 80, spd: 85, spe: 102 },
    moves: [["じしん", 84, "じめん"], ["スケイルショット", 45, "ドラゴン"], ["ステルスロック", 39, "いわ"], ["つるぎのまい", 37, "ノーマル"], ["アイアンヘッド", 24, "はがね"], ["ドラゴンクロー", 21, "ドラゴン"], ["ほのおのキバ", 19, "ほのお"], ["ストーンエッジ", 13, "いわ"], ["がんせきふうじ", 10, "いわ"], ["テラバースト", 8, "ノーマル"]],
    items: [["いかさまダイス", 29], ["きあいのタスキ", 24], ["ゴツゴツメット", 18], ["こだわりスカーフ", 12], ["ラムのみ", 6]],
    abilities: [["さめはだ", 97], ["すながくれ", 3]],
  },
];

let CHAMPIONS_ROSTER_NAMES = ["サーナイト", "カイリュー", "ガブリアス"];
let POKEMON = POKEMON_DATA.filter((pokemon) => CHAMPIONS_ROSTER_NAMES.includes(pokemon.name));
let DEFAULT_PARTY = POKEMON.slice(0, 6).map((pokemon) => pokemon.name);
const PARTY_STORAGE_KEY = "pokechAssistParty";
const ENEMY_STORAGE_KEY = "pokechAssistEnemyParty";
const PARTY_SELECTED_STORAGE_KEY = "pokechAssistPartySelected";
const ENEMY_SELECTED_STORAGE_KEY = "pokechAssistEnemySelected";
const THEME_STORAGE_KEY = "pokechAssistThemeV2";
const CUSTOM_STORAGE_KEY = "pokechAssistCustomPokemon";
const PARTY_PRESETS_STORAGE_KEY = "pokechAssistPartyPresets";
const ALLY_PRESETS_STORAGE_KEY = "pokechAssistAllyPresets";
const ENEMY_PRESETS_STORAGE_KEY = "pokechAssistEnemyPresets";
let CUSTOM_POKEMON = loadCustomPokemon();

function emptyDetails() {
  return { moves: {}, items: {}, abilities: {} };
}

function loadCustomDetails() {
  try {
    const saved = JSON.parse(localStorage.getItem(DETAIL_STORAGE_KEY) ?? "null");
    return saved && typeof saved === "object" ? mergeDetailData(emptyDetails(), saved) : emptyDetails();
  } catch {
    return emptyDetails();
  }
}

function saveCustomDetails(details) {
  localStorage.setItem(DETAIL_STORAGE_KEY, JSON.stringify(details));
}

function mergeDetailData(base, overrides) {
  const merged = emptyDetails();
  Object.keys(merged).forEach((kind) => {
    merged[kind] = { ...(base?.[kind] ?? {}) };
    Object.entries(overrides?.[kind] ?? {}).forEach(([name, detail]) => {
      if (name && detail && typeof detail === "object") merged[kind][name] = { ...(merged[kind][name] ?? { name }), ...detail, name };
    });
  });
  return merged;
}

const state = {
  opponent: POKEMON[2],
  ally: POKEMON[0],
  party: loadParty(),
  enemyParty: loadTeam(ENEMY_STORAGE_KEY),
  selectedParty: loadSelectedTeam(PARTY_SELECTED_STORAGE_KEY),
  selectedEnemyParty: loadSelectedTeam(ENEMY_SELECTED_STORAGE_KEY),
  searchPokemon: POKEMON[0],
  searchTypes: [],
  searchMatchupFilters: [],
  searchSort: { key: "name", direction: "asc" },
};

async function loadExternalData() {
  try {
    if (window.POKECH_DATA && window.POKECH_CHAMPIONS) {
      applyLoadedData(window.POKECH_DATA, window.POKECH_CHAMPIONS);
    } else {
      const [pokemonData, championsData] = await Promise.all([
        fetch("./data/pokemon.json").then((response) => {
          if (!response.ok) throw new Error(`pokemon.json ${response.status}`);
          return response.json();
        }),
        fetch("./data/champions.json").then((response) => {
          if (!response.ok) throw new Error(`champions.json ${response.status}`);
          return response.json();
        }),
      ]);
      applyLoadedData(pokemonData, championsData);
    }
  } catch (error) {
    console.info("Using embedded seed data.", error);
  }
  refreshPokemonList();
  state.party = fillParty(normalizePartyNames(state.party));
  state.enemyParty = fillParty(normalizePartyNames(state.enemyParty));
  state.selectedParty = normalizeSelectedIndices(state.selectedParty);
  state.selectedEnemyParty = normalizeSelectedIndices(state.selectedEnemyParty);
  state.opponent = findPokemon(state.opponent.name) ?? POKEMON[0];
  state.ally = findPokemon(state.ally.name) ?? POKEMON[0];
}

function applyLoadedData(pokemonData, championsData) {
  if (Array.isArray(pokemonData.pokemon) && Array.isArray(championsData.names)) {
    const nextPokemon = pokemonData.pokemon.filter((pokemon) => championsData.names.includes(pokemon.name));
    if (!nextPokemon.length) throw new Error("No usable pokemon data.");

    POKEMON_DATA = pokemonData.pokemon;
    CHAMPIONS_ROSTER_NAMES = championsData.names;
  }
}

function loadCustomPokemon() {
  try {
    const saved = JSON.parse(localStorage.getItem(CUSTOM_STORAGE_KEY) ?? "[]");
    return Array.isArray(saved) ? saved.filter(isUsablePokemon) : [];
  } catch {
    return [];
  }
}

function saveCustomPokemon() {
  localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(CUSTOM_POKEMON));
}

function isUsablePokemon(pokemon) {
  return Boolean(
    pokemon?.name &&
      Array.isArray(pokemon.types) &&
      pokemon.types.length &&
      pokemon.base &&
      Object.keys(STAT_LABELS).every((key) => Number.isFinite(Number(pokemon.base[key]))),
  );
}

function refreshPokemonList() {
  const roster = POKEMON_DATA.filter((pokemon) => CHAMPIONS_ROSTER_NAMES.includes(pokemon.name));
  const rosterNames = new Set(roster.map((pokemon) => pokemon.name));
  const customPokemon = CUSTOM_POKEMON.filter((pokemon) => !rosterNames.has(pokemon.name) && !rosterNames.has(canonicalPokemonName(pokemon.name)));
  if (customPokemon.length !== CUSTOM_POKEMON.length) {
    CUSTOM_POKEMON = customPokemon;
    saveCustomPokemon();
  }
  POKEMON = [...roster, ...customPokemon].map(normalizePokemon);
  DEFAULT_PARTY = POKEMON.slice(0, 6).map((pokemon) => pokemon.name);
}

function normalizeType(type) {
  return TYPE_ALIASES[type] ?? type;
}

function normalizePokemon(pokemon) {
  return {
    ...pokemon,
    types: pokemon.types.map(normalizeType),
    moves: (pokemon.moves ?? []).map(([name, rate, type]) => [name, rate, type ? normalizeType(type) : type]),
    items: pokemon.items ?? [],
    abilities: pokemon.abilities ?? [],
  };
}

function canonicalPokemonName(input) {
  return NAME_CORRECTIONS[input.trim()] ?? input.trim();
}

function loadParty() {
  return loadTeam(PARTY_STORAGE_KEY);
}

function loadTeam(storageKey) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null");
    if (Array.isArray(saved)) {
      const names = saved.filter((name) => typeof name === "string" && name.trim());
      if (names.length) return fillParty(names);
    }
  } catch {
    return fillParty([]);
  }
  return fillParty([]);
}

function loadSelectedTeam(storageKey) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null");
    if (Array.isArray(saved)) return normalizeSelectedIndices(saved);
  } catch {
    return [0, 1, 2];
  }
  return [0, 1, 2];
}

function normalizeSelectedIndices(indices) {
  return [...new Set(indices.map(Number))]
    .filter((index) => Number.isInteger(index) && index >= 0 && index < 6)
    .slice(0, 3);
}

function fillParty(names) {
  return Array.from({ length: 6 }, (_, index) => names[index] ?? "");
}

function normalizePartyNames(names) {
  return names
    .map((name) => findPokemon(name))
    .filter(Boolean)
    .map((pokemon) => partyNameFor(pokemon));
}

function saveParty() {
  localStorage.setItem(PARTY_STORAGE_KEY, JSON.stringify(state.party));
}

function saveEnemyParty() {
  localStorage.setItem(ENEMY_STORAGE_KEY, JSON.stringify(state.enemyParty));
}

function saveSelectedParty() {
  localStorage.setItem(PARTY_SELECTED_STORAGE_KEY, JSON.stringify(state.selectedParty));
}

function saveSelectedEnemyParty() {
  localStorage.setItem(ENEMY_SELECTED_STORAGE_KEY, JSON.stringify(state.selectedEnemyParty));
}

function migrateCombinedPartyPresets() {
  const combined = loadPresetList(PARTY_PRESETS_STORAGE_KEY).filter(
    (preset) => Array.isArray(preset.party) || Array.isArray(preset.enemyParty),
  );
  if (!combined.length || localStorage.getItem("pokechAssistPresetMigrationV2")) return;

  const allyPresets = loadPresetList(ALLY_PRESETS_STORAGE_KEY);
  const enemyPresets = loadPresetList(ENEMY_PRESETS_STORAGE_KEY);
  combined.forEach((preset) => {
    if (Array.isArray(preset.party) && !allyPresets.some((item) => item.name === preset.name)) {
      allyPresets.push({ name: preset.name, savedAt: preset.savedAt, names: preset.party, selected: preset.selectedParty ?? [] });
    }
    if (Array.isArray(preset.enemyParty) && !enemyPresets.some((item) => item.name === preset.name)) {
      enemyPresets.push({ name: preset.name, savedAt: preset.savedAt, names: preset.enemyParty, selected: preset.selectedEnemyParty ?? [] });
    }
  });
  savePresetList(ALLY_PRESETS_STORAGE_KEY, allyPresets.slice(0, 20));
  savePresetList(ENEMY_PRESETS_STORAGE_KEY, enemyPresets.slice(0, 20));
  localStorage.setItem("pokechAssistPresetMigrationV2", "done");
}

function loadPresetList(storageKey) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
    return Array.isArray(saved)
      ? saved.filter((preset) => preset?.name && (Array.isArray(preset.names) || Array.isArray(preset.party) || Array.isArray(preset.enemyParty)))
      : [];
  } catch {
    return [];
  }
}

function savePresetList(storageKey, presets) {
  localStorage.setItem(storageKey, JSON.stringify(presets));
}

function currentTeamPreset(name, teamKey, selectedKey) {
  return {
    name,
    savedAt: new Date().toISOString(),
    names: [...state[teamKey]],
    selected: [...state[selectedKey]],
  };
}

function renderPresetSelect(config) {
  const select = document.querySelector(config.select);
  const presets = loadPresetList(config.storageKey);
  select.innerHTML = presets.length
    ? presets.map((preset) => `<option value="${escapeHtml(preset.name)}">${escapeHtml(preset.name)}</option>`).join("")
    : `<option value="">保存データなし</option>`;
  document.querySelector(config.loadButton).disabled = !presets.length;
  document.querySelector(config.deleteButton).disabled = !presets.length;
}

function setupPresetControls(config) {
  document.querySelector(config.saveButton).addEventListener("click", () => {
    const defaultName = `${config.label} ${new Date().toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}`;
    const name = window.prompt("保存名を入力してください", defaultName)?.trim();
    if (!name) return;
    const presets = loadPresetList(config.storageKey).filter((preset) => preset.name !== name);
    savePresetList(config.storageKey, [currentTeamPreset(name, config.teamKey, config.selectedKey), ...presets].slice(0, 20));
    renderPresetSelect(config);
    document.querySelector(config.select).value = name;
  });

  document.querySelector(config.loadButton).addEventListener("click", () => {
    const name = document.querySelector(config.select).value;
    const preset = loadPresetList(config.storageKey).find((item) => item.name === name);
    if (!preset) return;
    state[config.teamKey] = fillParty(normalizePartyNames(preset.names ?? preset[config.legacyTeamKey] ?? []));
    state[config.selectedKey] = normalizeSelectedIndices(preset.selected ?? preset[config.legacySelectedKey] ?? []);
    config.saveTeam();
    config.saveSelected();
    state[config.currentKey] = findPokemon(state[config.teamKey][0]) ?? state[config.currentKey];
    renderEnemySlots();
    renderPartySlots();
    syncOpponentSelect();
    syncAllySelect();
    render();
  });

  document.querySelector(config.deleteButton).addEventListener("click", () => {
    const name = document.querySelector(config.select).value;
    if (!name) return;
    savePresetList(config.storageKey, loadPresetList(config.storageKey).filter((preset) => preset.name !== name));
    renderPresetSelect(config);
  });

  renderPresetSelect(config);
}

function setupPartyPresets() {
  migrateCombinedPartyPresets();
  setupPresetControls({
    label: "相手",
    storageKey: ENEMY_PRESETS_STORAGE_KEY,
    select: "#enemyPresetSelect",
    saveButton: "#saveEnemyPreset",
    loadButton: "#loadEnemyPreset",
    deleteButton: "#deleteEnemyPreset",
    teamKey: "enemyParty",
    selectedKey: "selectedEnemyParty",
    currentKey: "opponent",
    legacyTeamKey: "enemyParty",
    legacySelectedKey: "selectedEnemyParty",
    saveTeam: saveEnemyParty,
    saveSelected: saveSelectedEnemyParty,
  });
  setupPresetControls({
    label: "味方",
    storageKey: ALLY_PRESETS_STORAGE_KEY,
    select: "#allyPresetSelect",
    saveButton: "#saveAllyPreset",
    loadButton: "#loadAllyPreset",
    deleteButton: "#deleteAllyPreset",
    teamKey: "party",
    selectedKey: "selectedParty",
    currentKey: "ally",
    legacyTeamKey: "party",
    legacySelectedKey: "selectedParty",
    saveTeam: saveParty,
    saveSelected: saveSelectedParty,
  });
}

function resetParties() {
  state.party = fillParty([]);
  state.enemyParty = fillParty([]);
  state.selectedParty = [];
  state.selectedEnemyParty = [];
  saveParty();
  saveEnemyParty();
  saveSelectedParty();
  saveSelectedEnemyParty();
  renderEnemySlots();
  renderPartySlots();
  syncOpponentSelect();
  syncAllySelect();
  render();
}

function applyTheme(theme) {
  const nextTheme = theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = nextTheme;
  localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  document.querySelector("#themeToggle").textContent = nextTheme === "light" ? "Light" : "Dark";
}

function setupTheme() {
  const saved = localStorage.getItem(THEME_STORAGE_KEY) ?? "light";
  applyTheme(saved);
  document.querySelector("#themeToggle").addEventListener("click", () => {
    const current = document.documentElement.dataset.theme === "light" ? "light" : "dark";
    applyTheme(current === "light" ? "dark" : "light");
  });
}

function stat(base, ev, nature, isHp = false) {
  const iv = 31;
  const level = 50;
  if (isHp) {
    return Math.floor(((base * 2 + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
  }
  const raw = Math.floor(((base * 2 + iv + Math.floor(ev / 4)) * level) / 100) + 5;
  return Math.floor(raw * nature);
}

function statLines(pokemon, key) {
  const base = pokemon.base[key];
  const isHp = key === "hp";
  const ev32 = stat(base, 252, 1, isHp);
  const neutral = stat(base, 0, 1, isHp);
  return {
    boost: isHp ? ev32 : stat(base, 252, 1.1, isHp),
    ev32,
    neutral,
    down: isHp ? neutral : Math.floor(neutral * 0.9),
  };
}

function speedLines(pokemon) {
  const base = pokemon.base.spe;
  const neutral32 = stat(base, 252, 1);
  const neutral0 = stat(base, 0, 1);
  const boosted32 = stat(base, 252, 1.1);
  return {
    下降: Math.floor(neutral0 * 0.9),
    無振り: neutral0,
    "32振り": neutral32,
    特化: boosted32,
    最速S: scarfSpeed(boosted32),
  };
}

function scarfSpeed(value) {
  return Math.floor(value * 1.5);
}

function multiplier(attackType, defenderTypes) {
  return defenderTypes.reduce((total, defendType) => total * (TYPE_CHART[attackType]?.[defendType] ?? 1), 1);
}

function matchupBuckets(defenderTypes) {
  const buckets = { weak: [], resist: [], immune: [] };
  TYPE_ORDER.forEach((type) => {
    const value = multiplier(type, defenderTypes);
    if (value >= 2) buckets.weak.push([type, value]);
    if (value > 0 && value < 1) buckets.resist.push([type, value]);
    if (value === 0) buckets.immune.push([type, value]);
  });
  buckets.weak.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ja"));
  buckets.resist.sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0], "ja"));
  return buckets;
}

function typeBadge(type) {
  return `<span class="type" style="background:${TYPE_COLORS[type]}">${escapeHtml(type)}</span>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderTypes(target, types) {
  target.innerHTML = types.map(typeBadge).join("");
}

function basePokemonFor(pokemon) {
  if (!pokemon?.isMega) return pokemon;
  return [...POKEMON]
    .filter((candidate) => candidate.name !== pokemon.name && pokemon.name.startsWith(`メガ${candidate.name}`))
    .sort((a, b) => b.name.length - a.name.length)[0] ?? pokemon;
}

function formBaseName(name) {
  return name.replace(/\(.+\)$/, "");
}

function formGroupNameFor(name) {
  const base = formBaseName(name);
  const members = POKEMON.filter((candidate) => !candidate.isMega && (candidate.name === base || candidate.name.startsWith(`${base}(`)));
  return FORM_TAB_GROUPS.has(base) && members.length > 1 ? base : name;
}

function partyNameFor(pokemon) {
  return formGroupNameFor(basePokemonFor(pokemon).name);
}

function variantsFor(pokemon) {
  const groupName = partyNameFor(pokemon);
  return POKEMON.filter((candidate) => partyNameFor(candidate) === groupName).sort((a, b) => Number(a.isMega) - Number(b.isMega) || a.name.localeCompare(b.name, "ja"));
}

function shortVariantName(pokemon, groupName) {
  if (pokemon.name === groupName) return "通常";
  if (pokemon.name.startsWith(`${groupName}(`)) return pokemon.name.replace(groupName, "").replace(/[()]/g, "");
  if (pokemon.name.startsWith(`メガ${groupName}`)) {
    const suffix = pokemon.name.replace(`メガ${groupName}`, "");
    return suffix ? `メガ${suffix}` : "メガ";
  }
  return pokemon.name;
}

function renderMegaSwitch(target, current, stateKey) {
  renderVariantSwitch(target, current, (next) => {
    state[stateKey] = next;
    render();
  });
}

function renderVariantSwitch(target, current, onSelect) {
  const variants = variantsFor(current);
  if (variants.length <= 1) {
    target.innerHTML = "";
    return;
  }

  const groupName = partyNameFor(current);
  target.innerHTML = variants
    .map((pokemon) => `<button type="button" class="${pokemon.name === current.name ? "active" : ""}" data-variant-name="${escapeHtml(pokemon.name)}">${escapeHtml(shortVariantName(pokemon, groupName))}</button>`)
    .join("");

  target.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", (event) => {
      const next = findPokemon(event.currentTarget.dataset.variantName);
      if (next) onSelect(next);
    });
  });
}

function statsRows(pokemon) {
  return Object.keys(STAT_LABELS)
    .map((key) => {
      const lines = statLines(pokemon, key);
      return `<tr>
        <td>${STAT_LABELS[key]}</td>
        <td>${key === "hp" ? "-" : lines.boost}</td>
        <td>${lines.ev32}</td>
        <td>${statBarCell(lines.neutral, statMaxValue(key))}</td>
        <td>${key === "hp" ? "-" : lines.down}</td>
      </tr>`;
    })
    .join("");
}

function statMaxValue(key) {
  return Math.max(...POKEMON.map((pokemon) => statLines(pokemon, key).neutral), 1);
}

function statBarCell(value, max) {
  const width = Math.max(2, Math.min(100, (value / max) * 100));
  return `<span class="stat-bar-cell">
    <span class="stat-bar" style="width:${width}%"></span>
    <strong>${value}</strong>
  </span>`;
}

function renderStats() {
  document.querySelector("#opponentStats").innerHTML = statsRows(state.opponent);
  document.querySelector("#allyStats").innerHTML = statsRows(state.ally);
}

function speedPosition(value, scale) {
  return Math.max(0, Math.min(100, ((value - scale.min) / (scale.max - scale.min)) * 100));
}

function speedPoint(label, value, scale, tone) {
  const left = speedPosition(value, scale);
  const fastest = label === "最速S" ? " fastest" : "";
  return `<span class="speed-point ${tone}${fastest}" style="left:${left}%" title="${label}: ${value}">
    <b>${label}</b><em>${value}</em>
  </span>`;
}

function speedLane(title, lines, scale, tone) {
  const values = Object.values(lines);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const normalLeft = speedPosition(min, scale);
  const normalWidth = ((max - min) / (scale.max - scale.min)) * 100;

  return `<div class="speed-lane">
    <div class="lane-title">${title}</div>
    <div class="lane-track">
      <span class="range normal" style="left:${normalLeft}%;width:${normalWidth}%"></span>
      ${Object.entries(lines).map(([label, value]) => speedPoint(label, value, scale, tone)).join("")}
    </div>
  </div>`;
}

function renderSpeedScale(target, scale) {
  const ticks = Array.from({ length: 5 }, (_, index) => Math.round(scale.min + ((scale.max - scale.min) * index) / 4));
  target.innerHTML = ticks.map((tick) => `<span>${tick}</span>`).join("");
}

function renderSpeedGraph(target, lanes) {
  const allValues = lanes.flatMap((lane) => Object.values(lane.lines));
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const scale = {
    min: Math.max(0, Math.floor((minValue - 10) / 10) * 10),
    max: Math.ceil((maxValue + 10) / 10) * 10,
  };
  renderSpeedScale(document.querySelector("#speedScale"), scale);
  target.innerHTML = lanes.map((lane) => speedLane(lane.title, lane.lines, scale, lane.tone)).join("");
}

function renderSpeed() {
  const ally = speedLines(state.ally);
  const opponent = speedLines(state.opponent);

  renderSpeedGraph(document.querySelector("#speedCompare"), [
    { title: `相手 ${state.opponent.name}`, lines: opponent, tone: "opponent" },
    { title: `味方 ${state.ally.name}`, lines: ally, tone: "ally" },
  ]);

  renderSpeedLineTable(document.querySelector("#opponentSpeedLines"), opponent);
  renderSpeedLineTable(document.querySelector("#allySpeedLines"), ally);
}

function renderSpeedLineTable(target, lines) {
  target.innerHTML = Object.entries(lines)
    .map(([label, value]) => `<div class="speed-line"><span>${label}</span><strong>${value}</strong></div>`)
    .join("");
}

function renderPartyTypeScores() {
  document.querySelector("#enemyTypeGrid").innerHTML = typeMatchupGrid(uniquePokemonFromNames(state.enemyParty));
  document.querySelector("#allyTypeGrid").innerHTML = typeMatchupGrid(uniquePokemonFromNames(state.party));
  renderSelectedTeam(
    document.querySelector("#enemySelectedList"),
    document.querySelector("#enemySelectedTypeGrid"),
    state.enemyParty,
    state.selectedEnemyParty,
  );
  renderSelectedTeam(
    document.querySelector("#allySelectedList"),
    document.querySelector("#allySelectedTypeGrid"),
    state.party,
    state.selectedParty,
  );
}

function partyTypeRows(pokemonList) {
  return TYPE_ORDER.map((type) => {
      const values = pokemonList.map((pokemon) => multiplier(type, pokemon.types));
      const totalValues = values.map((value) => (value === 0 ? 0.25 : value));
      return {
        type,
        total: totalValues.reduce((product, value) => product * value, pokemonList.length ? 1 : 0),
        expression: values.length ? values.map((value) => (value === 0 ? "0→0.25" : value)).join("×") : "",
        x4: values.filter((value) => value === 4).length,
        x2: values.filter((value) => value === 2).length,
        x05: values.filter((value) => value === 0.5 || value === 0.25).length,
        x0: values.filter((value) => value === 0).length,
      };
    });
}

function heatCell(value, max, tone) {
  const level = value ? Math.max(0.22, value / max) : 0;
  const color = tone === "weak" ? "var(--danger)" : tone === "resist" ? "var(--good)" : "var(--accent)";
  const percent = Math.round(level * 72);
  const style = value ? ` style="--heat-bg:color-mix(in srgb, ${color} ${percent}%, var(--panel))"` : "";
  return `<span class="heat-cell ${tone}"${style}>${value || ""}</span>`;
}

function totalCell(row, maxTotal) {
  const tone = row.total === 0 ? "immune" : row.total > 1 ? "weak" : row.total < 1 ? "resist" : "neutral";
  const width = maxTotal ? Math.max(3, Math.min(100, (row.total / maxTotal) * 100)) : 0;
  return `<span class="total-bar-cell ${tone}" title="${escapeHtml(row.expression)}">
    <span class="total-bar" style="width:${width}%"></span>
    <strong>${formatTotal(row.total)}</strong>
  </span>`;
}

function formatTotal(value) {
  if (value === 0) return "0";
  if (value >= 1) return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
  return value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

function typeMatchupGrid(pokemonList) {
  const rows = partyTypeRows(pokemonList);
  const max = Math.max(...rows.flatMap((row) => [row.x4, row.x2, row.x05, row.x0]), 1);
  const maxTotal = Math.max(...rows.map((row) => row.total), 1);
  return `<div class="type-grid-row type-grid-head">
      <span>タイプ</span><span>×4</span><span>×2</span><span>×0.5</span><span>×0</span><span>合計</span>
    </div>
    ${rows
      .map(
        (row) => `<div class="type-grid-row ${row.x4 + row.x2 + row.x05 + row.x0 ? "" : "empty"}">
          ${typeBadge(row.type)}
          ${heatCell(row.x4, max, "weak")}
          ${heatCell(row.x2, max, "weak")}
          ${heatCell(row.x05, max, "resist")}
          ${heatCell(row.x0, max, "immune")}
          ${totalCell(row, maxTotal)}
        </div>`,
      )
      .join("")}`;
}

function selectedPokemonFromTeam(names, selectedIndices) {
  return selectedIndices.map((index) => findPokemon(names[index])).filter(Boolean);
}

function renderSelectedTeam(listTarget, gridTarget, names, selectedIndices) {
  const selected = selectedPokemonFromTeam(names, selectedIndices);
  listTarget.innerHTML = selected.length
    ? selected.map((pokemon) => `<span class="selected-chip">${escapeHtml(pokemon.name)}${pokemon.types.map(typeBadge).join("")}</span>`).join("")
    : `<span class="note">未選出</span>`;
  gridTarget.innerHTML = typeMatchupGrid(selected);
}

function renderTeamSlots(target, names, datasetKey, selectedIndices, onToggle, onChange) {
  target.innerHTML = names
    .map(
      (name, index) => `<div class="party-slot">
        <button class="slot-number ${selectedIndices.includes(index) ? "active" : ""}" type="button" data-${datasetKey}-select-index="${index}" aria-pressed="${selectedIndices.includes(index)}">${index + 1}</button>
        <input data-${datasetKey}-index="${index}" list="pokemonList" value="${escapeHtml(name)}" autocomplete="off" />
      </div>`,
    )
    .join("");

  target.querySelectorAll(".slot-number").forEach((button) => {
    button.addEventListener("click", (event) => {
      const index = Number(event.currentTarget.dataset[`${datasetKey}SelectIndex`]);
      onToggle(index);
    });
  });

  target.querySelectorAll("input").forEach((input) => {
    input.addEventListener("change", (event) => {
      const index = Number(event.target.dataset[`${datasetKey}Index`]);
      if (!event.target.value.trim()) {
        event.target.value = "";
        onChange(index, "");
        return;
      }
      const pokemon = ensurePokemon(event.target.value);
      const partyName = partyNameFor(pokemon);
      event.target.value = partyName;
      onChange(index, partyName);
    });
  });
}

function partyCandidatePokemon() {
  const names = new Set();
  return POKEMON.filter((pokemon) => !pokemon.isMega).filter((pokemon) => {
    const name = partyNameFor(pokemon);
    if (names.has(name)) return false;
    names.add(name);
    return true;
  });
}

function renderPartySlots() {
  renderTeamSlots(
    document.querySelector("#partySlots"),
    state.party,
    "party",
    state.selectedParty,
    (index) => {
      state.selectedParty = toggleSelectedIndex(state.selectedParty, index);
      saveSelectedParty();
      renderPartySlots();
      renderPartyTypeScores();
    },
    (index, value) => {
      state.party[index] = value;
      saveParty();
      syncAllySelect();
      if (!state.party.includes(partyNameFor(state.ally))) {
        state.ally = findPokemon(state.party[0]) ?? state.ally;
      }
      render();
    },
  );
}

function renderEnemySlots() {
  renderTeamSlots(
    document.querySelector("#enemySlots"),
    state.enemyParty,
    "enemy",
    state.selectedEnemyParty,
    (index) => {
      state.selectedEnemyParty = toggleSelectedIndex(state.selectedEnemyParty, index);
      saveSelectedEnemyParty();
      renderEnemySlots();
      renderPartyTypeScores();
    },
    (index, value) => {
      state.enemyParty[index] = value;
      saveEnemyParty();
      syncOpponentSelect();
      if (!state.enemyParty.includes(partyNameFor(state.opponent))) {
        state.opponent = findPokemon(state.enemyParty[0]) ?? state.opponent;
      }
      render();
    },
  );
}

function toggleSelectedIndex(indices, index) {
  if (indices.includes(index)) return indices.filter((value) => value !== index);
  if (indices.length >= 3) return indices;
  return [...indices, index].sort((a, b) => a - b);
}

function uniquePokemonFromNames(names) {
  return [...new Set(names.filter(Boolean))].map(findPokemon).filter(Boolean);
}

function syncAllySelect() {
  const allySelect = document.querySelector("#allySelect");
  const uniqueNames = [...new Set(state.party.filter(Boolean))];
  const uniqueParty = uniqueNames.map(findPokemon).filter(Boolean);
  allySelect.innerHTML = uniqueNames.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
  const selectedName = partyNameFor(state.ally);
  if (!uniqueNames.includes(selectedName)) {
    state.ally = uniqueParty[0] ?? state.ally;
  }
  allySelect.value = partyNameFor(state.ally);
}

function syncOpponentSelect() {
  const opponentSelect = document.querySelector("#opponentSelect");
  const uniqueNames = [...new Set(state.enemyParty.filter(Boolean))];
  const uniqueParty = uniqueNames.map(findPokemon).filter(Boolean);
  opponentSelect.innerHTML = uniqueNames.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
  const selectedName = partyNameFor(state.opponent);
  if (!uniqueNames.includes(selectedName)) {
    state.opponent = uniqueParty[0] ?? state.opponent;
  }
  opponentSelect.value = partyNameFor(state.opponent);
}

function chip([type, value]) {
  return `<span class="chip">${typeBadge(type)}</span>`;
}

function renderMatchups() {
  const opponent = matchupBuckets(state.opponent.types);
  const ally = matchupBuckets(state.ally.types);
  document.querySelector("#opponentWeakness").innerHTML = groupedMatchups([...opponent.weak, ...opponent.resist, ...opponent.immune]);
  document.querySelector("#allyWeakness").innerHTML = groupedMatchups([...ally.weak, ...ally.resist, ...ally.immune]);
}

function groupedMatchups(list) {
  const order = [4, 2, 0.5, 0.25, 0];
  const groups = order
    .map((rate) => [rate, list.filter(([, value]) => value === rate)])
    .filter(([, items]) => items.length);
  if (!groups.length) return `<span class="note">なし</span>`;
  return groups
    .map(([rate, items]) => `<div class="matchup-group"><span class="rate-label">x${rate}</span>${items.map(chip).join("")}</div>`)
    .join("");
}

function rankRows(list, category, withType = false) {
  if (!list.length) {
    return `<li class="empty-row"><strong>未登録</strong></li>`;
  }

  return list
    .map(([name, rate, type], index) => `<li class="${withType ? "move-row" : ""}">
      <span class="rank">${index + 1}</span>
      ${withType && type ? typeBadge(type) : ""}
      <button class="detail-trigger" type="button" data-detail-kind="${escapeHtml(category)}" data-detail-name="${escapeHtml(name)}" ${type ? `data-detail-type="${escapeHtml(type)}"` : ""} data-detail-rate="${escapeHtml(rate)}">${escapeHtml(name)}</button>
      <span class="usage-bar"><span style="width:${rate}%"></span></span>
      <span class="rate">${rate}%</span>
    </li>`)
    .join("");
}

function detailFor(kind, name, fallbackType) {
  const detail = DETAIL_DATA[kind]?.[name] ?? { name };
  return kind === "moves" && fallbackType && !detail.type ? { ...detail, type: fallbackType } : detail;
}

function detailMetaRows(kind, detail, rate) {
  const rows = [];
  if (kind === "moves" && detail.type) rows.push(["タイプ", typeBadge(detail.type)]);
  if (detail.category) rows.push(["分類", escapeHtml(detail.category)]);
  if (Object.prototype.hasOwnProperty.call(detail, "power")) rows.push(["威力", detail.power ?? "-"]);
  if (Object.prototype.hasOwnProperty.call(detail, "accuracy")) rows.push(["命中", detail.accuracy ?? "-"]);
  if (Object.prototype.hasOwnProperty.call(detail, "pp")) rows.push(["PP", detail.pp]);
  if (Object.prototype.hasOwnProperty.call(detail, "priority")) rows.push(["優先度", detail.priority]);
  if (rate) rows.push(["使用率", `${escapeHtml(rate)}%`]);
  return rows;
}

function detailPopoverHtml(kind, name, fallbackType, rate) {
  const detail = detailFor(kind, name, fallbackType);
  const rows = detailMetaRows(kind, detail, rate);
  const description = detail.description ?? detail.effect ?? "";
  return `<div class="detail-popover-card">
    <div class="detail-popover-head">
      <span>${escapeHtml(DETAIL_LABELS[kind] ?? "詳細")}</span>
      <button type="button" data-detail-close aria-label="閉じる">×</button>
    </div>
    <h3>${escapeHtml(name)}</h3>
    ${rows.length ? `<dl>${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${value}</dd></div>`).join("")}</dl>` : ""}
    <p>${description ? escapeHtml(description) : "詳細データは未登録です。名称と使用率のみ確認できます。"}</p>
    <button class="detail-edit-button" type="button" data-detail-edit-kind="${escapeHtml(kind)}" data-detail-edit-name="${escapeHtml(name)}">詳細を編集</button>
  </div>`;
}

function hideDetailPopover() {
  const popover = document.querySelector("#detailPopover");
  popover.hidden = true;
  popover.innerHTML = "";
}

function showDetailPopover(button) {
  const popover = document.querySelector("#detailPopover");
  const rect = button.getBoundingClientRect();
  popover.innerHTML = detailPopoverHtml(button.dataset.detailKind, button.dataset.detailName, button.dataset.detailType, button.dataset.detailRate);
  popover.hidden = false;
  const width = Math.min(360, window.innerWidth - 24);
  const left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12);
  const top = rect.bottom + 8 > window.innerHeight - 220 ? rect.top - 12 : rect.bottom + 8;
  popover.style.width = `${width}px`;
  popover.style.left = `${left}px`;
  popover.style.top = `${Math.max(12, top)}px`;
  popover.querySelector("[data-detail-close]").addEventListener("click", hideDetailPopover);
  popover.querySelector("[data-detail-edit-kind]").addEventListener("click", (event) => {
    openDetailEditor(event.currentTarget.dataset.detailEditKind, event.currentTarget.dataset.detailEditName);
    hideDetailPopover();
  });
}

function setupDetailPopover() {
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-detail-kind]");
    const popover = document.querySelector("#detailPopover");
    if (trigger) {
      event.preventDefault();
      event.stopPropagation();
      showDetailPopover(trigger);
      return;
    }
    if (!popover.hidden && !event.target.closest("#detailPopover")) hideDetailPopover();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hideDetailPopover();
  });
  window.addEventListener("resize", hideDetailPopover);
  window.addEventListener("scroll", hideDetailPopover, true);
}

function cleanNumberInput(value) {
  if (value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function detailInputValue(id) {
  return document.querySelector(id).value.trim();
}

function toggleMoveDetailFields() {
  const isMove = document.querySelector("#detailKindInput").value === "moves";
  document.querySelectorAll(".move-detail-field").forEach((field) => {
    field.hidden = !isMove;
  });
}

function openDetailEditor(kind = "moves", name = "") {
  const editor = document.querySelector("#detailEditor");
  const safeKind = DETAIL_LABELS[kind] ? kind : "moves";
  const detail = detailFor(safeKind, name);
  document.querySelector("#detailKindInput").value = safeKind;
  document.querySelector("#detailNameInput").value = name;
  document.querySelector("#detailTypeInput").value = detail.type ?? "";
  document.querySelector("#detailCategoryInput").value = detail.category ?? "";
  document.querySelector("#detailPowerInput").value = detail.power ?? "";
  document.querySelector("#detailAccuracyInput").value = detail.accuracy ?? "";
  document.querySelector("#detailPpInput").value = detail.pp ?? "";
  document.querySelector("#detailPriorityInput").value = detail.priority ?? "";
  document.querySelector("#detailDescriptionInput").value = detail.description ?? detail.effect ?? "";
  toggleMoveDetailFields();
  editor.showModal();
}

function customDetailsWith(kind, name, detail) {
  const custom = loadCustomDetails();
  custom[kind][name] = detail;
  return custom;
}

function saveDetailEditor() {
  const kind = document.querySelector("#detailKindInput").value;
  const name = detailInputValue("#detailNameInput");
  if (!name) return;
  const detail = { name };
  if (kind === "moves") {
    const type = detailInputValue("#detailTypeInput");
    const category = detailInputValue("#detailCategoryInput");
    const power = cleanNumberInput(document.querySelector("#detailPowerInput").value);
    const accuracy = cleanNumberInput(document.querySelector("#detailAccuracyInput").value);
    const pp = cleanNumberInput(document.querySelector("#detailPpInput").value);
    const priority = cleanNumberInput(document.querySelector("#detailPriorityInput").value);
    if (type) detail.type = type;
    if (category) detail.category = category;
    if (power !== undefined) detail.power = power;
    if (accuracy !== undefined) detail.accuracy = accuracy;
    if (pp !== undefined) detail.pp = pp;
    if (priority !== undefined) detail.priority = priority;
  }
  const description = detailInputValue("#detailDescriptionInput");
  if (description) detail.description = description;
  const custom = customDetailsWith(kind, name, detail);
  saveCustomDetails(custom);
  DETAIL_DATA = mergeDetailData(window.POKECH_DETAILS ?? emptyDetails(), custom);
  document.querySelector("#detailEditor").close();
  render();
  renderSearch();
}

function deleteDetailEditorData() {
  const kind = document.querySelector("#detailKindInput").value;
  const name = detailInputValue("#detailNameInput");
  if (!name) return;
  const custom = loadCustomDetails();
  delete custom[kind][name];
  saveCustomDetails(custom);
  DETAIL_DATA = mergeDetailData(window.POKECH_DETAILS ?? emptyDetails(), custom);
  document.querySelector("#detailEditor").close();
  render();
  renderSearch();
}

function setupDetailEditor() {
  document.querySelector("#openDetailEditor").addEventListener("click", () => openDetailEditor());
  document.querySelector("[data-detail-editor-close]").addEventListener("click", () => document.querySelector("#detailEditor").close());
  document.querySelector("#detailKindInput").addEventListener("change", toggleMoveDetailFields);
  document.querySelector("#deleteDetailData").addEventListener("click", deleteDetailEditorData);
  document.querySelector("#detailEditorForm").addEventListener("submit", (event) => {
    event.preventDefault();
    saveDetailEditor();
  });
}

function renderUsage() {
  document.querySelector("#moveList").innerHTML = rankRows(state.opponent.moves, "moves", true);
  document.querySelector("#itemList").innerHTML = rankRows(state.opponent.items, "items");
  document.querySelector("#abilityList").innerHTML = rankRows(state.opponent.abilities, "abilities");
}

function matchupMark(value) {
  if (value === 2) return "○";
  if (value === 0.5) return "△";
  if (value === 0) return "×";
  return "";
}

function renderTypeChartTable() {
  const target = document.querySelector("#typeChartTable");
  target.innerHTML = `<div class="type-chart-grid">
    <div class="type-chart-corner"></div>
    ${TYPE_ORDER.map((type) => `<div class="type-chart-head">${typeBadge(type)}</div>`).join("")}
    ${TYPE_ORDER.map((attackType) => `
      <div class="type-chart-row-head">${typeBadge(attackType)}</div>
      ${TYPE_ORDER.map((defenseType) => {
        const value = multiplier(attackType, [defenseType]);
        return `<div class="type-chart-cell ${value !== 1 ? "active" : ""}" title="${escapeHtml(attackType)} → ${escapeHtml(defenseType)}: x${value}">${matchupMark(value)}</div>`;
      }).join("")}
    `).join("")}
  </div>`;
}

function setupTabs() {
  document.querySelectorAll(".app-tabs button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".app-tabs button").forEach((item) => item.classList.toggle("active", item === button));
      document.querySelectorAll(".tab-view").forEach((view) => view.classList.toggle("active", view.id === button.dataset.tabTarget));
    });
  });
}

function searchCandidates() {
  const names = new Set();
  return POKEMON.filter((pokemon) => !pokemon.isMega).filter((pokemon) => {
    const name = partyNameFor(pokemon);
    if (names.has(name)) return false;
    names.add(name);
    return true;
  });
}

function setupSearchFilters() {
  document.querySelector("#searchTypeFilters").innerHTML = TYPE_ORDER.map((type) => `<button type="button" data-type="${escapeHtml(type)}">${typeBadge(type)}</button>`).join("");
  document.querySelectorAll("#searchTypeFilters button").forEach((button) => {
    button.addEventListener("click", (event) => {
      const type = event.currentTarget.dataset.type;
      state.searchTypes = state.searchTypes.includes(type)
        ? state.searchTypes.filter((item) => item !== type)
        : [...state.searchTypes, type];
      renderSearch();
    });
  });

  ["#pokemonSearchInput", "#moveSearchInput", "#abilitySearchInput", "#searchTypeOr"].forEach((selector) => {
    document.querySelector(selector).addEventListener("input", renderSearch);
  });

  document.querySelector("#addMatchupFilter").addEventListener("click", () => {
    state.searchMatchupFilters = [...state.searchMatchupFilters, { attackType: "ほのお", rate: 2 }];
    renderSearch();
  });
}

function searchText(selector) {
  return document.querySelector(selector).value.trim();
}

function setSearchText(selector, value) {
  document.querySelector(selector).value = value;
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "ja"));
}

function updateSearchDatalists() {
  const searchNames = uniqueSorted(searchCandidates().map((pokemon) => partyNameFor(pokemon)));
  const moveNames = uniqueSorted(POKEMON.flatMap((pokemon) => (pokemon.moves ?? []).map(([name]) => name)));
  const abilityNames = uniqueSorted(POKEMON.flatMap((pokemon) => (pokemon.abilities ?? []).map(([name]) => name)));
  document.querySelector("#searchPokemonCandidates").innerHTML = searchNames.map((name) => `<option value="${escapeHtml(name)}"></option>`).join("");
  document.querySelector("#searchMoveCandidates").innerHTML = moveNames.map((name) => `<option value="${escapeHtml(name)}"></option>`).join("");
  document.querySelector("#searchAbilityCandidates").innerHTML = abilityNames.map((name) => `<option value="${escapeHtml(name)}"></option>`).join("");
}

function filteredSearchResults() {
  const nameQuery = searchText("#pokemonSearchInput");
  const moveQuery = searchText("#moveSearchInput");
  const abilityQuery = searchText("#abilitySearchInput");
  const isTypeOr = document.querySelector("#searchTypeOr").checked;
  return searchCandidates().filter((pokemon) => {
    const variants = variantsFor(pokemon);
    const typeMatched = !state.searchTypes.length || variants.some((variant) =>
      isTypeOr
        ? state.searchTypes.some((type) => variant.types.includes(type))
        : state.searchTypes.every((type) => variant.types.includes(type)),
    );
    const nameMatched = !nameQuery || partyNameFor(pokemon).includes(nameQuery) || pokemon.name.includes(nameQuery);
    const moveMatched = !moveQuery || variants.some((variant) => variant.moves.some(([name]) => name.includes(moveQuery)));
    const abilityMatched = !abilityQuery || variants.some((variant) => variant.abilities.some(([name]) => name.includes(abilityQuery)));
    const matchupMatched = state.searchMatchupFilters.every((filter) =>
      variants.some((variant) => multiplier(filter.attackType, variant.types) === Number(filter.rate)),
    );
    return typeMatched && matchupMatched && nameMatched && moveMatched && abilityMatched;
  });
}

function sortedSearchResults() {
  const { key, direction } = state.searchSort;
  const sign = direction === "asc" ? 1 : -1;
  return filteredSearchResults().sort((a, b) => {
    if (key === "singleRank") return (rankSortValue(a) - rankSortValue(b)) * sign;
    if (Object.prototype.hasOwnProperty.call(STAT_LABELS, key)) return (a.base[key] - b.base[key]) * sign;
    if (key.startsWith("matchup:")) {
      const rate = Number(key.replace("matchup:", ""));
      return (matchupCount(a, rate) - matchupCount(b, rate)) * sign;
    }
    if (key === "type1") return ((a.types[0] ?? "").localeCompare(b.types[0] ?? "", "ja")) * sign;
    if (key === "type2") return ((a.types[1] ?? "").localeCompare(b.types[1] ?? "", "ja")) * sign;
    return partyNameFor(a).localeCompare(partyNameFor(b), "ja") * sign;
  });
}

function renderSearchList() {
  const list = sortedSearchResults();
  if (list.length && !list.some((pokemon) => partyNameFor(pokemon) === partyNameFor(state.searchPokemon))) {
    state.searchPokemon = list[0];
  }
  document.querySelectorAll("#searchTypeFilters button").forEach((button) => {
    button.classList.toggle("active", state.searchTypes.includes(button.dataset.type));
  });
  document.querySelector("#pokemonSearchCount").textContent = `${list.length}件`;
  document.querySelector("#pokemonSearchList").innerHTML = searchResultsTable(list);

  document.querySelectorAll("[data-search-sort]").forEach((button) => {
    button.addEventListener("click", (event) => {
      const key = event.currentTarget.dataset.searchSort;
      state.searchSort = {
        key,
        direction: state.searchSort.key === key && state.searchSort.direction === "desc" ? "asc" : "desc",
      };
      renderSearch();
    });
  });

  document.querySelectorAll("[data-search-name]").forEach((row) => {
    const selectRow = (event) => {
      state.searchPokemon = findPokemon(event.currentTarget.dataset.searchName) ?? state.searchPokemon;
      renderSearch();
    };
    row.addEventListener("click", selectRow);
    row.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      selectRow(event);
    });
  });
}

function renderSearch() {
  renderSearchFilterTags();
  renderSearchList();
  renderSearchMatchupFilters();
  renderSearchDetail();
}

function renderSearchFilterTags() {
  const target = document.querySelector("#searchFilterTags");
  const tags = [
    ...state.searchTypes.map((type) => ({ key: "type", value: type, label: typeBadge(type) })),
    ...state.searchMatchupFilters.map((filter, index) => ({
      key: "matchup",
      index,
      value: `${filter.attackType}:${filter.rate}`,
      label: `${typeBadge(filter.attackType)} <span class="search-tag-text">×${escapeHtml(filter.rate)}</span>`,
    })),
  ];
  [
    ["pokemon", "ポケモン", searchText("#pokemonSearchInput")],
    ["move", "わざ", searchText("#moveSearchInput")],
    ["ability", "とくせい", searchText("#abilitySearchInput")],
  ].forEach(([key, label, value]) => {
    if (value) tags.push({ key, value, label: `<span class="search-tag-kicker">${label}</span><span class="search-tag-text">${escapeHtml(value)}</span>` });
  });

  if (!tags.length) {
    target.innerHTML = "";
    return;
  }

  target.innerHTML = tags
    .map((tag) => `<button type="button" data-search-tag="${tag.key}" ${Number.isInteger(tag.index) ? `data-tag-index="${tag.index}"` : ""} data-tag-value="${escapeHtml(tag.value)}">${tag.label}<span class="search-tag-remove">×</span></button>`)
    .join("");

  target.querySelectorAll("[data-search-tag]").forEach((button) => {
    button.addEventListener("click", (event) => {
      const key = event.currentTarget.dataset.searchTag;
      const value = event.currentTarget.dataset.tagValue;
      if (key === "type") state.searchTypes = state.searchTypes.filter((type) => type !== value);
      if (key === "matchup") state.searchMatchupFilters = state.searchMatchupFilters.filter((_, index) => index !== Number(event.currentTarget.dataset.tagIndex));
      if (key === "pokemon") setSearchText("#pokemonSearchInput", "");
      if (key === "move") setSearchText("#moveSearchInput", "");
      if (key === "ability") setSearchText("#abilitySearchInput", "");
      renderSearch();
    });
  });
}

function sortLabel(key, label) {
  if (state.searchSort.key !== key) return label;
  return `${label} ${state.searchSort.direction === "desc" ? "↓" : "↑"}`;
}

function searchResultsTable(list) {
  const statKeys = Object.keys(STAT_LABELS);
  const matchupRates = [4, 2, 0.5, 0.25, 0];
  const header = `<div class="search-table-row search-table-head">
    <button type="button" data-search-sort="singleRank">${sortLabel("singleRank", "使用率")}</button>
    <button type="button" data-search-sort="name">${sortLabel("name", "ポケモン名")}</button>
    <button type="button" data-search-sort="type1">${sortLabel("type1", "タイプ1")}</button>
    <button type="button" data-search-sort="type2">${sortLabel("type2", "タイプ2")}</button>
    ${matchupRates.map((rate) => `<button type="button" data-search-sort="matchup:${rate}">${sortLabel(`matchup:${rate}`, `×${rate}`)}</button>`).join("")}
    ${statKeys.map((key) => `<button type="button" data-search-sort="${key}">${sortLabel(key, STAT_LABELS[key])}</button>`).join("")}
  </div>`;

  if (!list.length) {
    return `${header}<div class="search-empty">該当するポケモンがいません</div>`;
  }

  return `${header}${list
    .map((pokemon) => `<div class="search-table-row search-result-row ${partyNameFor(state.searchPokemon) === partyNameFor(pokemon) ? "active" : ""}" data-search-name="${escapeHtml(partyNameFor(pokemon))}" role="button" tabindex="0">
      <div class="search-rank-cell">${rankLabel(pokemon)}</div>
      <div class="search-name-cell">${escapeHtml(partyNameFor(pokemon))}</div>
      <div>${pokemon.types[0] ? typeBadge(pokemon.types[0]) : ""}</div>
      <div>${pokemon.types[1] ? typeBadge(pokemon.types[1]) : ""}</div>
      ${matchupRates.map((rate) => matchupCountCell(pokemon, rate)).join("")}
      ${statKeys.map((key) => searchStatBar(pokemon.base[key], baseStatMaxValue(key))).join("")}
    </div>`)
    .join("")}`;
}

function rankSortValue(pokemon) {
  return Number.isFinite(Number(pokemon.singleRank)) ? Number(pokemon.singleRank) : 9999;
}

function rankLabel(pokemon) {
  return Number.isFinite(Number(pokemon.singleRank)) ? `${Number(pokemon.singleRank)}位` : "-";
}

function renderSearchDetail() {
  const pokemon = state.searchPokemon;
  if (!pokemon) return;
  document.querySelector("#searchPokemonName").textContent = pokemon.name;
  renderTypes(document.querySelector("#searchPokemonTypes"), pokemon.types);
  renderVariantSwitch(document.querySelector("#searchPokemonVariants"), pokemon, (next) => {
    state.searchPokemon = next;
    renderSearch();
  });
  document.querySelector("#searchPokemonStats").innerHTML = statsRows(pokemon);
  const matchup = matchupBuckets(pokemon.types);
  document.querySelector("#searchPokemonMatchups").innerHTML = groupedMatchups([...matchup.weak, ...matchup.resist, ...matchup.immune]);
  document.querySelector("#searchMoveList").innerHTML = rankRows(pokemon.moves, "moves", true);
  document.querySelector("#searchItemList").innerHTML = rankRows(pokemon.items, "items");
  document.querySelector("#searchAbilityList").innerHTML = rankRows(pokemon.abilities, "abilities");
}

function matchupCount(pokemon, rate) {
  return TYPE_ORDER.filter((type) => multiplier(type, pokemon.types) === rate).length;
}

function matchupCountCell(pokemon, rate) {
  const count = matchupCount(pokemon, rate);
  const tone = rate >= 2 ? "weak" : rate === 0 ? "immune" : "resist";
  return `<div class="search-matchup-count ${tone}"><strong>${count || ""}</strong></div>`;
}

function baseStatMaxValue(key) {
  return Math.max(...POKEMON.map((pokemon) => Number(pokemon.base[key]) || 0), 1);
}

function searchStatBar(value, max) {
  const width = Math.max(3, Math.min(100, (Number(value) / max) * 100));
  return `<div class="search-stat-cell">
    <span class="search-stat-bar" style="width:${width}%"></span>
    <strong>${escapeHtml(value)}</strong>
  </div>`;
}

function renderSearchMatchupFilters() {
  const target = document.querySelector("#searchMatchupFilters");
  target.innerHTML = state.searchMatchupFilters
    .map(
      (filter, index) => `<div class="search-matchup-filter">
        <select data-matchup-index="${index}" data-matchup-field="attackType" aria-label="攻撃タイプ">
          ${TYPE_ORDER.map((type) => `<option value="${escapeHtml(type)}" ${type === filter.attackType ? "selected" : ""}>${escapeHtml(type)}</option>`).join("")}
        </select>
        <select data-matchup-index="${index}" data-matchup-field="rate" aria-label="倍率">
          ${[4, 2, 1, 0.5, 0.25, 0].map((rate) => `<option value="${rate}" ${rate === filter.rate ? "selected" : ""}>x${rate}</option>`).join("")}
        </select>
        <button type="button" data-matchup-remove="${index}" aria-label="条件を削除">×</button>
      </div>`,
    )
    .join("");

  target.querySelectorAll("select").forEach((select) => {
    select.addEventListener("change", (event) => {
      const index = Number(event.currentTarget.dataset.matchupIndex);
      const field = event.currentTarget.dataset.matchupField;
      state.searchMatchupFilters[index] = {
        ...state.searchMatchupFilters[index],
        [field]: field === "rate" ? Number(event.currentTarget.value) : event.currentTarget.value,
      };
      renderSearch();
    });
  });

  target.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", (event) => {
      const index = Number(event.currentTarget.dataset.matchupRemove);
      state.searchMatchupFilters = state.searchMatchupFilters.filter((_, itemIndex) => itemIndex !== index);
      renderSearch();
    });
  });
}

function updateDatalist() {
  const datalist = document.querySelector("#pokemonList");
  datalist.innerHTML = partyCandidatePokemon().map((pokemon) => `<option value="${escapeHtml(partyNameFor(pokemon))}"></option>`).join("");
  updateSearchDatalists();
}

function ensurePokemon(input) {
  const name = canonicalPokemonName(input);
  if (!name) return undefined;
  const existing = findPokemon(name);
  if (existing) return existing;
  const custom = {
    name,
    types: ["ノーマル"],
    base: { hp: 80, atk: 80, def: 80, spa: 80, spd: 80, spe: 80 },
    moves: [],
    items: [],
    abilities: [],
    isCustom: true,
  };
  CUSTOM_POKEMON = [...CUSTOM_POKEMON.filter((pokemon) => pokemon.name !== custom.name), custom];
  saveCustomPokemon();
  refreshPokemonList();
  updateDatalist();
  return custom;
}

function findPokemon(input) {
  if (!input) return undefined;
  const raw = input.trim();
  const normalized = canonicalPokemonName(raw);
  return (
    POKEMON.find((pokemon) => pokemon.name === normalized) ??
    POKEMON.find((pokemon) => partyNameFor(pokemon) === normalized) ??
    POKEMON.find((pokemon) => pokemon.name.includes(normalized)) ??
    POKEMON.find((pokemon) => pokemon.name.includes(raw))
  );
}

function render() {
  document.querySelector("#opponentName").textContent = state.opponent.name;
  document.querySelector("#allyName").textContent = state.ally.name;
  renderTypes(document.querySelector("#opponentTypes"), state.opponent.types);
  renderTypes(document.querySelector("#allyTypes"), state.ally.types);
  renderMegaSwitch(document.querySelector("#opponentMegaSwitch"), state.opponent, "opponent");
  renderMegaSwitch(document.querySelector("#allyMegaSwitch"), state.ally, "ally");
  renderStats();
  renderSpeed();
  renderMatchups();
  renderPartyTypeScores();
  renderUsage();
  renderTypeChartTable();
}

async function setup() {
  setupTheme();
  await loadExternalData();
  updateDatalist();

  const allySelect = document.querySelector("#allySelect");
  const opponentSelect = document.querySelector("#opponentSelect");
  state.opponent = findPokemon(state.enemyParty[0]) ?? state.opponent;
  state.ally = findPokemon(state.party[0]) ?? state.ally;
  state.searchPokemon = findPokemon(state.searchPokemon.name) ?? POKEMON[0];
  renderEnemySlots();
  renderPartySlots();
  syncOpponentSelect();
  syncAllySelect();
  setupTabs();
  setupSearchFilters();
  setupDetailPopover();
  setupDetailEditor();
  setupPartyPresets();
  document.querySelector("#resetParties").addEventListener("click", resetParties);

  opponentSelect.addEventListener("change", (event) => {
    state.opponent = findPokemon(event.target.value) ?? state.opponent;
    render();
  });

  allySelect.addEventListener("change", (event) => {
    state.ally = findPokemon(event.target.value) ?? state.ally;
    render();
  });

  render();
  renderSearch();
}

setup();
