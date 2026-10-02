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

test('clearScore: 矢印1個あたりの基本点×長さ', () => {
  eq(clearScore(2), 200); eq(clearScore(9), 900);
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
  eq(s.score, 200); eq(s.gauge, 1);
  eq(s.command, ['U', 'U']); eq(s.pos, 0);
});

test('ミスでスコアが MISS_PENALTY 減り、コンボが切れる', () => {
  const s = createState(); press(s, 'U', 0, R0);
  press(s, 'U', 100, R0); press(s, 'U', 200, R0); // クリア
  const before = s.score;
  eq(press(s, 'L', 300, R0), 'miss');
  eq(s.score, before - CFG.MISS_PENALTY);
  eq(s.combo, 0); eq(s.maxCombo, 1);
  eq(s.gauge, 0);
});

test('5回クリアするとコマンドが3個になる', () => {
  const s = createState(); press(s, 'U', 0, R0);
  let t = 0;
  for (let c = 0; c < 5; c++) { while (true) { t += 10; const ev = press(s, 'U', t, R0); if (ev === 'clear' || ev === 'boost') break; } }
  eq(s.cleared, 5); eq(s.command.length, 3);
});

// 1コマンド分（長さに関わらず 'U' を押し続ける）を入力して最後の戻り値を返す
function clearOne(s, tRef) {
  while (true) { tRef.t += 10; const ev = press(s, 'U', tRef.t, R0); if (ev !== 'hit') return ev; }
}

test('10回連続クリアで時間が GAUGE_BONUS 増え、ゲージが空になる', () => {
  const s = createState(); press(s, 'U', 0, R0);
  const T = { t: 0 };
  for (let i = 0; i < 9; i++) eq(clearOne(s, T), 'clear', String(i));
  eq(s.gauge, 9); eq(s.endAt, CFG.TIME_LIMIT); eq(s.boosts, 0);
  eq(clearOne(s, T), 'boost');
  eq(s.gauge, 0); eq(s.boosts, 1); eq(s.endAt, CFG.TIME_LIMIT + CFG.GAUGE_BONUS);
});

test('ミスするとゲージが0に戻り、満タンまでやり直し', () => {
  const s = createState(); press(s, 'U', 0, R0);
  const T = { t: 0 };
  for (let i = 0; i < 5; i++) clearOne(s, T);
  eq(s.gauge, 5);
  eq(press(s, 'D', T.t + 10, R0), 'miss'); T.t += 10;
  eq(s.gauge, 0);
  for (let i = 0; i < 9; i++) eq(clearOne(s, T), 'clear', String(i));
  eq(s.boosts, 0);
  eq(clearOne(s, T), 'boost');
  eq(s.boosts, 1);
});

test('延長した分だけ時間切れが遅れる', () => {
  const s = createState(); press(s, 'U', 0, R0);
  const T = { t: 0 };
  for (let i = 0; i < 10; i++) clearOne(s, T);
  eq(s.boosts, 1);
  eq(tick(s, CFG.TIME_LIMIT), false); eq(s.phase, 'playing');
  eq(tick(s, CFG.TIME_LIMIT + CFG.GAUGE_BONUS), true);
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
  eq(s.gauge, 0); eq(s.boosts, 0);
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
