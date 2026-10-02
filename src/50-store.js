// ===== 保存（localStorage。使えない環境でも遊べるよう、すべて try/catch） =====
const Store = {
  KEY: 'command.best',
  // 保存済みの自己ベスト。無い・壊れている・読めないときは 0
  loadBest() {
    try {
      const n = Number(localStorage.getItem(this.KEY));
      return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
    } catch (e) { return 0; }
  },
  saveBest(n) {
    try { localStorage.setItem(this.KEY, String(n)); } catch (e) { /* 保存できなくても続行 */ }
  },
};
