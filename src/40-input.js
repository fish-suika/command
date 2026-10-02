// ===== 入力（キーボードとタッチを onDir / onRetry に集約） =====
// e.code で判定する（日本語入力ON でも WASD が効くように）
const KEYMAP = {
  ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R',
  KeyW: 'U', KeyS: 'D', KeyA: 'L', KeyD: 'R',
};

function bindInput(onDir, onRetry, onMode) {
  window.addEventListener('keydown', e => {
    if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') {
      e.preventDefault();
      if (!e.repeat) onRetry();
      return;
    }
    const m = /^(?:Digit|Numpad)([123])$/.exec(e.code);
    if (m) {
      e.preventDefault();
      if (!e.repeat) onMode(CFG.MODES[m[1] - 1]);
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
  document.querySelectorAll('.modes button').forEach(b => {
    b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); onMode(Number(b.dataset.limit)); });
  });
  $('retry').addEventListener('pointerdown', e => { e.preventDefault(); onRetry(); });
  window.addEventListener('contextmenu', e => e.preventDefault()); // 長押しメニューを出さない
}
