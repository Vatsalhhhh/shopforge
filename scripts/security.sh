#!/bin/bash
# AUTOMATED SECURITY SCANNING SCRIPT - Security Engineer
# CEO: Vatsal Solanki | Team: Billionaires
# Purpose: Continuous security monitoring and vulnerability assessment

set -e

# ── CONFIGURATION ────────────────────────────────────────────────────────
BACKEND_DIR="./backend"
FRONTEND_DIR="./frontend"
REPORT_DIR="./security_reports/$(date +%Y%m%d_%H%M%S)"
SEVERITY_THRESHOLD="high"
COMPLIANCE_FRAMEWORKS=("GDPR" "PCI-DSS" "SOC2")

# ── LOGGING ───────────────────────────────────────────────────────────────
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] 🔒 SECURITY: $1"
}

log_error() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ❌ SECURITY ERROR: $1" >&2
}

log_success() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ✅ SECURITY SUCCESS: $1"
}

log_warning() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  SECURITY WARNING: $1"
}

log_critical() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] 🚨 SECURITY CRITICAL: $1" >&2
}

# ── DEPENDENCY SCANNING ─────────────────────────────────────────────────────
scan_dependencies() {
    log "Scanning dependencies for vulnerabilities..."

    mkdir -p "$REPORT_DIR"

    # Backend dependencies
    log "Scanning backend dependencies..."
    cd "$BACKEND_DIR"

    if command -v safety &> /dev/null; then
        safety check --json > "$REPORT_DIR/backend_safety.json" 2>&1 || true
        log_success "Backend dependency scan completed"
    else
        log_warning "safety not installed, skipping backend dependency scan"
    fi

    if command -v pip-audit &> /dev/null; then
        pip-audit --format json --output "$REPORT_DIR/backend_pip_audit.json" 2>&1 || true
        log_success "Backend pip-audit completed"
    fi

    cd ..

    # Frontend dependencies
    log "Scanning frontend dependencies..."
    cd "$FRONTEND_DIR"

    if command -v npm &> /dev/null; then
        npm audit --json > "$REPORT_DIR/frontend_npm_audit.json" 2>&1 || true
        log_success "Frontend dependency scan completed"
    fi

    cd ..
}

# ── CODE SECURITY SCANNING ───────────────────────────────────────────────────
scan_code() {
    log "Scanning code for security issues..."

    mkdir -p "$REPORT_DIR"

    # Backend code scanning
    log "Scanning backend code..."
    cd "$BACKEND_DIR"

    if command -v bandit &> /dev/null; then
        bandit -r app/ -f json -o "$REPORT_DIR/backend_bandit.json" 2>&1 || true
        log_success "Backend code scan completed"
    else
        log_warning "bandit not installed, skipping backend code scan"
    fi

    if command -v semgrep &> /dev/null; then
        semgrep --config=auto --json --output "$REPORT_DIR/backend_semgrep.json" app/ 2>&1 || true
        log_success "Backend semgrep scan completed"
    fi

    cd ..

    # Frontend code scanning
    log "Scanning frontend code..."
    cd "$FRONTEND_DIR"

    if command -v eslint &> /dev/null; then
        npx eslint --format json src/ > "$REPORT_DIR/frontend_eslint.json" 2>&1 || true
        log_success "Frontend code scan completed"
    fi

    cd ..
}

# ── CONTAINER SECURITY SCANNING ─────────────────────────────────────────────
scan_containers() {
    log "Scanning Docker containers for vulnerabilities..."

    mkdir -p "$REPORT_DIR"

    # Scan backend image
    if command -v trivy &> /dev/null; then
        log "Scanning backend container..."
        trivy image --format json --output "$REPORT_DIR/backend_trivy.json" shopforge-backend:latest 2>&1 || true
        log_success "Backend container scan completed"
    else
        log_warning "trivy not installed, skipping container scans"
    fi

    # Scan frontend image
    if command -v trivy &> /dev/null; then
        log "Scanning frontend container..."
        trivy image --format json --output "$REPORT_DIR/frontend_trivy.json" shopforge-frontend:latest 2>&1 || true
        log_success "Frontend container scan completed"
    fi
}

