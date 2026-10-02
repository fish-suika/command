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
  const note = d => 523.25 * 2 ** ((12 * Math.floor(d / 7) + MAJOR[d % 7]) / 12);
  // d より上で最初の「ド・ミ・ソ」。締めの音をここに置くと落ち着いて終わる
  const chordAbove = d => { let x = d + 1; while (![0, 2, 4].includes(x % 7)) x++; return x; };

  function beep(freq, dur, type, vol, when) {
    const a = unlock();
    if (!a) return;
    const t = a.currentTime + (when || 0);
    const o = a.createOscillator(), g = a.createGain();
    o.type = type || 'square';
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.06, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  return {
    unlock,
    // i: コマンド内の位置（0始まり）。打ち進むほど ド→レ→ミ… と上がる
    hit(i)  { beep(note(i || 0), 0.05); },
    // 最後の1打。i はその位置で、直前の打鍵音（i−1）より上の「ド・ミ・ソ」で鳴る。
    // 1音だけにする（和音にすると重なって聞こえた。倍率の段は画面の色で伝える）
    clear(i) { beep(note(chordAbove((i || 0) - 1)), 0.09, 'square', 0.07); },
    // 節目の3音。クリア音（0.09秒）が鳴り終わってから、その上の「ド・ミ・ソ」を3つ続ける
    milestone(i) {
      const a = chordAbove((i || 0) - 1), b = chordAbove(a), c = chordAbove(b), d = chordAbove(c);
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
  };
})();
