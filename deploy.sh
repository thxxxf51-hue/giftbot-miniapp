#!/bin/bash
# Auto-push to GitHub for Railway auto-deploy

set -e

MSG="${1:-Auto-deploy: update from Replit}"

git config user.email "bot@giftbot.app"
git config user.name "GiftBot Deploy"

# Set remote URL with token
REPO="thxxxf51-hue/giftbot-miniapp"
git remote set-url origin "https://${GITHUB_PERSONAL_ACCESS_TOKEN}@github.com/${REPO}.git"

git add -A
git diff --cached --quiet && echo "Nothing to commit" && exit 0

git commit -m "$MSG"
git push origin main

echo "Deployed to GitHub successfully"
