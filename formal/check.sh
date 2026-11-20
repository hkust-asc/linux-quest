#!/usr/bin/env bash
set -euo pipefail

root=$(cd -- "$(dirname -- "$0")" && pwd)
model=${1:-}
variant=${2:-fixed}
case "$model:$variant" in
  Mission:fixed|Mission:reveal|Mission:leftover|Mission:identity|Mission:content|Mission:pipeline|\
  Shell:fixed|Shell:quotes|Shell:partial|\
  VFS:fixed|VFS:alias|VFS:root|\
  Audit:fixed|Audit:advance|Audit:execute) ;;
  *) echo 'Usage: bash formal/check.sh {Mission|Shell|VFS|Audit} [documented variant]' >&2; exit 64 ;;
esac
if [[ $(uname -s)-$(uname -m) != Linux-x86_64 ]]; then
  echo 'The pinned Java bootstrap supports Linux x86_64.' >&2
  exit 69
fi

cache=${XDG_CACHE_HOME:-$HOME/.cache}/linux-quest-formal
mkdir -p "$cache"
cache=$(cd -- "$cache" && pwd)
scratch=$(mktemp -d)
trap 'rm -rf -- "$scratch"' EXIT

fetch() {
  local url=$1 checksum=$2 destination=$3
  curl -fsSL --retry 2 -o "$destination" "$url"
  printf '%s  %s\n' "$checksum" "$destination" | sha256sum --check
}

jar=$cache/tla2tools-1.7.4.jar
jar_sha=936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88
if [[ ! -f $jar ]] || ! printf '%s  %s\n' "$jar_sha" "$jar" | sha256sum --check --status; then
  fetch https://github.com/tlaplus/tlaplus/releases/download/v1.7.4/tla2tools.jar "$jar_sha" "$scratch/tla2tools.jar"
  mv -- "$scratch/tla2tools.jar" "$jar"
fi

runtime=$cache/zulu21.44.17-ca-jre21.0.8-linux_x64
if [[ ! -x $runtime/bin/java ]]; then
  fetch https://cdn.azul.com/zulu/bin/zulu21.44.17-ca-jre21.0.8-linux_x64.tar.gz \
    0af24b31e3542ddd20e29f02c7dca46c1952db751843ae6b849534b257ecdd15 "$scratch/java.tar.gz"
  unpack=$(mktemp -d "$cache/.java.XXXXXXXX")
  tar -xzf "$scratch/java.tar.gz" -C "$unpack" --strip-components=1
  if ! mv -T -- "$unpack" "$runtime" 2>/dev/null; then
    [[ -x $runtime/bin/java ]]
    rm -rf -- "$unpack"
  fi
fi

cp "$root/$model/$model.tla" "$scratch/"
sed "s/Variant = \"fixed\"/Variant = \"$variant\"/" "$root/$model/$model.cfg" > "$scratch/$model.cfg"
cd -- "$scratch"
printf 'Model: %s (%s); TLC 1.7.4 / Zulu JRE 21.0.8\n' "$model" "$variant"
"$runtime/bin/java" -XX:+UseParallelGC -Xmx256m -cp "$jar" tlc2.TLC -workers 1 -seed 1 -fp 1 "$model.tla"
