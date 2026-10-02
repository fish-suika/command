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
    // 最後の1打。i はその位置なので、直前の打鍵音より半音上で鳴る。
    // 1音だけにする（和音にすると重なって聞こえた。倍率の段は画面の色で伝える）
    clear(i) { beep(step(i), 0.09, 'square', 0.07); },
    // 節目の3音。クリア音（0.09秒）が鳴り終わってから、その音の上へ 長3度→5度→オクターブ と続ける
    milestone(i) {
      const root = step(i);
      beep(root * 1.26, 0.07, 'triangle', 0.09, 0.10);
      beep(root * 1.5,  0.07, 'triangle', 0.09, 0.17);
      beep(root * 2,    0.14, 'triangle', 0.09, 0.24);
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
