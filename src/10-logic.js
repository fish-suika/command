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
