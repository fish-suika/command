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
    // i: コマンド内の位置（0始まり）。打ち進むほど半音ずつ上がる
    hit(i)  { beep(880 * 2 ** ((i || 0) / 12), 0.05); },
    // tier: 倍率の段（0〜4）。上がるほど高く、和音が厚くなる
    clear(tier) {
      const t = tier || 0, base = 1320 * 2 ** (t / 6);
      beep(base, 0.08);
      if (t >= 1) beep(base * 1.25, 0.1, 'square', 0.04);
      if (t >= 2) beep(base * 1.5, 0.1, 'square', 0.04);
      if (t >= 3) beep(base * 2, 0.12, 'triangle', 0.06);
      if (t >= 4) beep(base * 2.5, 0.14, 'triangle', 0.06);
    },
    // 節目表示に合わせた明るい3音（クリア音のあとに続く）
    milestone() {
      beep(1047, 0.08, 'triangle', 0.09, 0.06);
      beep(1319, 0.08, 'triangle', 0.09, 0.12);
      beep(1568, 0.16, 'triangle', 0.09, 0.18);
    },
    tick()  { beep(1800, 0.03, 'square', 0.04); },
    boost() { beep(1320, 0.07, 'triangle', 0.1); beep(1760, 0.12, 'triangle', 0.1, 0.07); },
    miss()  { beep(140, 0.15, 'sawtooth', 0.08); },
    end()   {
      beep(660, 0.12, 'triangle', 0.12); beep(880, 0.12, 'triangle', 0.12, 0.12);
      beep(1100, 0.15, 'triangle', 0.12, 0.24); beep(1320, 0.4, 'triangle', 0.12, 0.38);
    },
  };
})();
