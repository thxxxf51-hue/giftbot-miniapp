#!/bin/sh
# Push changes to GitHub using the token from environment variable

if [ -z "$GITHUB_PERSONAL_ACCESS_TOKEN" ]; then
  echo "Error: GITHUB_PERSONAL_ACCESS_TOKEN is not set"
  exit 1
fi

REPO_URL="https://$GITHUB_PERSONAL_ACCESS_TOKEN@github.com/thxxxf51-hue/giftbot-miniapp.git"

git -c user.name="Replit Agent" \
    -c user.email="bot@replit.com" \
    add -A

git -c user.name="Replit Agent" \
    -c user.email="bot@replit.com" \
    commit -m "Update: admin panel SVG icons, card sizes, APP_URL fix" --allow-empty

git -c user.name="Replit Agent" \
    -c user.email="bot@replit.com" \
    push "$REPO_URL" main

echo "Done: pushed to GitHub"
