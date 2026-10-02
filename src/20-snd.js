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
  // 打鍵音の音階。最後の1打（クリア音）も同じ並びの続きで鳴らす。
  // 9個目の根音が 1047Hz（ド）に収まるよう 660Hz から始める
  const step = i => 660 * 2 ** ((i || 0) / 12);

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
    hit(i)  { beep(step(i), 0.05); },
    // 最後の1打。i はその位置なので、直前の打鍵音より半音上から鳴る。
    // tier: 倍率の段（0〜4）。段ごとに 長3度→5度→オクターブ→その上の3度 と1音ずつ足す分散和音
    // （以前は根音ごと上げて矩形波を同時に重ねたため、高い段で 2〜5kHz の濁った塊になっていた）
    clear(tier, i) {
      const n = 1 + Math.min(tier || 0, 4);
      const root = step(i);
      const notes = [1, 1.26, 1.5, 2, 2.52].slice(0, n).map(r => root * r);
      const vol = 0.09 / Math.sqrt(n);   // 音を重ねても全体の音量はほぼ一定
      beep(notes[0], 0.08, 'square', 0.06); // 根音は打鍵音と同じ音色で歯切れよく
      notes.slice(1).forEach((f, i) => beep(f, 0.12 + i * 0.02, 'triangle', vol, (i + 1) * 0.025));
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
