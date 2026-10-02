#!/bin/sh
# 分割ソースを1枚のHTMLに結合する
cd "$(dirname "$0")"

# --- 本体 ---
cat src/00-head.html \
    src/10-logic.js \
    src/20-snd.js \
    src/30-view.js \
    src/40-input.js \
    src/50-store.js \
    src/95-boot.js \
    src/99-tail.html > command.html
cp command.html index.html   # GitHub Pages はルートの index.html を配信する

# --- 検証ページ ---
# 本体と同じく1枚に結合する（<script src> で隣を読むと表示環境によって読み込まれないため）。
cat src/verify-head.html \
    src/10-logic.js \
    src/verify-tests.js \
    src/99-tail.html > verify.html

echo "built command.html + index.html ($(wc -c < command.html) bytes)"
echo "built verify.html ($(wc -c < verify.html) bytes)"
