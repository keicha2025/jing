#!/usr/bin/env sh

# 發生錯誤時終止
set -e

# 建置
npm run build

# 切換到 dist 目錄
cd dist

# 初始化 git
git init
git add -A
git commit -m 'deploy v-player'

# 部署到 keicha2025/jing 的 v-player-preview 分支
git push -f https://github.com/keicha2025/jing.git main:v-player-preview

cd -
