#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ "$#" -gt 0 ]]; then
  TARGET_ROOTS=("$@")
else
  TARGET_ROOTS=()
  for candidate in "$ROOT_DIR/.agents/skills" "$ROOT_DIR/.claude/skills" "$ROOT_DIR/.trae/skills"; do
    [[ -d "$candidate" ]] && TARGET_ROOTS+=("$candidate")
  done
fi

if [[ "${#TARGET_ROOTS[@]}" -eq 0 ]]; then
  echo "No local skill roots found. Pass one or more target roots, for example:"
  echo "  scripts/sync-local-skills.sh /path/to/project/.agents/skills"
  exit 0
fi

sync_skill() {
  local source_dir="$1"
  local skill_name="$2"
  local target_root="$3"
  local target_dir="$target_root/$skill_name"

  mkdir -p "$target_dir"
  rsync -a --delete \
    --exclude '.DS_Store' \
    --exclude 'node_modules' \
    --exclude '.pnpm' \
    --exclude 'config/qiniu-config.json' \
    "$ROOT_DIR/$source_dir/" "$target_dir/"
  echo "synced $skill_name -> $target_dir"
}

for target_root in "${TARGET_ROOTS[@]}"; do
  mkdir -p "$target_root"
  sync_skill "blog-orchestrator" "blog-orchestrator" "$target_root"
  sync_skill "content-creator" "content-creator" "$target_root"
  sync_skill "content-checker" "content-checker" "$target_root"
  sync_skill "xiaohongshu-content-creator" "xiaohongshu-content-creator" "$target_root"
  sync_skill "xiaohongshu-image-creator" "xiaohongshu-image-creator" "$target_root"
  sync_skill "gen-cover-skill" "generate-cover" "$target_root"
  sync_skill "qiniu-kodo" "qiniu-kodo" "$target_root"
done
