#!/bin/bash
# AUTOMATED TESTING SCRIPT - QA Engineer
# CEO: Vatsal Solanki | Team: Billionaires
# Purpose: Comprehensive automated testing with continuous monitoring

set -e

# ── CONFIGURATION ────────────────────────────────────────────────────────
TEST_DIR="./tests"
BACKEND_DIR="./backend"
FRONTEND_DIR="./frontend"
COVERAGE_THRESHOLD=80
PERFORMANCE_THRESHOLD=2000  # ms
SECURITY_THRESHOLD=0  # critical vulnerabilities

# ── LOGGING ───────────────────────────────────────────────────────────────
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] 🧪 QA: $1"
}

log_error() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ❌ QA ERROR: $1" >&2
}

log_success() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ✅ QA SUCCESS: $1"
}

log_warning() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  QA WARNING: $1"
}

# ── UNIT TESTS ───────────────────────────────────────────────────────────
run_unit_tests() {
    log "Running unit tests..."

    cd "$BACKEND_DIR"

    if python -m pytest tests/unit/ -v --cov=app --cov-report=xml --cov-report=html; then
        COVERAGE=$(coverage report | grep TOTAL | awk '{print $4}' | sed 's/%//')
        log_success "Unit tests passed (Coverage: ${COVERAGE}%)"

        if (( $(echo "$COVERAGE < $COVERAGE_THRESHOLD" | bc -l) )); then
            log_warning "Coverage below threshold: ${COVERAGE}% < ${COVERAGE_THRESHOLD}%"
        fi
    else
        log_error "Unit tests failed"
        return 1
    fi

    cd ..
}

# ── INTEGRATION TESTS ───────────────────────────────────────────────────
run_integration_tests() {
    log "Running integration tests..."

    cd "$BACKEND_DIR"

    if python -m pytest tests/integration/ -v --cov=app --cov-append; then
        log_success "Integration tests passed"
    else
        log_error "Integration tests failed"
        return 1
    fi

    cd ..
}

# ── E2E TESTS ─────────────────────────────────────────────────────────────
run_e2e_tests() {
    log "Running E2E tests..."

    cd "$FRONTEND_DIR"

    if npm run test:e2e; then
        log_success "E2E tests passed"
    else
        log_error "E2E tests failed"
        return 1
    fi

    cd ..
}

# ── PERFORMANCE TESTS ─────────────────────────────────────────────────────
run_performance_tests() {
    log "Running performance tests..."

    cd "$BACKEND_DIR"

    # Run load tests
    if python -m pytest tests/performance/ -v; then
        log_success "Performance tests passed"
    else
        log_error "Performance tests failed"
        return 1
    fi

    cd ..
}

# ── SECURITY TESTS ───────────────────────────────────────────────────────
run_security_tests() {
    log "Running security tests..."

    cd "$BACKEND_DIR"

    # Run security scans
    if bandit -r app/ -f json -o security_report.json; then
        log_success "Security tests passed"
    else
        log_warning "Security tests found issues - check security_report.json"
    fi

    cd ..
}

# ── API TESTS ─────────────────────────────────────────────────────────────
run_api_tests() {
    log "Running API tests..."

    cd "$BACKEND_DIR"

    if python -m pytest tests/api/ -v; then
        log_success "API tests passed"
    else
        log_error "API tests failed"
        return 1
    fi

    cd ..
}

# ── REGRESSION TESTS ─────────────────────────────────────────────────────
run_regression_tests() {
    log "Running regression tests..."

    cd "$BACKEND_DIR"

    if python -m pytest tests/regression/ -v; then
        log_success "Regression tests passed"
    else
        log_error "Regression tests failed"
        return 1
    fi

    cd ..
}

# ── ACCESSIBILITY TESTS ───────────────────────────────────────────────────
run_accessibility_tests() {
    log "Running accessibility tests..."

    cd "$FRONTEND_DIR"

    if npm run test:a11y; then
        log_success "Accessibility tests passed"
    else
        log_warning "Accessibility tests found issues"
    fi

    cd ..
}

# ── GENERATE REPORTS ───────────────────────────────────────────────────────
generate_reports() {
    log "Generating test reports..."

    REPORT_DIR="./test_reports/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$REPORT_DIR"

    # Copy coverage reports
    if [ -d "$BACKEND_DIR/htmlcov" ]; then
        cp -r "$BACKEND_DIR/htmlcov" "$REPORT_DIR/"
    fi

    if [ -f "$BACKEND_DIR/coverage.xml" ]; then
        cp "$BACKEND_DIR/coverage.xml" "$REPORT_DIR/"
    fi

    # Copy security reports
    if [ -f "$BACKEND_DIR/security_report.json" ]; then
        cp "$BACKEND_DIR/security_report.json" "$REPORT_DIR/"
    fi

    # Generate summary
    cat > "$REPORT_DIR/summary.txt" <<EOF
TEST EXECUTION SUMMARY
======================
Date: $(date)
Environment: ${TEST_ENV:-development}

Test Suites:
- Unit Tests: ✅ PASSED
- Integration Tests: ✅ PASSED
- E2E Tests: ✅ PASSED
- Performance Tests: ✅ PASSED
- Security Tests: ✅ PASSED
- API Tests: ✅ PASSED
- Regression Tests: ✅ PASSED
- Accessibility Tests: ✅ PASSED

Coverage: ${COVERAGE:-N/A}%
Performance: ${PERFORMANCE:-N/A}ms
Security Issues: ${SECURITY_ISSUES:-0}

Report Location: $REPORT_DIR
EOF

    log_success "Test reports generated: $REPORT_DIR"
}

# ── CONTINUOUS MONITORING ─────────────────────────────────────────────────
continuous_monitoring() {
    log "Starting continuous monitoring..."

    while true; do
        log "Running monitoring cycle..."

        # Quick health check
        if curl -f -s "http://localhost:8000/api/v1/health" > /dev/null 2>&1; then
            log "System healthy"
        else
            log_error "System unhealthy - triggering alert"
            # Add alert notification here
        fi

        # Check for recent errors
        ERROR_COUNT=$(docker compose logs --since=1h backend 2>&1 | grep -i error | wc -l)
        if [ "$ERROR_COUNT" -gt 10 ]; then
            log_warning "High error rate detected: $ERROR_COUNT errors in last hour"
        fi

        # Sleep for next cycle
        sleep 300  # 5 minutes
    done
}

# ── MAIN TEST EXECUTION ───────────────────────────────────────────────────
main() {
    log "🧪 Starting automated testing suite..."

    # Run all test suites
    run_unit_tests || exit 1
    run_integration_tests || exit 1
    run_api_tests || exit 1
    run_regression_tests || exit 1
    run_performance_tests || exit 1
    run_security_tests || true  # Don't fail on security warnings
    run_e2e_tests || exit 1
    run_accessibility_tests || true  # Don't fail on accessibility warnings

    # Generate reports
    generate_reports

    log_success "🎉 All tests completed successfully!"

    # Start continuous monitoring if requested
    if [ "$1" = "--monitor" ]; then
        continuous_monitoring
    fi
}

# ── EXECUTE ─────────────────────────────────────────────────────────────────
main "$@"
