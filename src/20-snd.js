// ===== 効果音（波形合成。ファイルなし） =====
const Snd = (() => {
  let ac = null;
  // 最初のユーザー入力で呼ぶ（自動再生制限のため）
  function unlock() {
    if (!ac) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ac = new C();
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  // 音はすべてハ長調（ドレミファソラシド）に揃える。
  // 以前は半音ずつ上げていて、半音階の上昇は緊迫・不安の響きになっていた。
  // d: ド(523Hz)から数えた音階の段（0=ド 1=レ 2=ミ … 7=1つ上のド）
  const MAJOR = [0, 2, 4, 5, 7, 9, 11];
  const mod7 = d => ((d % 7) + 7) % 7;   // 負の段（ドより下）でも 0〜6 に
  const note = d => 523.25 * 2 ** ((12 * Math.floor(d / 7) + MAJOR[mod7(d)]) / 12);
  // d より上で最初の「ド・ミ・ソ」。締めの音をここに置くと落ち着いて終わる
  const chordAbove = d => { let x = d + 1; while (![0, 2, 4].includes(mod7(x))) x++; return x; };
  const HIT_FROM = -7;   // 打鍵音の最初の音（−7 = ド(523Hz)の1オクターブ下）

  function beep(freq, dur, type, vol, when) {
    const a = unlock();
    if (!a) return;
    const t = a.currentTime + (when || 0);
    const o = a.createOscillator(), g = a.createGain();
    o.type = type || 'square';
    o.frequency.value = freq;
    // 0 から一瞬で最大にすると立ち上がりで「プツッ」と鳴るので、5ms かけて上げる
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol || 0.06, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  return {
    unlock,
    // i: コマンド内の位置（0始まり）。打ち進むほど ド→レ→ミ… と上がる。
    // コマンドは最大20個なので、1オクターブ下のド(262Hz)から始めて20個目でも高すぎないようにする
    // 本体は三角波（低い矩形波を短く鳴らすと「ブッ」という破裂音になった）。
    // 三角波だけだと低い音域でこもるので、2オクターブ上の矩形波を「低い音ほど多く」足して明るくする。
    // 上のド(1047Hz)以上は足さない（高い音に足すとキーンと刺さる）。どの高さでも明るさ・音量がほぼそろう
    hit(i) {
      const f = note((i || 0) + HIT_FROM);
      const w = Math.max(0, Math.min(1, (1047 - f) / (1047 - 262)));   // 低いド=1 〜 上のド=0
      beep(f, 0.08, 'triangle', 0.05 + 0.04 * (1 - w));
      if (w > 0.01) beep(f * 4, 0.08, 'square', 0.035 * w);
    },
    // 最後の1打も打鍵音とまったく同じ鳴らし方で、音階の次の音にする（本人の希望。
    // 音色や長さを変えたり「ド・ミ・ソ」へ飛ばしたりすると、最後だけ浮いて聞こえた）
    clear(i) { this.hit(i); },
    // 節目の3音。最後の1打が鳴り終わってから、その上の「ド・ミ・ソ」を3つ続ける
    milestone(i) {
      const b = chordAbove((i || 0) + HIT_FROM), c = chordAbove(b), d = chordAbove(c);
      beep(note(b), 0.07, 'triangle', 0.09, 0.10);
      beep(note(c), 0.07, 'triangle', 0.09, 0.17);
      beep(note(d), 0.14, 'triangle', 0.09, 0.24);
    },
    tick()  { beep(1800, 0.03, 'square', 0.04); },
    boost() { beep(note(11), 0.07, 'triangle', 0.1); beep(note(14), 0.12, 'triangle', 0.1, 0.07); }, // ソ→ド
    miss()  { beep(140, 0.15, 'sawtooth', 0.08); },
    end()   { // ド→ミ→ソ→ド
      beep(note(0), 0.12, 'triangle', 0.12); beep(note(2), 0.12, 'triangle', 0.12, 0.12);
      beep(note(4), 0.15, 'triangle', 0.12, 0.24); beep(note(7), 0.4, 'triangle', 0.12, 0.38);
    },
    // 自己ベスト更新: ド ミ ソ ド↑ ミ↑ ソ↑ ド↑↑（end() の代わりに鳴らす。ハ長調のみ）
    record() {
      [[0, 0], [2, 0.1], [4, 0.2], [7, 0.3], [9, 0.45], [11, 0.55]].forEach(([d, w]) => {
        beep(note(d), 0.12, 'triangle', 0.12, w);
      });
      beep(note(14), 0.6, 'triangle', 0.12, 0.65);
    },
  };
})();
