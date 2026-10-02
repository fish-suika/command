// ===== 保存（localStorage。使えない環境でも遊べるよう、すべて try/catch） =====
// 自己ベストは制限時間モードごと。キーは command.best.<秒>（例 command.best.30）
const Store = {
  OLD_KEY: 'command.best',   // モード導入前のキー（30秒モードで記録したもの）
  mem: {},                   // 保存できない環境でも、開いている間はモードを切り替えてもベストを覚えておく
  key(limit) { return 'command.best.' + limit / 1000; },
  read(key) {
    const n = Number(localStorage.getItem(key));
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  },
  // 保存済みの自己ベスト。無い・壊れている・読めないときは 0
  loadBest(limit) {
    let saved = 0;
    try {
      saved = localStorage.getItem(this.key(limit)) === null && limit === 30000
        ? this.read(this.OLD_KEY)   // 旧キーの値を30秒モードのベストとして引き継ぐ
        : this.read(this.key(limit));
    } catch (e) { /* 読めなければメモリの値だけ使う */ }
    return Math.max(saved, this.mem[limit] || 0);
  },
  saveBest(limit, n) {
    this.mem[limit] = n;
    try { localStorage.setItem(this.key(limit), String(n)); } catch (e) { /* 保存できなくても続行 */ }
  },
};
