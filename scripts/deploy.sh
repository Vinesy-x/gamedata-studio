#!/bin/sh
# Deploy script — build, publish to gh-pages, commit version bump, push
set -e

cd "$(git rev-parse --show-toplevel)"

VERSION=$(node -p "require('./package.json').version")

# Sync version to installer/setup.iss
if [ -f "installer/setup.iss" ]; then
  if [ "$(uname)" = "Darwin" ]; then
    sed -i '' "s/#define MyAppVersion \".*\"/#define MyAppVersion \"$VERSION\"/" installer/setup.iss
  else
    sed -i "s/#define MyAppVersion \".*\"/#define MyAppVersion \"$VERSION\"/" installer/setup.iss
  fi
fi

# Build
npx webpack --mode production

# Publish to gh-pages
npx gh-pages -d dist --dest . --add -m "Release v$VERSION"

# Commit version bump and push
git add package.json package-lock.json installer/setup.iss
git commit -m "release: v$VERSION"
git push

echo ""
echo "✓ v$VERSION deployed successfully"
