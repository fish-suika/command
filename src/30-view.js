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
function fitCommand() {
  const cmd = $('cmd');
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
      pop.textContent = s.combo + ' COMBO!';
      pop.classList.toggle('big', s.combo >= 30);
      restartAnim(pop, 'go');
    }
  } else if (ev === 'miss' || ev === 'start' || ev === 'end') {
    pop.classList.remove('go');
  }

  prevTier = tier;
  prevCombo = playing ? s.combo : 0;
}

// ev: press() の戻り値、または 'end' / null
function render(s, ev) {
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
      $('time-plus').textContent = '+' + CFG.GAUGE_BONUS / 1000 + 's';
      restartAnim($('time-plus'), 'go');
    }
    fitCommand();
    msg.textContent = '';
  } else if (s.phase === 'ready') {
    cmd.replaceChildren();
    msg.textContent = '表示された矢印を順に入力 ／ 矢印キーかボタンでスタート';
  } else {
    cmd.replaceChildren();
    msg.textContent = '';
  }

  if (s.phase !== 'result') cancelAnimationFrame(countAnim);
  $('result').hidden = s.phase !== 'result';
  if (s.phase === 'result') {
    if (ev === 'end') countUp($('r-score'), s.score, COUNT_UP_MS);
    else $('r-score').textContent = s.score.toLocaleString();
    $('r-acc').textContent = accuracy(s) + '%';
    $('r-inputs').textContent = s.inputs;
    $('r-miss').textContent = s.misses;
    $('r-combo').textContent = s.maxCombo + '  (×' + s.maxMult + ')';
    $('r-bonus').textContent = '+' + (s.boosts * CFG.GAUGE_BONUS / 1000) + 's';
  }
}