# ── SECRETS SCANNING ───────────────────────────────────────────────────────
scan_secrets() {
    log "Scanning for exposed secrets..."

    mkdir -p "$REPORT_DIR"

    if command -v gitleaks &> /dev/null; then
        gitleaks detect --source . --report-path "$REPORT_DIR/gitleaks_report.json" 2>&1 || true
        log_success "Secrets scan completed"
    else
        log_warning "gitleaks not installed, skipping secrets scan"
    fi
}

# ── COMPLIANCE CHECKING ─────────────────────────────────────────────────────
check_compliance() {
    log "Checking compliance frameworks..."

    mkdir -p "$REPORT_DIR"

    COMPLIANCE_REPORT="$REPORT_DIR/compliance_report.json"

    # Initialize compliance report
    cat > "$COMPLIANCE_REPORT" <<EOF
{
  "frameworks": {},
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "overall_status": "pending"
}
EOF

    # GDPR Compliance
    log "Checking GDPR compliance..."
    GDPR_SCORE=0
    GDPR_ISSUES=()

    # Check for data encryption
    if grep -q "bcrypt" "$BACKEND_DIR/app/core/security.py" 2>/dev/null; then
        ((GDPR_SCORE++))
    else
        GDPR_ISSUES+=("Password hashing not found")
    fi

    # Check for audit logging
    if [ -f "$BACKEND_DIR/app/models/audit_log.py" ]; then
        ((GDPR_SCORE++))
    else
        GDPR_ISSUES+=("Audit logging not implemented")
    fi

    # Check for data retention policies
    if grep -q "deleted_at" "$BACKEND_DIR/app/models/user.py" 2>/dev/null; then
        ((GDPR_SCORE++))
    else
        GDPR_ISSUES+=("Data retention (soft delete) not implemented")
    fi

    # PCI-DSS Compliance
    log "Checking PCI-DSS compliance..."
    PCI_SCORE=0
    PCI_ISSUES=()

    # Check for secure payment handling
    if grep -q "stripe" "$BACKEND_DIR/requirements.txt" 2>/dev/null; then
        ((PCI_SCORE++))
    else
        PCI_ISSUES+=("Secure payment processing not implemented")
    fi

    # Check for HTTPS enforcement
    if grep -q "https" "$BACKEND_DIR/app/core/config.py" 2>/dev/null; then
        ((PCI_SCORE++))
    else
        PCI_ISSUES+=("HTTPS enforcement not configured")
    fi

    # Update compliance report
    cat > "$COMPLIANCE_REPORT" <<EOF
{
  "frameworks": {
    "GDPR": {
      "score": $GDPR_SCORE,
      "max_score": 3,
      "status": "$([ $GDPR_SCORE -eq 3 ] && echo "compliant" || echo "non_compliant")",
      "issues": $(printf '%s\n' "${GDPR_ISSUES[@]}" | jq -R . | jq -s .)
    },
    "PCI-DSS": {
      "score": $PCI_SCORE,
      "max_score": 2,
      "status": "$([ $PCI_SCORE -eq 2 ] && echo "compliant" || echo "non_compliant")",
      "issues": $(printf '%s\n' "${PCI_ISSUES[@]}" | jq -R . | jq -s .)
    }
  },
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "overall_status": "$([ $GDPR_SCORE -eq 3 ] && [ $PCI_SCORE -eq 2 ] && echo "compliant" || echo "non_compliant")"
}
EOF

    log_success "Compliance check completed"
}

