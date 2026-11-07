#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

mkdir -p "$tmp/locale"
rsync -a --include='*/' --include='*.mo' --exclude='*' "$root/locale/" "$tmp/locale/"

cd "$root"
gnome-extensions pack --extra-source=widgets --extra-source=stylesheet.css --extra-source="$tmp/locale"
