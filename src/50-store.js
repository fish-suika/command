// ===== 保存（localStorage。使えない環境でも遊べるよう、すべて try/catch） =====
// 自己ベストは制限時間モードごと。キーは command.best.<秒>（例 command.best.30）
const Store = {
  OLD_KEY: 'command.best',   // モード導入前のキー（30秒モードで記録したもの）
  key(limit) { return 'command.best.' + limit / 1000; },
  read(key) {
    const n = Number(localStorage.getItem(key));
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  },
  // 保存済みの自己ベスト。無い・壊れている・読めないときは 0
  loadBest(limit) {
    try {
      if (localStorage.getItem(this.key(limit)) === null && limit === 30000) {
        return this.read(this.OLD_KEY);   // 旧キーの値を30秒モードのベストとして引き継ぐ
      }
      return this.read(this.key(limit));
    } catch (e) { return 0; }
  },
  saveBest(limit, n) {
    try { localStorage.setItem(this.key(limit), String(n)); } catch (e) { /* 保存できなくても続行 */ }
  },
};