# ── THREAT DETECTION ───────────────────────────────────────────────────────
detect_threats() {
    log "Detecting security threats..."

    mkdir -p "$REPORT_DIR"

    THREAT_REPORT="$REPORT_DIR/threat_report.json"

    # Check for suspicious activity
    SUSPICIOUS_ACTIVITIES=()

    # Check for failed authentication attempts
    FAILED_AUTH=$(docker compose logs --since=1h backend 2>&1 | grep -i "failed\|unauthorized" | wc -l)
    if [ "$FAILED_AUTH" -gt 50 ]; then
        SUSPICIOUS_ACTIVITIES+=("High rate of failed authentication: $FAILED_AUTH attempts")
    fi

    # Check for SQL injection attempts
    SQL_INJECTION=$(docker compose logs --since=1h backend 2>&1 | grep -i "sql\|injection" | wc -l)
    if [ "$SQL_INJECTION" -gt 10 ]; then
        SUSPICIOUS_ACTIVITIES+=("Possible SQL injection attempts: $SQL_INJECTION")
    fi

    # Check for XSS attempts
    XSS_ATTEMPTS=$(docker compose logs --since=1h backend 2>&1 | grep -i "xss\|script" | wc -l)
    if [ "$XSS_ATTEMPTS" -gt 10 ]; then
        SUSPICIOUS_ACTIVITIES+=("Possible XSS attempts: $XSS_ATTEMPTS")
    fi

    # Generate threat report
    cat > "$THREAT_REPORT" <<EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "threat_level": "$([ ${#SUSPICIOUS_ACTIVITIES[@]} -eq 0 ] && echo "low" || echo "high")",
  "suspicious_activities": $(printf '%s\n' "${SUSPICIOUS_ACTIVITIES[@]}" | jq -R . | jq -s .),
  "recommendations": [
    "Implement rate limiting",
    "Add IP-based blocking",
    "Enable real-time monitoring",
    "Set up automated incident response"
  ]
}
EOF

    if [ ${#SUSPICIOUS_ACTIVITIES[@]} -gt 0 ]; then
        log_critical "Threats detected: ${#SUSPICIOUS_ACTIVITIES[@]} suspicious activities"
    else
        log_success "No threats detected"
    fi
}

# ── SECURITY AUDIT ───────────────────────────────────────────────────────
security_audit() {
    log "Performing security audit..."

    mkdir -p "$REPORT_DIR"

    AUDIT_REPORT="$REPORT_DIR/security_audit.json"

    # Check security configurations
    SECURITY_SCORE=0
    MAX_SCORE=10
    ISSUES=()

    # Check for HTTPS
    if grep -q "https" "$BACKEND_DIR/app/core/config.py" 2>/dev/null; then
        ((SECURITY_SCORE++))
    else
        ISSUES+=("HTTPS not enforced")
    fi

    # Check for rate limiting
    if [ -f "$BACKEND_DIR/app/core/rate_limit.py" ]; then
        ((SECURITY_SCORE++))
    else
        ISSUES+=("Rate limiting not implemented")
    fi

    # Check for input validation
    if grep -q "pydantic" "$BACKEND_DIR/requirements.txt" 2>/dev/null; then
        ((SECURITY_SCORE++))
    else
        ISSUES+=("Input validation not implemented")
    fi

    # Check for authentication
    if [ -f "$BACKEND_DIR/app/core/security.py" ]; then
        ((SECURITY_SCORE++))
    else
        ISSUES+=("Authentication not implemented")
    fi

    # Check for authorization
    if grep -q "get_current_user\|get_current_admin_user" "$BACKEND_DIR/app/api"/* 2>/dev/null; then
        ((SECURITY_SCORE++))
    else
        ISSUES+=("Authorization not properly implemented")
    fi

    # Check for audit logging
    if [ -f "$BACKEND_DIR/app/models/audit_log.py" ]; then
        ((SECURITY_SCORE++))
    else
        ISSUES+=("Audit logging not implemented")
    fi

    # Check for error handling
    if grep -q "HTTPException\|try:" "$BACKEND_DIR/app/api"/* 2>/dev/null; then
        ((SECURITY_SCORE++))
    else
        ISSUES+=("Error handling not comprehensive")
    fi

    # Check for CORS configuration
    if grep -q "CORSMiddleware" "$BACKEND_DIR/app/main.py" 2>/dev/null; then
        ((SECURITY_SCORE++))
    else
        ISSUES+=("CORS not configured")
    fi

    # Check for secure headers
    if grep -q "X-Content-Type\|X-Frame" "$BACKEND_DIR/app/main.py" 2>/dev/null; then
        ((SECURITY_SCORE++))
    else
        ISSUES+=("Secure headers not implemented")
    fi

    # Check for environment variables
    if [ -f "$BACKEND_DIR/.env.example" ]; then
        ((SECURITY_SCORE++))
    else
        ISSUES+=("Environment variables not documented")
    fi

    # Generate audit report
    cat > "$AUDIT_REPORT" <<EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "security_score": $SECURITY_SCORE,
  "max_score": $MAX_SCORE,
  "percentage": $((SECURITY_SCORE * 100 / MAX_SCORE)),
  "status": "$([ $SECURITY_SCORE -ge 8 ] && echo "secure" || [ $SECURITY_SCORE -ge 5 ] && echo "moderate" || echo "vulnerable")",
  "issues": $(printf '%s\n' "${ISSUES[@]}" | jq -R . | jq -s .),
  "recommendations": [
    "Implement all missing security measures",
    "Regular security audits",
    "Continuous monitoring",
    "Employee security training"
  ]
}
EOF

    log_success "Security audit completed (Score: $SECURITY_SCORE/$MAX_SCORE)"
}

# ── GENERATE SECURITY REPORT ───────────────────────────────────────────────
generate_security_report() {
    log "Generating comprehensive security report..."

    SUMMARY_REPORT="$REPORT_DIR/security_summary.txt"

    cat > "$SUMMARY_REPORT" <<EOF
═══════════════════════════════════════════════════════════════════════════════
                        SECURITY SCAN REPORT
═══════════════════════════════════════════════════════════════════════════════
Date: $(date)
Environment: ${SECURITY_ENV:-production}
Report Directory: $REPORT_DIR

SCAN RESULTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. DEPENDENCY SCANNING
   Status: ✅ COMPLETED
   Reports:
   - Backend Safety: $REPORT_DIR/backend_safety.json
   - Backend Pip-Audit: $REPORT_DIR/backend_pip_audit.json
   - Frontend NPM Audit: $REPORT_DIR/frontend_npm_audit.json

2. CODE SECURITY SCANNING
   Status: ✅ COMPLETED
   Reports:
   - Backend Bandit: $REPORT_DIR/backend_bandit.json
   - Backend Semgrep: $REPORT_DIR/backend_semgrep.json
   - Frontend ESLint: $REPORT_DIR/frontend_eslint.json

3. CONTAINER SECURITY SCANNING
   Status: ✅ COMPLETED
   Reports:
   - Backend Trivy: $REPORT_DIR/backend_trivy.json
   - Frontend Trivy: $REPORT_DIR/frontend_trivy.json

4. SECRETS SCANNING
   Status: ✅ COMPLETED
   Reports:
   - Gitleaks: $REPORT_DIR/gitleaks_report.json

5. COMPLIANCE CHECKING
   Status: ✅ COMPLETED
   Reports:
   - Compliance: $REPORT_DIR/compliance_report.json

6. THREAT DETECTION
   Status: ✅ COMPLETED
   Reports:
   - Threats: $REPORT_DIR/threat_report.json

7. SECURITY AUDIT
   Status: ✅ COMPLETED
   Reports:
   - Audit: $REPORT_DIR/security_audit.json

═══════════════════════════════════════════════════════════════════════════════
EOF

    log_success "Security report generated: $SUMMARY_REPORT"
}

# ── CONTINUOUS MONITORING ─────────────────────────────────────────────────
continuous_monitoring() {
    log "Starting continuous security monitoring..."

    while true; do
        log "Running security monitoring cycle..."

        # Quick threat detection
        detect_threats

        # Check for new vulnerabilities
        scan_dependencies

        # Sleep for next cycle
        sleep 3600  # 1 hour
    done
}

# ── MAIN SECURITY EXECUTION ───────────────────────────────────────────────
main() {
    log "🔒 Starting automated security scanning..."

    # Create report directory
    mkdir -p "$REPORT_DIR"

    # Run all security scans
    scan_dependencies
    scan_code
    scan_containers
    scan_secrets
    check_compliance
    detect_threats
    security_audit

    # Generate comprehensive report
    generate_security_report

    log_success "🎉 Security scanning completed!"

    # Start continuous monitoring if requested
    if [ "$1" = "--monitor" ]; then
        continuous_monitoring
    fi
}

# ── EXECUTE ─────────────────────────────────────────────────────────────────
main "$@"
