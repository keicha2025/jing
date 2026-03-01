#!/bin/bash
set -e
mkdir -p dist_release

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

echo "Building travel-planner..."
cd travel-planner/frontend
npm install
npm run build
cd ../..
mkdir -p dist_release/travel-planner
cp -r travel-planner/frontend/dist/* dist_release/travel-planner/

echo "Copying static assets..."
cp -r nightwhisper dist_release/
cp -r note dist_release/
cp -r mail dist_release/
cp index.html nagoya.html okinawa.html okinawa-1.html tesuuryo.html jing-lab-appicon.png jing-lab-appicon.ico manifest.json sw.js dist_release/

echo "Deploying to Firebase..."
npx -y firebase-tools deploy --only hosting --project gen-lang-client-0428297574
