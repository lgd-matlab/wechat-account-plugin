#!/bin/bash
# Script to create a GitHub release for Obsidian plugin

# Get version from manifest.json
VERSION=$(grep '"version"' manifest.json | sed 's/.*"version": "\(.*\)".*/\1/')

echo "Creating release for version $VERSION"

# Create and push tag
git tag -a "$VERSION" -m "Release $VERSION"
git push origin "$VERSION"

echo "Tag $VERSION created and pushed!"
echo ""
echo "Next steps:"
echo "1. Go to: https://github.com/lgd-matlab/wechat-account-plugin/releases/new"
echo "2. Select tag: $VERSION"
echo "3. Set release title: $VERSION"
echo "4. Add release notes"
echo "5. Upload these files as assets:"
echo "   - main.js"
echo "   - manifest.json"
echo "   - styles.css"
echo "6. Click 'Publish release'"
