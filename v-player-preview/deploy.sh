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

# 部署到 nichi-nichi/jing 的 v-player-preview 分支 (使用 HTTPS URL)
git push -f https://github.com/nichi-nichi/jing.git master:v-player-preview

cd -
