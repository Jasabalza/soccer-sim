#!/bin/bash
# Run after any engine change. Intentional behaviour changes need new golden files (tools/make_golden.sh).
cd "$(dirname "$0")/.." && node tools/build.js >/dev/null || exit 1
T=${TMPDIR:-/tmp}; fail=0
for a in "1 5" "2 9" "3 12"; do set -- $a
  node tools/dump_js.js $1 $2 > $T/js_s$1.json 2>/dev/null; zcat golden/state_s$1.json.gz > $T/gold_s$1.json
  r=$(python3 tools/cmp.py $T/gold_s$1.json $T/js_s$1.json | tail -1); echo "state seed $1: $r"; [[ "$r" == *IDENTICAL* ]] || fail=1
done
node tools/api_js_run.js $T/api_js.json >/dev/null 2>&1; zcat golden/api_crawl.json.gz > $T/api_gold.json
r=$(python3 golden/api_cmp.py $T/api_gold.json $T/api_js.json | tail -1); echo "api: $r"; [[ "$r" == *"differing 0"* ]] || fail=1
echo "order independence:"; node tools/t_order.js > $T/order.txt; sed 's/^/  /' $T/order.txt; grep -q DIFFERENT $T/order.txt && fail=1
echo "tournament single games, any order:"; node tools/t_order2.js 1,2 5 > $T/order2.txt; sed 's/^/  /' $T/order2.txt; grep -q DIFFERENT $T/order2.txt && fail=1
node tools/t_games_api.js > $T/games_api.txt 2>&1; tail -1 $T/games_api.txt | sed 's/^/  games api: /'; grep -q "ALL OK" $T/games_api.txt || fail=1
[ $fail = 0 ] && echo "ALL CHECKS PASSED" || echo "CHECKS FAILED"
