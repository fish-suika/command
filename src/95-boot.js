// ===== 起動とループ =====
const S = createState();

// 残り5〜1秒の各秒の切り替わりで tick を鳴らす。
// 時間延長で秒数が増えたときは基準だけ更新し、鳴らさない（二重に鳴らさない）
let lastSec = Infinity;
function tickSound() {
  if (S.phase !== 'playing') { lastSec = Infinity; return; }
  const sec = Math.ceil(S.timeLeft / 1000);
  if (sec < lastSec && sec >= 1 && sec <= 5) Snd.tick();
  lastSec = sec;
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
  else if (ev === 'end') Snd.end();
  if (ev) render(S, ev);
}

function onRetry() {
  Snd.unlock();
  if (retry(S, performance.now())) { lastSec = Infinity; render(S, 'start'); }
}

function loop() {
  const now = performance.now();
  if (tick(S, now)) { Snd.end(); render(S, 'end'); }
  else if (S.phase === 'playing') { renderTime(S); tickSound(); }
  if (S.phase === 'result') $('retry').classList.toggle('locked', !canRetry(S, now));
  requestAnimationFrame(loop);
}

bindInput(onDir, onRetry);
window.addEventListener('resize', () => { if (S.phase === 'playing') fitCommand(); });
render(S, null);
requestAnimationFrame(loop);
