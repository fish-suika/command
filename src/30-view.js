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
