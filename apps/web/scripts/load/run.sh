#!/usr/bin/env bash
# Load test for textjs.org launch readiness. Run it from a remote box,
# against a preview deployment, never against textjs.org:
#
#   cd apps/web && bunx wrangler pages deploy dist --project-name textjs --branch load-test
#   BASE=https://load-test.textjs-avg.pages.dev bash scripts/load/run.sh [static|functions|all]
#
# Needs oha (https://github.com/hatoo/oha) on PATH or in $OHA, plus curl and jq.
#
# static     ramps a mix of prerendered pages, hashed assets, fonts and OG cards to 50 req/s:
#            10 req/s for 30 s, 25 req/s for 60 s, 50 req/s for 180 s (~10.8k requests).
# functions  stays small because Functions count as Workers requests: 600 browser loads of `/`
#            (the Function on `/` passes them through), 200 `curl /` (the ANSI frame) and 400
#            `/api/terminal/_status`, all at 10 req/s. It never load-tests `/api/terminal/*/api/*`,
#            which can reach api.terminal.shop; it only checks, with a handful of sequential reads,
#            that the signed-out catalogue is served from the edge cache.
set -euo pipefail
BASE=${BASE:?set BASE to a preview deployment, e.g. https://load-test.textjs-avg.pages.dev}
case $BASE in *textjs.org*) echo "refusing to load-test production ($BASE)" >&2; exit 2 ;; esac
OHA=${OHA:-$(command -v oha || echo "$HOME/bin/oha")}
MODE=${1:-all}
OUT=${OUT:-$(mktemp -d)}
UA_BROWSER="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36"

summary() {
  local name=$1 file=$2
  jq -r --arg name "$name" '
    def ms: . * 1000 | round;
    "\($name): \(.summary.total | round)s, \(.statusCodeDistribution | to_entries | map("\(.key)×\(.value)") | join(" ")), errors \(.errorDistribution | to_entries | map("\(.key)×\(.value)") | join(" ") | if . == "" then "none" else . end), rps \(.summary.requestsPerSec | . * 10 | round / 10), p50 \(.latencyPercentiles.p50 | ms) ms, p90 \(.latencyPercentiles.p90 | ms) ms, p99 \(.latencyPercentiles.p99 | ms) ms, max \(.summary.slowest | ms) ms"' "$file"
}

run() {
  local name=$1; shift
  "$OHA" --no-tui --output-format json "$@" > "$OUT/$name.json"
  summary "$name" "$OUT/$name.json"
}

static() {
  local urls=$OUT/static-urls.txt
  : > "$urls"
  for p in /playground /opencode /coffee /learn/routing /docs/routing /store /blog /status; do echo "$BASE$p" >> "$urls"; done
  curl -fsS -A "$UA_BROWSER" "$BASE/playground" | grep -oE '(href|src)="/(assets|fonts)/[^"]+"' | sed -E 's/^(href|src)="//; s/"$//' | sort -u | sed "s#^#$BASE#" >> "$urls"
  for p in /og.png /og/docs-routing.png /favicon.svg /api/v2/status.json /api/v2/incidents.json; do echo "$BASE$p" >> "$urls"; done
  echo "static mix: $(wc -l < "$urls") URLs"
  run static-10rps --urls-from-file -H "user-agent: $UA_BROWSER" -c 20 -q 10 -z 30s --latency-correction "$urls"
  run static-25rps --urls-from-file -H "user-agent: $UA_BROWSER" -c 40 -q 25 -z 60s --latency-correction "$urls"
  run static-50rps --urls-from-file -H "user-agent: $UA_BROWSER" -c 80 -q 50 -z 180s --latency-correction "$urls"
}

functions() {
  run home-browser -H "user-agent: $UA_BROWSER" -H "accept: text/html" -c 20 -q 10 -n 600 --latency-correction "$BASE/"
  run home-curl -H "user-agent: curl/8.7.1" -H "accept: */*" -c 20 -q 10 -n 200 --latency-correction "$BASE/"
  run terminal-status -H "user-agent: $UA_BROWSER" -c 20 -q 10 -n 400 --latency-correction "$BASE/api/terminal/_status"
  # Comparison: a prerendered page with no Function in front of it.
  run playground-static -H "user-agent: $UA_BROWSER" -H "accept: text/html" -c 20 -q 10 -n 300 --latency-correction "$BASE/playground"
  echo "catalogue (sequential, 10 reads):"
  for _ in $(seq 1 10); do curl -sS -o /dev/null -D - "$BASE/api/terminal/prod/api/product" | tr -d '\r' | awk -F': ' 'tolower($1)=="x-terminal-catalogue"{printf "%s ", $2}'; done
  echo
}

case $MODE in
  static) static ;;
  functions) functions ;;
  all) static; functions ;;
  *) echo "usage: $0 [static|functions|all]" >&2; exit 2 ;;
esac
echo "raw results: $OUT"
