// ===== 起動とループ =====
const S = createState();
let best = Store.loadBest(S.timeLimit);   // 選択中モードの自己ベスト（保存できない環境では 0 から）
let lastJudge = null;          // 直近の結果の judgeBest()
const info = () => ({ best, r: lastJudge });

// 残り5〜1秒の各秒の切り替わりで tick を鳴らす。
// 時間延長で秒数が増えたときは基準だけ更新し、鳴らさない（二重に鳴らさない）
let lastSec = Infinity;
function tickSound() {
  if (S.phase !== 'playing') { lastSec = Infinity; return; }
  const sec = Math.ceil(S.timeLeft / 1000);
  if (sec < lastSec && sec >= 1 && sec <= 5) Snd.tick();
  lastSec = sec;
}

// ゲーム終了時の処理。tick() / press() が 'end' を返したときだけ、ゲームごとに1回呼ぶ
function onEnd() {
  const r = judgeBest(S.score, best);
  lastJudge = r;
  if (r.isNew) { best = r.best; Store.saveBest(S.timeLimit, best); Snd.record(); }
  else Snd.end();
}

function onDir(dir) {
  Snd.unlock();
  const len = S.command.length;   // クリアすると press() の中で次のコマンドに替わるので先に取る
  const ev = press(S, dir, performance.now());
  if (ev === 'start') lastSec = Infinity;
  else if (ev === 'hit') Snd.hit(S.pos - 1);
  else if (ev === 'clear') {
    Snd.clear(len - 1);
    if (isComboMilestone(S.combo)) Snd.milestone(len - 1);   // boost と同時のときは boost だけ
  }
  else if (ev === 'boost') Snd.boost();
  else if (ev === 'miss') Snd.miss();
  else if (ev === 'end') onEnd();
  if (ev) render(S, ev, info());
}

function onRetry() {
  Snd.unlock();
  if (retry(S, performance.now())) { lastSec = Infinity; render(S, 'start', info()); }
}

function loop() {
  const now = performance.now();
  if (tick(S, now)) { onEnd(); render(S, 'end', info()); }
  else if (S.phase === 'playing') { renderTime(S); tickSound(); }
  if (S.phase === 'result') $('retry').classList.toggle('locked', !canRetry(S, now));
  requestAnimationFrame(loop);
}

// モード切替。ready / result のときだけ通る。ベストは選んだモードのものに読み直す
function onMode(limit) {
  Snd.unlock();
  if (!setMode(S, limit)) return;
  best = Store.loadBest(S.timeLimit);
  render(S, null, info());
}

bindInput(onDir, onRetry, onMode);
window.addEventListener('resize', () => { if (S.phase === 'playing') fitCommand(); });
render(S, null, info());
requestAnimationFrame(loop);
