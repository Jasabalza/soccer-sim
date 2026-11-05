#!/bin/bash
# Re-record the golden files from the current engine (only after an intended behaviour change).
cd "$(dirname "$0")/.."
for a in "1 5" "2 9" "3 12"; do set -- $a; node tools/dump_js.js $1 $2 2>/dev/null | gzip -9 > golden/state_s$1.json.gz; done
node tools/api_js_run.js /tmp/api_new.json >/dev/null 2>&1 && gzip -9 -c /tmp/api_new.json > golden/api_crawl.json.gz && echo recorded
