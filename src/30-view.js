// ===== 描画 =====
const ARROW = { U: '↑', D: '↓', L: '←', R: '→' };
const $ = id => document.getElementById(id);

function renderTime(s) {
  const t = $('time');
  t.textContent = (s.timeLeft / 1000).toFixed(1);
  t.classList.toggle('low', s.phase === 'playing' && s.timeLeft <= 10000);
}

// 最大サイズで実際に並べて幅を測り、はみ出す分だけ縮める
// （矢印の字幅はフォントで違うので、長さからの計算だと小さくなりすぎた）
const CMD_MAX = 120;
const CMD_COLS = 10;   // 1段に並べる数。11個以上は2段にする（1行に詰めると小さくて読めない）
function fitCommand() {
  const cmd = $('cmd');
  const n = cmd.children.length;
  cmd.style.setProperty('--cols', Math.min(n, CMD_COLS) || 1);
  // 1段なら字幅のまま詰めて大きく見せる。2段なら上下の列がそろうよう、
  // 一番幅の広い ← → （約0.87文字ぶん）に合わせた均等なマスにする
  cmd.style.setProperty('--colw', n > CMD_COLS ? '.87em' : 'auto');
  const w = $('stage').clientWidth * 0.92; // 次の1個の scale(1.15) ぶんの余白
  cmd.style.setProperty('--cmd-size', CMD_MAX + 'px');
  const need = cmd.scrollWidth;
  if (need > w) cmd.style.setProperty('--cmd-size', Math.floor(CMD_MAX * w / need) + 'px');
}

function restartAnim(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth; // アニメーションを最初から再生させる
  el.classList.add(cls);
}

// 倍率の表示（×1.5 / ×2 …）
function multText(combo) { return '×' + comboMult(combo); }

// 数字を 0 から to まで ms かけて増やす。RESULT_LOCK（0.6秒）より短くすること
let countAnim = 0;
function countUp(el, to, ms) {
  cancelAnimationFrame(countAnim);
  const t0 = performance.now();
  const step = now => {
    const p = Math.min(1, (now - t0) / ms);
    el.textContent = Math.round(to * p).toLocaleString();
    if (p < 1) countAnim = requestAnimationFrame(step);
  };
  countAnim = requestAnimationFrame(step);
}
const COUNT_UP_MS = 500;

// 演出の「前回の状態」。段の上昇・スコア増加・コンボ切れの検出に使う
let prevTier = 0, prevCombo = 0;

// コンボ関連の演出（HUD・節目・輪・背景）
function renderCombo(s, ev) {
  const playing = s.phase === 'playing';
  const tier = playing ? comboTier(s.combo) : 0;
  $('app').dataset.tier = tier;   // --tier-color と背景の濃さが切り替わる

  const mult = $('mult');
  mult.hidden = tier === 0;
  if (tier > 0) mult.textContent = multText(s.combo);
  if (tier > prevTier) restartAnim(mult, 'up');

  if (ev === 'miss' && prevCombo >= 2) restartAnim($('combo'), 'lose');

  const pop = $('combo-pop');
  if (ev === 'clear' || ev === 'boost') {
    restartAnim($('ring'), 'go');
    restartAnim($('score'), 'bump');
    if (isComboMilestone(s.combo)) {
      pop.textContent = s.combo + 'コンボ！';
      pop.classList.toggle('big', s.combo >= 30);
      restartAnim(pop, 'go');
    }
  } else if (ev === 'miss' || ev === 'start' || ev === 'end') {
    pop.classList.remove('go');
  }

  prevTier = tier;
  prevCombo = playing ? s.combo : 0;
}

// 自己ベストの表示（結果画面の SCORE の下）。r = judgeBest() の結果
function renderBest(r) {
  const el = $('r-best');
  el.replaceChildren();
  if (!r || r.best === 0) return;   // まだベストが無い（0点で終えた初回）ときは何も出さない
  if (r.isNew) {
    const n = document.createElement('span');
    n.className = 'rec';
    n.textContent = '自己ベスト更新！';
    el.appendChild(n);
    return;
  }
  el.appendChild(document.createTextNode('ベスト ' + r.best.toLocaleString()));
  if (r.diff > 0) {
    el.appendChild(document.createElement('br'));
    el.appendChild(document.createTextNode('ベストまで あと ' + r.diff.toLocaleString()));
  }
}

// ev: press() の戻り値、または 'end' / null
// info: { best: 保存済みの自己ベスト, r: 直近の judgeBest() の結果 }（省略可）
function render(s, ev, info) {
  info = info || { best: 0, r: null };
  $('score').textContent = s.score.toLocaleString();
  $('combo').textContent = s.combo;
  renderTime(s);
  renderCombo(s, ev);
  $('gauge-fill').style.width = (s.gauge / CFG.GAUGE_MAX * 100) + '%';

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
    if (ev === 'clear' || ev === 'boost' || ev === 'start') restartAnim(cmd, 'pop');
    if (ev === 'boost') {
      restartAnim($('time'), 'boost');
      $('time-plus').textContent = '+' + CFG.GAUGE_BONUS / 1000 + '秒';
      restartAnim($('time-plus'), 'go');
    }
    fitCommand();
    msg.textContent = '';
    $('ready-sub').textContent = '';
  } else if (s.phase === 'ready') {
    cmd.replaceChildren();
    msg.replaceChildren('表示された矢印を順に入力', document.createElement('br'), '矢印キー／ボタンでスタート');
    const sub = $('ready-sub');
    sub.replaceChildren('1・2・3 キーでも切替');
    if (info.best > 0) {
      const b = document.createElement('span');
      b.className = 'best';
      b.textContent = 'ベスト ' + info.best.toLocaleString();
      sub.appendChild(b);
    }
  } else {
    cmd.replaceChildren();
    msg.textContent = '';
    $('ready-sub').textContent = '';
  }

  $('modes-ready').hidden = s.phase !== 'ready';
  document.querySelectorAll('.modes button').forEach(b => {
    b.classList.toggle('on', Number(b.dataset.limit) === s.timeLimit);
  });
  if (s.phase !== 'result') cancelAnimationFrame(countAnim);
  $('result').hidden = s.phase !== 'result';
  if (s.phase === 'result') {
    if (ev === 'end') countUp($('r-score'), s.score, COUNT_UP_MS);
    else $('r-score').textContent = s.score.toLocaleString();
    renderBest(info.r);
    $('r-acc').textContent = accuracy(s) + '%';
    $('r-inputs').textContent = s.inputs;
    $('r-miss').textContent = s.misses;
    $('r-combo').textContent = s.maxCombo + '（×' + s.maxMult + '）';
    $('r-bonus').textContent = '+' + (s.boosts * CFG.GAUGE_BONUS / 1000) + '秒';
  }
}
