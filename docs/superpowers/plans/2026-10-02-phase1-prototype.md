# COMMAND Phase 1（最小プロトタイプ）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 60秒間、画面の矢印コマンドをキーボードまたはタッチで入力し続けるスコアアタックの最小版を、1枚のHTMLとして遊べる状態にする。

**Architecture:** DOM に触れない純粋ロジック（`10-logic.js`）と、描画・入力・音を分けた素の JS。`build.sh` が `src/` を連結して `command.html` / `index.html` / `verify.html` を作る。時刻はすべて引数 `now`（`performance.now()`）で渡し、乱数も差し替え可能にしてロジックを検証ページで確かめられるようにする。

**Tech Stack:** HTML / CSS / 素の JavaScript（ES2017程度、モジュールなし）、Web Audio API、sh（Git Bash）。

**仕様書:** `docs/superpowers/specs/2026-10-02-command-design.md`

**環境メモ:**
- リポジトリ: `C:\Users\PC_User\Second brain\command`（`master` へ直接コミット。ブランチは切らない）
- この PC には node が無い。ロジックの検証はブラウザで `verify.html` を開いて行う（タブのタイトルが `PASS n/n` になれば全通過）
- コミットメッセージは日本語。末尾に `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

---

## ファイル構成

| ファイル | 役割 |
|---|---|
| `build.sh` | src を連結して3つのHTMLを出力 |
| `src/00-head.html` | `<head>`・CSS・画面の骨組み。最後が `<script>` で終わる |
| `src/10-logic.js` | 定数 `CFG`・状態・コマンド生成・判定・スコア（DOM 非依存） |
| `src/20-snd.js` | 効果音 `Snd` |
| `src/30-view.js` | `render(s, ev)` / `renderTime(s)` |
| `src/40-input.js` | `bindInput(onDir, onRetry)` |
| `src/95-boot.js` | 起動とループ |
| `src/99-tail.html` | `</script></body></html>` |
| `src/verify-head.html` | 検証ページの head。最後が `<script>` で終わる |
| `src/verify-tests.js` | 検証テスト |

---

### Task 1: ビルドの骨組みと検証ページ（テストを先に書く）

**Files:**
- Create: `build.sh`, `src/99-tail.html`, `src/verify-head.html`, `src/verify-tests.js`, `src/10-logic.js`（空ファイル）

- [ ] **Step 1: `src/99-tail.html` を作る**

```html
</script>
</body>
</html>
```

- [ ] **Step 2: `src/verify-head.html` を作る**

```html
<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>検証 — COMMAND</title>
<style>
  body{font-family:"Yu Gothic UI",system-ui,sans-serif;background:#1c1c1e;color:#eee;padding:24px;line-height:1.7}
  h1{font-size:18px;margin-bottom:16px}
  .r{padding:4px 0;border-bottom:1px solid #333}
  .ok::before{content:"PASS ";color:#6bd07a;font-weight:bold}
  .ng::before{content:"FAIL ";color:#ff6b6b;font-weight:bold}
  .ng{color:#ffb0b0}
  .why{color:#ff8f8f;padding-left:3em;font-size:13px}
  #sum{margin-top:18px;font-size:16px;font-weight:bold}
</style>
</head>
<body>
<h1>COMMAND — 検証</h1>
<div id="out"></div>
<div id="sum"></div>

<script>
```

- [ ] **Step 3: `src/verify-tests.js` を作る**

```js
// ===== 検証ハーネス =====
const __results = [];
function test(name, fn) {
  try { fn(); __results.push({ name, ok: true }); }
  catch (e) { __results.push({ name, ok: false, why: e.message }); }
}
function eq(actual, expected, label) {
  const a = JSON.stringify(actual), b = JSON.stringify(expected);
  if (a !== b) throw new Error((label ? label + ': ' : '') + 'expected ' + b + ' but got ' + a);
}
// 渡した値を順に返す乱数（末尾まで行ったら先頭に戻る）
function seqRand(vals) { let i = 0; return () => vals[i++ % vals.length]; }
const R0 = seqRand([0]); // 常に 'U' を出す

// ===== テスト =====
test('commandLength: クリア数に応じて伸び、上限で止まる', () => {
  eq(commandLength(0), 2, '0');
  eq(commandLength(4), 2, '4');
  eq(commandLength(5), 3, '5');
  eq(commandLength(35), 9, '35');
  eq(commandLength(100), 9, '100');
});

test('makeCommand: 乱数を固定すると決まった並びになる', () => {
  eq(makeCommand(4, seqRand([0, 0.25, 0.5, 0.75])), ['U', 'D', 'L', 'R']);
  eq(makeCommand(3, seqRand([0.99])), ['R', 'R', 'R']);
});

test('clearScore: 基本点＋速さボーナス', () => {
  eq(clearScore(2, 0), 320, '最速');
  eq(clearScore(2, 600), 200, 'ちょうど目標時間');
  eq(clearScore(2, 1000), 200, '目標より遅い');
  eq(clearScore(3, 450), 435, '途中');
});

test('accuracy: 0除算を含む', () => {
  const s = createState();
  eq(accuracy(s), 100, '0/0');
  s.inputs = 97; s.misses = 3; eq(accuracy(s), 97, '97/100');
  s.inputs = 2; s.misses = 1; eq(accuracy(s), 66, '2/3 は切り捨て');
});

test('ready で方向を押すと開始し、その入力は数えない', () => {
  const s = createState();
  eq(s.phase, 'ready');
  eq(press(s, 'L', 1000, R0), 'start');
  eq(s.phase, 'playing');
  eq(s.command, ['U', 'U']);
  eq(s.pos, 0); eq(s.inputs, 0); eq(s.misses, 0);
  eq(s.endAt, 1000 + CFG.TIME_LIMIT);
  eq(s.commandStartedAt, 1000);
});

test('正解キーで pos と inputs が進む', () => {
  const s = createState(); press(s, 'U', 0, R0);
  eq(press(s, 'U', 100, R0), 'hit');
  eq(s.pos, 1); eq(s.inputs, 1);
});

test('ミスしても pos は動かず、スコアは0未満にならない', () => {
  const s = createState(); press(s, 'U', 0, R0);
  press(s, 'U', 100, R0);
  eq(press(s, 'D', 200, R0), 'miss');
  eq(s.pos, 1); eq(s.misses, 1); eq(s.combo, 0); eq(s.score, 0);
});

test('最後まで入力するとクリアし、同じ処理で次のコマンドが出る', () => {
  const s = createState(); press(s, 'U', 0, R0);
  press(s, 'U', 100, R0);
  eq(press(s, 'U', 200, R0), 'clear');
  eq(s.cleared, 1); eq(s.combo, 1); eq(s.maxCombo, 1);
  eq(s.score, clearScore(2, 200));
  eq(s.command, ['U', 'U']); eq(s.pos, 0);
  eq(s.commandStartedAt, 200);
});

test('ミスでスコアが MISS_PENALTY 減り、コンボが切れる', () => {
  const s = createState(); press(s, 'U', 0, R0);
  press(s, 'U', 100, R0); press(s, 'U', 200, R0); // クリア
  const before = s.score;
  eq(press(s, 'L', 300, R0), 'miss');
  eq(s.score, before - CFG.MISS_PENALTY);
  eq(s.combo, 0); eq(s.maxCombo, 1);
});

test('5回クリアするとコマンドが3個になる', () => {
  const s = createState(); press(s, 'U', 0, R0);
  let t = 0;
  for (let c = 0; c < 5; c++) { while (true) { t += 10; if (press(s, 'U', t, R0) === 'clear') break; } }
  eq(s.cleared, 5); eq(s.command.length, 3);
});

test('時間切れ後の入力は数えずに result へ移る', () => {
  const s = createState(); press(s, 'U', 0, R0);
  eq(press(s, 'U', CFG.TIME_LIMIT, R0), 'end');
  eq(s.phase, 'result'); eq(s.inputs, 0); eq(s.resultAt, CFG.TIME_LIMIT);
  eq(s.command, []);
  eq(press(s, 'U', CFG.TIME_LIMIT + 10, R0), null, 'result 中の方向キーは無視');
});

test('tick は時間切れの瞬間に1度だけ true を返す', () => {
  const s = createState(); press(s, 'U', 0, R0);
  eq(tick(s, 30000), false); eq(s.timeLeft, 30000);
  eq(tick(s, CFG.TIME_LIMIT + 5), true); eq(s.timeLeft, 0);
  eq(tick(s, CFG.TIME_LIMIT + 50), false);
});

test('RETRY は結果表示から RESULT_LOCK 経つまで効かない', () => {
  const s = createState(); press(s, 'U', 0, R0);
  press(s, 'D', 100, R0); // ミス1
  tick(s, CFG.TIME_LIMIT);
  eq(canRetry(s, CFG.TIME_LIMIT + CFG.RESULT_LOCK - 1), false);
  eq(retry(s, CFG.TIME_LIMIT + CFG.RESULT_LOCK - 1, R0), false);
  eq(s.phase, 'result');
  const t = CFG.TIME_LIMIT + CFG.RESULT_LOCK;
  eq(retry(s, t, R0), true);
  eq(s.phase, 'playing'); eq(s.misses, 0); eq(s.score, 0);
  eq(s.endAt, t + CFG.TIME_LIMIT); eq(s.command.length, 2);
});

test('playing 中・ready 中は RETRY が効かない', () => {
  const s = createState();
  eq(retry(s, 99999, R0), false);
  press(s, 'U', 0, R0);
  eq(retry(s, 99999, R0), false);
});

// ===== 結果表示 =====
(function () {
  const out = document.getElementById('out');
  let pass = 0;
  for (const r of __results) {
    const d = document.createElement('div');
    d.className = 'r ' + (r.ok ? 'ok' : 'ng');
    d.textContent = r.name;
    out.appendChild(d);
    if (r.ok) pass++;
    else { const w = document.createElement('div'); w.className = 'why'; w.textContent = r.why; out.appendChild(w); }
  }
  const sum = pass + '/' + __results.length;
  document.getElementById('sum').textContent = (pass === __results.length ? 'すべて通過 ' : '失敗あり ') + sum;
  document.title = (pass === __results.length ? 'PASS ' : 'FAIL ') + sum;
})();
```

- [ ] **Step 4: `build.sh` を作る**（この段階では本体側の src がまだ無いので、本体の連結は Task 3 で有効になる。存在しないファイルがあれば cat がエラーを出すが verify.html は作られる）

```sh
#!/bin/sh
# 分割ソースを1枚のHTMLに結合する
cd "$(dirname "$0")"

# --- 本体 ---
cat src/00-head.html \
    src/10-logic.js \
    src/20-snd.js \
    src/30-view.js \
    src/40-input.js \
    src/95-boot.js \
    src/99-tail.html > command.html
cp command.html index.html   # GitHub Pages はルートの index.html を配信する

# --- 検証ページ ---
# 本体と同じく1枚に結合する（<script src> で隣を読むと表示環境によって読み込まれないため）。
cat src/verify-head.html \
    src/10-logic.js \
    src/verify-tests.js \
    src/99-tail.html > verify.html

echo "built command.html + index.html ($(wc -c < command.html) bytes)"
echo "built verify.html ($(wc -c < verify.html) bytes)"
```

- [ ] **Step 5: 空の `src/10-logic.js` を作って `sh build.sh` し、verify.html がすべて FAIL（`commandLength is not defined` など）になることを確かめる**（ブラウザが使えない場合は、ビルドが通り verify.html が出力されたことだけ確認して次へ）

---

### Task 2: ロジック `src/10-logic.js`

**Files:**
- Modify: `src/10-logic.js`

- [ ] **Step 1: 全文を書く**

```js
// ===== COMMAND: ゲームロジック（DOM に触れない） =====
// 時刻は呼び出し側が now（ミリ秒）で渡す。乱数 rand は省略時 Math.random。

// 遊びながら調整する数値はすべてここ
const CFG = {
  TIME_LIMIT: 60000,   // 制限時間 ms
  LEN_START: 2,        // 最初のコマンドの長さ
  LEN_STEP: 5,         // 何コマンドクリアごとに1個長くなるか
  LEN_MAX: 9,          // 長さの上限
  PTS_PER_KEY: 100,    // 矢印1個あたりの基本点
  SPEED_TARGET: 300,   // 1個あたりの目標時間 ms（これより速いとボーナス）
  MISS_PENALTY: 50,    // ミス1回の減点
  RESULT_LOCK: 600,    // 結果表示から RETRY を受け付けるまで ms
};

const DIRS = ['U', 'D', 'L', 'R'];

function commandLength(cleared) {
  return Math.min(CFG.LEN_START + Math.floor(cleared / CFG.LEN_STEP), CFG.LEN_MAX);
}

function makeCommand(len, rand) {
  rand = rand || Math.random;
  const cmd = [];
  for (let i = 0; i < len; i++) cmd.push(DIRS[Math.floor(rand() * DIRS.length)]);
  return cmd;
}

// 基本点 + 目標より速く打てた分のボーナス（長いコマンドほど大きい）
function clearScore(len, elapsedMs) {
  const base = CFG.PTS_PER_KEY * len;
  const bonus = Math.round(Math.max(0, CFG.SPEED_TARGET * len - elapsedMs) * len / 10);
  return base + bonus;
}

function accuracy(s) {
  const total = s.inputs + s.misses;
  return total === 0 ? 100 : Math.floor(s.inputs * 100 / total);
}

function createState() {
  return {
    phase: 'ready',          // 'ready' | 'playing' | 'result'
    timeLeft: CFG.TIME_LIMIT,
    endAt: 0,
    resultAt: 0,
    score: 0,
    combo: 0,
    maxCombo: 0,
    cleared: 0,
    inputs: 0,
    misses: 0,
    command: [],
    pos: 0,
    commandStartedAt: 0,
  };
}

function nextCommand(s, now, rand) {
  s.command = makeCommand(commandLength(s.cleared), rand);
  s.pos = 0;
  s.commandStartedAt = now;
}

function startGame(s, now, rand) {
  Object.assign(s, createState());
  s.phase = 'playing';
  s.endAt = now + CFG.TIME_LIMIT;
  nextCommand(s, now, rand);
}

// 残り時間を更新する。時間切れになった瞬間だけ true
function tick(s, now) {
  if (s.phase !== 'playing') return false;
  s.timeLeft = Math.max(0, s.endAt - now);
  if (s.timeLeft > 0) return false;
  s.phase = 'result';
  s.resultAt = now;
  s.command = [];
  s.pos = 0;
  return true;
}

// 方向入力。戻り値: 'start' | 'hit' | 'clear' | 'miss' | 'end' | null
function press(s, dir, now, rand) {
  if (s.phase === 'ready') { startGame(s, now, rand); return 'start'; }
  if (s.phase !== 'playing') return null;
  if (tick(s, now)) return 'end';

  if (dir === s.command[s.pos]) {
    s.pos++;
    s.inputs++;
    if (s.pos < s.command.length) return 'hit';
    s.score += clearScore(s.command.length, now - s.commandStartedAt);
    s.cleared++;
    s.combo++;
    s.maxCombo = Math.max(s.maxCombo, s.combo);
    nextCommand(s, now, rand);   // 待ち時間ゼロで次へ
    return 'clear';
  }

  // ミス: 位置はそのまま、続けられる
  s.misses++;
  s.combo = 0;
  s.score = Math.max(0, s.score - CFG.MISS_PENALTY);
  return 'miss';
}

function canRetry(s, now) {
  return s.phase === 'result' && now - s.resultAt >= CFG.RESULT_LOCK;
}

function retry(s, now, rand) {
  if (!canRetry(s, now)) return false;
  startGame(s, now, rand);
  return true;
}
```

- [ ] **Step 2: `sh build.sh` して verify.html を開き、タイトルが `PASS 14/14` になることを確かめる**（ブラウザが使えない場合は、テストの各期待値を上のコードで手計算して突き合わせる）

- [ ] **Step 3: コミット**

```bash
git add build.sh src/
git commit -m "Phase1: ゲームロジックと検証ページを追加した"
```

---

### Task 3: 画面・音・入力・起動

**Files:**
- Create: `src/00-head.html`, `src/20-snd.js`, `src/30-view.js`, `src/40-input.js`, `src/95-boot.js`

- [ ] **Step 1: `src/00-head.html`**

```html
<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>COMMAND</title>
<style>
  :root{--bg:#101218;--fg:#e8ecf4;--sub:#8a92a6;--dim:#3c4252;--accent:#5ad1ff;--ok:#7dffa0;--ng:#ff5a6a;--warn:#ffb648}
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{height:100%;background:var(--bg);color:var(--fg);overflow:hidden;
    font-family:"Segoe UI","Yu Gothic UI",system-ui,sans-serif;
    touch-action:manipulation;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent}
  #app{height:100%;max-width:900px;margin:0 auto;padding:16px;display:flex;flex-direction:column}

  #hud{display:flex;gap:12px}
  .stat{flex:1;display:flex;flex-direction:column;align-items:center}
  .stat .k{font-size:12px;letter-spacing:.2em;color:var(--sub)}
  .stat .v{font-size:28px;font-weight:700;font-variant-numeric:tabular-nums}
  #time.low{color:var(--warn)}

  #stage{flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
  #cmd{display:flex;gap:.2em;font-size:var(--cmd-size,72px);font-weight:700;line-height:1.1}
  #cmd span{display:inline-block}
  #cmd span.done{color:var(--dim)}
  #cmd span.next{color:var(--accent);transform:scale(1.15)}
  #cmd span.hit{animation:hit .15s ease-out}
  #cmd span.miss{color:var(--ng);animation:shake .15s linear}
  #cmd.pop{animation:pop .12s ease-out}
  @keyframes hit{from{color:var(--ok);transform:scale(1.4)}to{color:var(--dim);transform:scale(1)}}
  @keyframes shake{0%,100%{transform:translateX(0) scale(1.15)}25%{transform:translateX(-6px) scale(1.15)}75%{transform:translateX(6px) scale(1.15)}}
  @keyframes pop{from{transform:scale(.85);opacity:.4}to{transform:scale(1);opacity:1}}
  #msg{margin-top:20px;font-size:18px;color:var(--sub);text-align:center;min-height:1.5em}

  #pad{display:none;grid-template-areas:". u ." "l d r";grid-template-columns:repeat(3,1fr);gap:10px;
    width:min(100%,360px);margin:0 auto 8px}
  #pad button{height:72px;font-size:34px;font-weight:700;color:var(--fg);background:#1d2130;
    border:1px solid #2c3246;border-radius:14px;touch-action:none}
  #pad button:active{background:#2a3350}
  #pad .u{grid-area:u} #pad .l{grid-area:l} #pad .d{grid-area:d} #pad .r{grid-area:r}
  @media (pointer:coarse){#pad{display:grid}}

  #result{position:fixed;inset:0;background:rgba(16,18,24,.94);display:flex;flex-direction:column;
    align-items:center;justify-content:center;gap:18px;padding:16px}
  #result[hidden]{display:none}
  #result .title{font-size:22px;letter-spacing:.3em;color:var(--sub)}
  #result dl{display:grid;grid-template-columns:auto auto;gap:6px 28px;font-size:18px}
  #result dt{color:var(--sub);letter-spacing:.1em}
  #result dd{text-align:right;font-weight:700;font-variant-numeric:tabular-nums}
  #result dd.big{font-size:40px}
  #retry{margin-top:8px;padding:16px 56px;font-size:28px;font-weight:700;letter-spacing:.15em;
    color:var(--bg);background:var(--accent);border:0;border-radius:14px;touch-action:none}
  #retry.locked{opacity:.35}
  #result .hint{font-size:13px;color:var(--sub)}
</style>
</head>
<body>
<div id="app">
  <div id="hud">
    <div class="stat"><span class="k">SCORE</span><span class="v" id="score">0</span></div>
    <div class="stat"><span class="k">TIME</span><span class="v" id="time">60.0</span></div>
    <div class="stat"><span class="k">COMBO</span><span class="v" id="combo">0</span></div>
  </div>
  <div id="stage">
    <div id="cmd"></div>
    <div id="msg"></div>
  </div>
  <div id="pad">
    <button class="u" data-dir="U">↑</button>
    <button class="l" data-dir="L">←</button>
    <button class="d" data-dir="D">↓</button>
    <button class="r" data-dir="R">→</button>
  </div>
</div>
<div id="result" hidden>
  <div class="title">RESULT</div>
  <dl>
    <dt>SCORE</dt><dd class="big" id="r-score">0</dd>
    <dt>ACCURACY</dt><dd id="r-acc">100%</dd>
    <dt>INPUTS</dt><dd id="r-inputs">0</dd>
    <dt>MISS</dt><dd id="r-miss">0</dd>
    <dt>MAX COMBO</dt><dd id="r-combo">0</dd>
  </dl>
  <button id="retry">RETRY</button>
  <div class="hint">Enter / Space</div>
</div>

<script>
```

- [ ] **Step 2: `src/20-snd.js`**

```js
// ===== 効果音（波形合成。ファイルなし） =====
const Snd = (() => {
  let ac = null;
  // 最初のユーザー入力で呼ぶ（自動再生制限のため）
  function unlock() {
    if (!ac) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ac = new C();
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function beep(freq, dur, type, vol, when) {
    const a = unlock();
    if (!a) return;
    const t = a.currentTime + (when || 0);
    const o = a.createOscillator(), g = a.createGain();
    o.type = type || 'square';
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.06, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  return {
    unlock,
    hit()   { beep(880, 0.05); },
    clear() { beep(1320, 0.08); },
    miss()  { beep(140, 0.15, 'sawtooth', 0.08); },
    end()   { beep(660, 0.12, 'triangle', 0.12); beep(880, 0.12, 'triangle', 0.12, 0.12); beep(1100, 0.25, 'triangle', 0.12, 0.24); },
  };
})();
```

- [ ] **Step 3: `src/30-view.js`**

```js
// ===== 描画 =====
const ARROW = { U: '↑', D: '↓', L: '←', R: '→' };
const $ = id => document.getElementById(id);

function renderTime(s) {
  const t = $('time');
  t.textContent = (s.timeLeft / 1000).toFixed(1);
  t.classList.toggle('low', s.phase === 'playing' && s.timeLeft <= 10000);
}

// 9個並んでもスマホの縦画面で1行に収まるよう文字サイズを決める
function fitCommand(len) {
  const w = $('stage').clientWidth;
  const size = Math.max(28, Math.min(72, Math.floor(w / (len * 1.35))));
  $('cmd').style.setProperty('--cmd-size', size + 'px');
}

function restartAnim(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth; // アニメーションを最初から再生させる
  el.classList.add(cls);
}

// ev: press() の戻り値、または 'end' / null
function render(s, ev) {
  $('score').textContent = s.score.toLocaleString();
  $('combo').textContent = s.combo;
  renderTime(s);

  const cmd = $('cmd');
  const msg = $('msg');
  if (s.phase === 'playing') {
    cmd.replaceChildren(...s.command.map((d, i) => {
      const sp = document.createElement('span');
      sp.textContent = ARROW[d];
      if (i < s.pos) sp.className = 'done';
      else if (i === s.pos) sp.className = 'next';
      return sp;
    }));
    if (ev === 'hit') cmd.children[s.pos - 1].classList.add('hit');
    if (ev === 'miss') cmd.children[s.pos].classList.add('miss');
    if (ev === 'clear' || ev === 'start') restartAnim(cmd, 'pop');
    fitCommand(s.command.length);
    msg.textContent = '';
  } else if (s.phase === 'ready') {
    cmd.replaceChildren();
    msg.textContent = '表示された矢印を順に入力 ／ 矢印キーかボタンでスタート';
  } else {
    cmd.replaceChildren();
    msg.textContent = '';
  }

  $('result').hidden = s.phase !== 'result';
  if (s.phase === 'result') {
    $('r-score').textContent = s.score.toLocaleString();
    $('r-acc').textContent = accuracy(s) + '%';
    $('r-inputs').textContent = s.inputs;
    $('r-miss').textContent = s.misses;
    $('r-combo').textContent = s.maxCombo;
  }
}
```

- [ ] **Step 4: `src/40-input.js`**

```js
// ===== 入力（キーボードとタッチを onDir / onRetry に集約） =====
// e.code で判定する（日本語入力ON でも WASD が効くように）
const KEYMAP = {
  ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R',
  KeyW: 'U', KeyS: 'D', KeyA: 'L', KeyD: 'R',
};

function bindInput(onDir, onRetry) {
  window.addEventListener('keydown', e => {
    if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') {
      e.preventDefault();
      if (!e.repeat) onRetry();
      return;
    }
    const dir = KEYMAP[e.code];
    if (!dir) return;
    e.preventDefault();          // 矢印キーでページがスクロールしないように
    if (e.repeat) return;        // 押しっぱなしは無視
    onDir(dir);
  });

  // pointerdown で即反応（click の遅延を避ける）
  document.querySelectorAll('#pad button').forEach(b => {
    b.addEventListener('pointerdown', e => { e.preventDefault(); onDir(b.dataset.dir); });
  });
  $('retry').addEventListener('pointerdown', e => { e.preventDefault(); onRetry(); });
  window.addEventListener('contextmenu', e => e.preventDefault()); // 長押しメニューを出さない
}
```

- [ ] **Step 5: `src/95-boot.js`**

```js
// ===== 起動とループ =====
const S = createState();

function onDir(dir) {
  Snd.unlock();
  const ev = press(S, dir, performance.now());
  if (ev === 'hit') Snd.hit();
  else if (ev === 'clear') Snd.clear();
  else if (ev === 'miss') Snd.miss();
  else if (ev === 'end') Snd.end();
  if (ev) render(S, ev);
}

function onRetry() {
  Snd.unlock();
  if (retry(S, performance.now())) render(S, 'start');
}

function loop() {
  const now = performance.now();
  if (tick(S, now)) { Snd.end(); render(S, 'end'); }
  else if (S.phase === 'playing') renderTime(S);
  if (S.phase === 'result') $('retry').classList.toggle('locked', !canRetry(S, now));
  requestAnimationFrame(loop);
}

bindInput(onDir, onRetry);
window.addEventListener('resize', () => { if (S.phase === 'playing') fitCommand(S.command.length); });
render(S, null);
requestAnimationFrame(loop);
```

- [ ] **Step 6: `sh build.sh` を実行し、`command.html` / `index.html` / `verify.html` が出力されることを確かめる。ブラウザが使えるなら command.html を開き、コンソールにエラーが無いこと・矢印キーで開始→入力→60秒後に結果→0.6秒後に Enter で再開できることを確かめる**

- [ ] **Step 7: コミット**

```bash
git add src/ command.html index.html verify.html
git commit -m "Phase1: 画面・入力・音を付けて遊べる状態にした"
```

---

## 自己レビュー（仕様書との突き合わせ）

- §5 ready→playing（1回目は数えない）／result の0.6秒ロック／RETRY は ready を挟まない → Task 1 テスト・Task 2
- §6 定数・長さ・生成・スコア・ミス・ACCURACY・時間切れでの破棄 → Task 2（テスト14件）
- §7 HUD・残り10秒の色・次の1個の強調・自動縮小・正解/ミスの短い演出・十字ボタン（pointerdown・coarse判定）・WASD・preventDefault・repeat無視 → Task 3
- §8 音4種・最初の入力で unlock → Task 3 Step 2・5
- §9 検証項目 → Task 1 Step 3
