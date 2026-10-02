// ===== COMMAND: ゲームロジック（DOM に触れない） =====
// 時刻は呼び出し側が now（ミリ秒）で渡す。乱数 rand は省略時 Math.random。

// 遊びながら調整する数値はすべてここ
const CFG = {
  TIME_LIMIT: 30000,   // 既定の制限時間 ms（モード選択の初期値）
  MODES: [30000, 60000, 90000],  // 選べる制限時間 ms
  LEN_START: 2,        // 最初のコマンドの長さ
  LEN_STEP: 3,         // 何コマンドクリアごとに1個長くなるか
  LEN_MAX: 20,         // 長さの上限（11個以上は2段で表示）
  PTS_PER_KEY: 100,    // 矢印1個あたりの基本点
  GAUGE_MAX: 30,       // ミスなしで矢印を何個打てば満タンか（クリアしたコマンドの長さぶん溜まる）
  GAUGE_BONUS: 3000,   // 満タンで増える時間 ms
  MISS_PENALTY: 50,    // ミス1回の減点
  RESULT_LOCK: 600,    // 結果表示から RETRY を受け付けるまで ms
  COMBO_STEP: 10,      // 何コンボごとに倍率が上がるか
  COMBO_RATE: 0.5,     // 1段あたり上がる倍率
  COMBO_MULT_MAX: 3,   // 倍率の上限
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

// クリア得点 = 矢印1個あたりの基本点 × 長さ
function clearScore(len) {
  return CFG.PTS_PER_KEY * len;
}

function comboMult(combo) {
  return Math.min(1 + CFG.COMBO_RATE * Math.floor(combo / CFG.COMBO_STEP), CFG.COMBO_MULT_MAX);
}

// 倍率の段（0 = ×1 … 上限で最大）。演出の色・音の切り替えに使う
function comboTier(combo) {
  return Math.round((comboMult(combo) - 1) / CFG.COMBO_RATE);
}

// コンボ表示を出す節目: 5 と COMBO_STEP の倍数
function isComboMilestone(combo) {
  return combo === 5 || (combo > 0 && combo % CFG.COMBO_STEP === 0);
}

function accuracy(s) {
  const total = s.inputs + s.misses;
  return total === 0 ? 100 : Math.floor(s.inputs * 100 / total);
}

function createState(limit) {
  limit = limit || CFG.TIME_LIMIT;
  return {
    phase: 'ready',          // 'ready' | 'playing' | 'result'
    timeLimit: limit,        // 選択中の制限時間 ms（リトライでも保つ）
    timeLeft: limit,
    endAt: 0,
    resultAt: 0,
    score: 0,
    combo: 0,
    maxCombo: 0,
    maxMult: 1,              // 到達した最大倍率
    cleared: 0,
    inputs: 0,
    misses: 0,
    command: [],
    pos: 0,
    gauge: 0,
    boosts: 0,               // 時間が増えた回数
  };
}

function nextCommand(s, now, rand) {
  s.command = makeCommand(commandLength(s.cleared), rand);
  s.pos = 0;
}

function startGame(s, now, rand) {
  const limit = s.timeLimit;   // モードは作り直しても保つ
  Object.assign(s, createState(limit));
  s.phase = 'playing';
  s.endAt = now + limit;
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

// 方向入力。戻り値: 'start' | 'hit' | 'clear' | 'boost' | 'miss' | 'end' | null
function press(s, dir, now, rand) {
  if (s.phase === 'ready') { startGame(s, now, rand); return 'start'; }
  if (s.phase !== 'playing') return null;
  if (tick(s, now)) return 'end';

  if (dir === s.command[s.pos]) {
    s.pos++;
    s.inputs++;
    if (s.pos < s.command.length) return 'hit';
    s.cleared++;
    s.combo++;
    s.maxCombo = Math.max(s.maxCombo, s.combo);
    s.maxMult = Math.max(s.maxMult, comboMult(s.combo));
    s.score += Math.round(clearScore(s.command.length) * comboMult(s.combo));
    // 長いコマンドほど多く溜まる（1コマンド1目盛りだと、長くなるほど満タンが遠のいた）
    s.gauge += s.command.length;
    let ev = 'clear';
    if (s.gauge >= CFG.GAUGE_MAX) {
      s.gauge -= CFG.GAUGE_MAX;   // あふれたぶんは次へ持ち越す
      s.endAt += CFG.GAUGE_BONUS;
      s.timeLeft = s.endAt - now;
      s.boosts++;
      ev = 'boost';
    }
    nextCommand(s, now, rand);   // 待ち時間ゼロで次へ
    return ev;
  }

  // ミス: 位置はそのまま、続けられる
  s.misses++;
  s.combo = 0;
  s.gauge = 0;
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

// 自己ベストとの比較。best は保存済みのベスト（無ければ 0）
function judgeBest(score, best) {
  const isNew = score > best;
  return { isNew, best: isNew ? score : best, diff: isNew ? 0 : best - score };
}

// 制限時間モードの切り替え。ready と result のときだけ。成功したら true
// result では表示中の結果には触れず、次の retry で遊ぶ時間だけを変える
function setMode(s, limit) {
  if (s.phase !== 'ready' && s.phase !== 'result') return false;
  if (!CFG.MODES.includes(limit)) return false;
  s.timeLimit = limit;
  if (s.phase === 'ready') s.timeLeft = limit;
  return true;
}
