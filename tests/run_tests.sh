#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# ShopForge Automated Test Runner
# Usage:  ./tests/run_tests.sh [--api-only] [--e2e-only] [--headed]
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
REPORTS="$SCRIPT_DIR/reports"
RUN_API=true
RUN_E2E=true
HEADED=""

for arg in "$@"; do
  case $arg in
    --api-only)  RUN_E2E=false ;;
    --e2e-only)  RUN_API=false ;;
    --headed)    HEADED="--headed" ;;
  esac
done

# ── Colours ───────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'
ok()   { echo -e "  ${GREEN}✓${RESET} $*"; }
fail() { echo -e "  ${RED}✗${RESET} $*"; }
info() { echo -e "  ${CYAN}→${RESET} $*"; }
header() { echo -e "\n${BOLD}${CYAN}$*${RESET}"; }

mkdir -p "$REPORTS"

# ── Pre-flight: check services ────────────────────────────────────
header "━━━  Pre-flight checks  ━━━"
check_service() {
  local name=$1 url=$2
  if curl -sf "$url" > /dev/null 2>&1; then
    ok "$name is up at $url"
  else
    fail "$name is NOT reachable at $url — start it with: docker compose up -d"
    exit 1
  fi
}
check_service "Backend"  "http://localhost:8000/api/v1/health"
check_service "Frontend" "http://localhost:3000"

# ── Python environment ────────────────────────────────────────────
header "━━━  Python environment  ━━━"
VENV="$SCRIPT_DIR/.venv"
if [ ! -d "$VENV" ]; then
  info "Creating virtual environment…"
  python3 -m venv "$VENV"
fi
source "$VENV/bin/activate"
info "Installing Python test dependencies…"
pip install -q -r "$SCRIPT_DIR/requirements-test.txt"
ok "Python environment ready"

# ── API tests (pytest) ────────────────────────────────────────────
API_PASS=0; API_FAIL=0; API_TOTAL=0; API_DURATION=0
if $RUN_API; then
  header "━━━  API Tests (pytest)  ━━━"
  API_START=$(date +%s)
  set +e
  cd "$SCRIPT_DIR"
  pytest api/ -p no:cacheprovider 2>&1 | tee "$REPORTS/api-stdout.txt"
  PYTEST_EXIT=$?
  set -e
  API_END=$(date +%s)
  API_DURATION=$((API_END - API_START))

  if [ -f "$REPORTS/api-results.json" ]; then
    API_PASS=$(python3 -c "import json; d=json.load(open('$REPORTS/api-results.json')); s=d.get('summary',{}); print(s.get('passed',0))")
    API_FAIL=$(python3 -c "import json; d=json.load(open('$REPORTS/api-results.json')); s=d.get('summary',{}); print(s.get('failed',0)+s.get('error',0))")
    API_TOTAL=$(python3 -c "import json; d=json.load(open('$REPORTS/api-results.json')); s=d.get('summary',{}); print(s.get('total',0))")
  fi

  if [ $PYTEST_EXIT -eq 0 ]; then
    ok "API tests passed ($API_PASS/$API_TOTAL) in ${API_DURATION}s"
  else
    fail "API tests had failures ($API_FAIL failed / $API_TOTAL total) — see report"
  fi
fi

# ── E2E tests (Playwright) ────────────────────────────────────────
E2E_PASS=0; E2E_FAIL=0; E2E_TOTAL=0; E2E_DURATION=0
if $RUN_E2E; then
  header "━━━  E2E Tests (Playwright)  ━━━"
  cd "$SCRIPT_DIR/e2e"

  if [ ! -d "node_modules" ]; then
    info "Installing npm packages…"
    npm install --silent
  fi

  # Install browsers if not present
  if ! npx playwright install --dry-run chromium > /dev/null 2>&1; then
    info "Installing Playwright browsers…"
    npx playwright install chromium
  fi

  E2E_START=$(date +%s)
  set +e
  npx playwright test $HEADED 2>&1 | tee "$REPORTS/e2e-stdout.txt"
  PW_EXIT=$?
  set -e
  E2E_END=$(date +%s)
  E2E_DURATION=$((E2E_END - E2E_START))

  if [ -f "$REPORTS/e2e-results.json" ]; then
    E2E_PASS=$(python3 -c "import json; d=json.load(open('$REPORTS/e2e-results.json')); print(d.get('stats',{}).get('expected',0))")
    E2E_FAIL=$(python3 -c "import json; d=json.load(open('$REPORTS/e2e-results.json')); print(d.get('stats',{}).get('unexpected',0))")
    E2E_TOTAL=$(python3 -c "import json; d=json.load(open('$REPORTS/e2e-results.json')); print(d.get('stats',{}).get('expected',0)+d.get('stats',{}).get('unexpected',0)+d.get('stats',{}).get('skipped',0))")
  fi

  if [ $PW_EXIT -eq 0 ]; then
    ok "E2E tests passed ($E2E_PASS/$E2E_TOTAL) in ${E2E_DURATION}s"
  else
    fail "E2E tests had failures ($E2E_FAIL failed / $E2E_TOTAL total) — see report"
  fi
fi

# ── Generate summary HTML ─────────────────────────────────────────
header "━━━  Generating visual summary  ━━━"
python3 "$SCRIPT_DIR/generate_summary.py" \
  --api-pass "$API_PASS" --api-fail "$API_FAIL" --api-total "$API_TOTAL" --api-duration "$API_DURATION" \
  --e2e-pass "$E2E_PASS" --e2e-fail "$E2E_FAIL" --e2e-total "$E2E_TOTAL" --e2e-duration "$E2E_DURATION" \
  --run-api "$RUN_API" --run-e2e "$RUN_E2E" \
  --output "$REPORTS/summary.html"
ok "Summary report → $REPORTS/summary.html"

# ── Final banner ──────────────────────────────────────────────────
echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD}  Test Results Summary${RESET}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
if $RUN_API; then
  ICON="$( [ "$API_FAIL" -eq 0 ] && echo "${GREEN}✓${RESET}" || echo "${RED}✗${RESET}" )"
  echo -e "  API Tests   $ICON  ${GREEN}${API_PASS} passed${RESET}  ${RED}${API_FAIL} failed${RESET}  (${API_TOTAL} total, ${API_DURATION}s)"
fi
if $RUN_E2E; then
  ICON="$( [ "$E2E_FAIL" -eq 0 ] && echo "${GREEN}✓${RESET}" || echo "${RED}✗${RESET}" )"
  echo -e "  E2E Tests   $ICON  ${GREEN}${E2E_PASS} passed${RESET}  ${RED}${E2E_FAIL} failed${RESET}  (${E2E_TOTAL} total, ${E2E_DURATION}s)"
fi
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""
echo -e "${BOLD}Reports:${RESET}"
$RUN_API && echo "  API  →  file://$REPORTS/api-report.html"
$RUN_E2E && echo "  E2E  →  file://$REPORTS/e2e-report/index.html"
echo "  Sum  →  file://$REPORTS/summary.html"
echo ""

# Auto-open summary on macOS
if command -v open &>/dev/null; then
  open "$REPORTS/summary.html" 2>/dev/null || true
fi

# Exit non-zero if any tests failed
TOTAL_FAIL=$((API_FAIL + E2E_FAIL))
exit $TOTAL_FAIL
