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
