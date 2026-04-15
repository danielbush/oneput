#!/bin/sh
#
# Install tracked git hooks into .git/hooks/. Idempotent.
#
# GitButler owns .git/hooks/pre-commit and delegates to pre-commit-user,
# so we install our hook as pre-commit-user to stay out of its way.
#

set -e

REPO_ROOT=$(git rev-parse --show-toplevel)
SRC="$REPO_ROOT/scripts/hooks/pre-commit-user"
DEST="$REPO_ROOT/.git/hooks/pre-commit-user"

if [ ! -f "$SRC" ]; then
    echo "Source hook not found: $SRC"
    exit 1
fi

ln -sf "$SRC" "$DEST"
chmod +x "$SRC"
echo "Installed: $DEST -> $SRC"
