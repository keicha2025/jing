#!/bin/bash
set -e
rm -rf dist_release
mkdir -p dist_release

# Cleanup individual project dist folders to avoid stale artifacts
rm -rf finance/dist
rm -rf pdf-tool/dist
rm -rf preview/dist
rm -rf v-player-preview/dist
rm -rf caselog/dist
rm -rf travel-planner/frontend/dist

echo "Building pdf-tool..."
cd pdf-tool
npm install
npm run build
cd ..
mkdir -p dist_release/pdf-tool
cp -r pdf-tool/dist/* dist_release/pdf-tool/

echo "Building preview..."
cd preview
npm install
npm run build
cd ..
mkdir -p dist_release/preview
cp -r preview/dist/* dist_release/preview/

echo "Building v-player-preview..."
cd v-player-preview
npm install
npm run build
cd ..
mkdir -p dist_release/v-player-preview
cp -r v-player-preview/dist/* dist_release/v-player-preview/

echo "Building caselog..."
cd caselog
npm install --legacy-peer-deps
npm run build
cd ..
mkdir -p dist_release/caselog
cp -r caselog/dist/* dist_release/caselog/

echo "Building travel-planner..."
cd travel-planner/frontend
npm install
npm run build
cd ../..
mkdir -p dist_release/travel-planner
cp -r travel-planner/frontend/dist/* dist_release/travel-planner/

echo "Building finance..."
cd finance
npm install
npm run build
cd ..
mkdir -p dist_release/finance
cp -r finance/dist/finance/* dist_release/finance/

echo "Copying static assets..."
cp -r nightwhisper dist_release/
cp -r note dist_release/
cp -r mail dist_release/
cp index.html nagoya.html okinawa.html okinawa-1.html tesuuryo.html jing-lab-appicon.png jing-lab-appicon.ico manifest.json sw.js dist_release/

echo "Deploying to Firebase..."
npx -y firebase-tools deploy --only hosting --project gen-lang-client-0428297574
