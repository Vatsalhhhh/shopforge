#!/bin/bash
# AUTOMATED MONITORING SCRIPT - DevOps Engineer
# CEO: Vatsal Solanki | Team: Billionaires
# Purpose: Continuous monitoring, alerting, and performance optimization

set -e

# ── CONFIGURATION ────────────────────────────────────────────────────────
MONITOR_DIR="./monitoring"
PROMETHEUS_DIR="$MONITOR_DIR/prometheus"
GRAFANA_DIR="$MONITOR_DIR/grafana"
ALERT_DIR="$MONITOR_DIR/alerts"
LOG_DIR="$MONITOR_DIR/logs"
METRICS_RETENTION=30d
ALERT_WEBHOOK="${SLACK_WEBHOOK:-}"

# ── LOGGING ───────────────────────────────────────────────────────────────
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] 📊 DEVOPS: $1"
}

log_error() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ❌ DEVOPS ERROR: $1" >&2
}

log_success() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ✅ DEVOPS SUCCESS: $1"
}

log_warning() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  DEVOPS WARNING: $1"
}

log_alert() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] 🚨 DEVOPS ALERT: $1" >&2
}

# ── SETUP MONITORING INFRASTRUCTURE ─────────────────────────────────────────
setup_monitoring() {
    log "Setting up monitoring infrastructure..."

    mkdir -p "$PROMETHEUS_DIR" "$GRAFANA_DIR" "$ALERT_DIR" "$LOG_DIR"

    # Create Prometheus configuration
    cat > "$PROMETHEUS_DIR/prometheus.yml" <<EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'shopforge'
    environment: '${ENVIRONMENT:-development}'

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

rule_files:
  - "$ALERT_DIR/*.yml"

scrape_configs:
  - job_name: 'backend'
    static_configs:
      - targets: ['backend:8000']
    metrics_path: '/metrics'

  - job_name: 'frontend'
    static_configs:
      - targets: ['frontend:3000']

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:5432']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']

  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']
EOF

    log_success "Prometheus configuration created"

    # Create alert rules
    cat > "$ALERT_DIR/alerts.yml" <<EOF
groups:
  - name: application
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors/second"

      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High latency detected"
          description: "95th percentile latency is {{ $value }} seconds"

      - alert: LowMemory
        expr: node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes < 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Low memory available"
          description: "Only {{ $value | humanizePercentage }} memory available"

      - alert: HighCPU
        expr: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage"
          description: "CPU usage is {{ $value }}%"

      - alert: DiskSpaceLow
        expr: (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100 < 10
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Low disk space"
          description: "Only {{ $value | humanizePercentage }} disk space available"

  - name: database
    rules:
      - alert: DatabaseConnectionPoolExhausted
        expr: pg_stat_activity_count / pg_settings_max_connections > 0.9
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Database connection pool exhausted"
          description: "{{ $value | humanizePercentage }} of connections used"

      - alert: DatabaseSlowQueries
        expr: rate(pg_stat_statements_calls_total[5m]) > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Database slow queries detected"
          description: "{{ $value }} queries/second"

  - name: business
    rules:
      - alert: OrderRateDrop
        expr: rate(orders_created_total[1h]) < rate(orders_created_total[1h] offset 1h) * 0.5
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "Order rate dropped significantly"
          description: "Current order rate is {{ $value | humanizePercentage }} of previous hour"

      - alert: PaymentFailureRate
        expr: rate(payments_failed_total[5m]) / rate(payments_total[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High payment failure rate"
          description: "Payment failure rate is {{ $value | humanizePercentage }}"
EOF

    log_success "Alert rules created"
}

# ── COLLECT METRICS ───────────────────────────────────────────────────────
collect_metrics() {
    log "Collecting system metrics..."

    METRICS_FILE="$LOG_DIR/metrics_$(date +%Y%m%d_%H%M%S).json"

    # CPU usage
    CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')

    # Memory usage
    MEMORY_INFO=$(free -m | grep Mem)
    TOTAL_MEMORY=$(echo $MEMORY_INFO | awk '{print $2}')
    USED_MEMORY=$(echo $MEMORY_INFO | awk '{print $3}')
    MEMORY_USAGE=$((USED_MEMORY * 100 / TOTAL_MEMORY))

    # Disk usage
    DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')

    # Docker container stats
    DOCKER_STATS=$(docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" 2>/dev/null)

    # Application metrics
    BACKEND_HEALTH=$(curl -s http://localhost:8000/api/v1/health 2>/dev/null || echo "unhealthy")
    FRONTEND_HEALTH=$(curl -s http://localhost:3000 2>/dev/null | head -1 || echo "unhealthy")

    # Generate metrics JSON
    cat > "$METRICS_FILE" <<EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "system": {
    "cpu_usage": $CPU_USAGE,
    "memory_usage": $MEMORY_USAGE,
    "disk_usage": $DISK_USAGE
  },
  "containers": {
    "backend": {
      "health": "$BACKEND_HEALTH",
      "stats": "$(echo "$DOCKER_STATS" | grep backend | awk '{print $2, $3}')"
    },
    "frontend": {
      "health": "$FRONTEND_HEALTH",
      "stats": "$(echo "$DOCKER_STATS" | grep frontend | awk '{print $2, $3}')"
    }
  }
}
EOF

    log_success "Metrics collected: $METRICS_FILE"
}

# ── CHECK HEALTH ───────────────────────────────────────────────────────────
check_health() {
    log "Checking system health..."

    HEALTH_REPORT="$LOG_DIR/health_$(date +%Y%m%d_%H%M%S).txt"

    {
        echo "═══════════════════════════════════════════════════════════════════════════════"
        echo "                        SYSTEM HEALTH REPORT"
        echo "═══════════════════════════════════════════════════════════════════════════════"
        echo "Date: $(date)"
        echo ""

        # Backend health
        echo "🔧 BACKEND:"
        if curl -f -s http://localhost:8000/api/v1/health > /dev/null 2>&1; then
            echo "   Status: ✅ Healthy"
            RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}\n' http://localhost:8000/api/v1/health)
            echo "   Response Time: ${RESPONSE_TIME}s"
        else
            echo "   Status: ❌ Unhealthy"
        fi
        echo ""

        # Frontend health
        echo "🎨 FRONTEND:"
        if curl -f -s http://localhost:3000 > /dev/null 2>&1; then
            echo "   Status: ✅ Healthy"
        else
            echo "   Status: ❌ Unhealthy"
        fi
        echo ""

        # Database health
        echo "🗄️  DATABASE:"
        if docker compose exec -T postgres pg_isready -U shopforge > /dev/null 2>&1; then
            echo "   Status: ✅ Healthy"
            CONNECTIONS=$(docker compose exec -T postgres psql -U shopforge -d shopforge -t -c "SELECT count(*) FROM pg_stat_activity;")
            echo "   Active Connections: $CONNECTIONS"
        else
            echo "   Status: ❌ Unhealthy"
        fi
        echo ""

        # Redis health
        echo "📦 REDIS:"
        if docker compose exec -T redis redis-cli ping > /dev/null 2>&1; then
            echo "   Status: ✅ Healthy"
            MEMORY=$(docker compose exec -T redis redis-cli INFO memory | grep used_memory_human | cut -d: -f2 | tr -d '\r')
            echo "   Memory Usage: $MEMORY"
        else
            echo "   Status: ❌ Unhealthy"
        fi
        echo ""

        # System resources
        echo "💻 SYSTEM RESOURCES:"
        echo "   CPU Usage: $(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')%"
        echo "   Memory Usage: $(free | grep Mem | awk '{printf("%.1f%%", $3/$2 * 100.0)}')"
        echo "   Disk Usage: $(df -h / | awk 'NR==2 {print $5}')"
        echo ""

        echo "═══════════════════════════════════════════════════════════════════════════════"
    } > "$HEALTH_REPORT"

    log_success "Health report generated: $HEALTH_REPORT"
}

# ── ANALYZE LOGS ───────────────────────────────────────────────────────────
analyze_logs() {
    log "Analyzing application logs..."

    LOG_ANALYSIS="$LOG_DIR/log_analysis_$(date +%Y%m%d_%H%M%S).txt"

    {
        echo "═══════════════════════════════════════════════════════════════════════════════"
        echo "                        LOG ANALYSIS REPORT"
        echo "═══════════════════════════════════════════════════════════════════════════════"
        echo "Date: $(date)"
        echo "Time Range: Last 1 hour"
        echo ""

        # Backend logs
        echo "🔧 BACKEND LOGS:"
        ERROR_COUNT=$(docker compose logs --since=1h backend 2>&1 | grep -i error | wc -l)
        WARNING_COUNT=$(docker compose logs --since=1h backend 2>&1 | grep -i warning | wc -l)
        INFO_COUNT=$(docker compose logs --since=1h backend 2>&1 | grep -i info | wc -l)

        echo "   Errors: $ERROR_COUNT"
        echo "   Warnings: $WARNING_COUNT"
        echo "   Info: $INFO_COUNT"

        if [ "$ERROR_COUNT" -gt 10 ]; then
            echo "   ⚠️  High error rate detected"
        fi
        echo ""

        # Frontend logs
        echo "🎨 FRONTEND LOGS:"
        FRONTEND_ERROR_COUNT=$(docker compose logs --since=1h frontend 2>&1 | grep -i error | wc -l)
        FRONTEND_WARNING_COUNT=$(docker compose logs --since=1h frontend 2>&1 | grep -i warning | wc -l)

        echo "   Errors: $FRONTEND_ERROR_COUNT"
        echo "   Warnings: $FRONTEND_WARNING_COUNT"
        echo ""

        # Recent errors
        if [ "$ERROR_COUNT" -gt 0 ]; then
            echo "🚨 RECENT ERRORS:"
            docker compose logs --since=1h backend 2>&1 | grep -i error | tail -5
            echo ""
        fi

        echo "═══════════════════════════════════════════════════════════════════════════════"
    } > "$LOG_ANALYSIS"

    log_success "Log analysis completed: $LOG_ANALYSIS"
}

# ── OPTIMIZE PERFORMANCE ───────────────────────────────────────────────────
optimize_performance() {
    log "Optimizing system performance..."

    OPTIMIZATION_REPORT="$LOG_DIR/optimization_$(date +%Y%m%d_%H%M%S).txt"

    {
        echo "═══════════════════════════════════════════════════════════════════════════════"
        echo "                    PERFORMANCE OPTIMIZATION REPORT"
        echo "═══════════════════════════════════════════════════════════════════════════════"
        echo "Date: $(date)"
        echo ""

        # Check Docker resource usage
        echo "🐳 DOCKER OPTIMIZATION:"
        docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"
        echo ""

        # Check for unused resources
        echo "🧹 CLEANUP RECOMMENDATIONS:"
        UNUSED_IMAGES=$(docker images -f "dangling=true" -q | wc -l)
        if [ "$UNUSED_IMAGES" -gt 0 ]; then
            echo "   - Remove $UNUSED_IMAGES dangling images: docker image prune"
        fi

        UNUSED_CONTAINERS=$(docker ps -a -f "status=exited" -q | wc -l)
        if [ "$UNUSED_CONTAINERS" -gt 0 ]; then
            echo "   - Remove $UNUSED_CONTAINERS stopped containers: docker container prune"
        fi

        UNUSED_VOLUMES=$(docker volume ls -f "dangling=true" -q | wc -l)
        if [ "$UNUSED_VOLUMES" -gt 0 ]; then
            echo "   - Remove $UNUSED_VOLUMES unused volumes: docker volume prune"
        fi
        echo ""

        # Database optimization
        echo "🗄️  DATABASE OPTIMIZATION:"
        echo "   - Run VACUUM ANALYZE: docker compose exec postgres psql -U shopforge -d shopforge -c 'VACUUM ANALYZE;'"
        echo "   - Check slow queries: docker compose exec postgres psql -U shopforge -d shopforge -c 'SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;'"
        echo ""

        # Redis optimization
        echo "📦 REDIS OPTIMIZATION:"
        echo "   - Check memory usage: docker compose exec redis redis-cli INFO memory"
        echo "   - Clear expired keys: docker compose exec redis redis-cli --scan --pattern '*' | xargs docker compose exec -T redis redis-cli DEL"
        echo ""

        echo "═══════════════════════════════════════════════════════════════════════════════"
    } > "$OPTIMIZATION_REPORT"

    log_success "Performance optimization report: $OPTIMIZATION_REPORT"
}

# ── SEND ALERTS ───────────────────────────────────────────────────────────
send_alert() {
    local severity=$1
    local message=$2

    log_alert "ALERT [$severity]: $message"

    # Send to webhook if configured
    if [ -n "$ALERT_WEBHOOK" ]; then
        curl -X POST "$ALERT_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{
                \"severity\": \"$severity\",
                \"message\": \"$message\",
                \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\",
                \"service\": \"shopforge\"
            }" 2>/dev/null || true
    fi
}

# ── CONTINUOUS MONITORING ─────────────────────────────────────────────────
continuous_monitoring() {
    log "Starting continuous monitoring..."

    while true; do
        log "Running monitoring cycle..."

        # Collect metrics
        collect_metrics

        # Check health
        check_health

        # Analyze logs
        analyze_logs

        # Check for critical issues
        ERROR_COUNT=$(docker compose logs --since=5m backend 2>&1 | grep -i error | wc -l)
        if [ "$ERROR_COUNT" -gt 20 ]; then
            send_alert "critical" "High error rate: $ERROR_COUNT errors in last 5 minutes"
        fi

        # Check service health
        if ! curl -f -s http://localhost:8000/api/v1/health > /dev/null 2>&1; then
            send_alert "critical" "Backend service is unhealthy"
        fi

        # Sleep for next cycle
        sleep 300  # 5 minutes
    done
}

# ── GENERATE MONITORING DASHBOARD ───────────────────────────────────────────
generate_dashboard() {
    log "Generating monitoring dashboard..."

    DASHBOARD_FILE="$MONITOR_DIR/dashboard.html"

    cat > "$DASHBOARD_FILE" <<'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>ShopForge Monitoring Dashboard</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .dashboard { max-width: 1200px; margin: 0 auto; }
        .header { background: #333; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .metric-card { background: white; padding: 20px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .metric-value { font-size: 2em; font-weight: bold; color: #333; }
        .metric-label { color: #666; font-size: 0.9em; }
        .status-healthy { color: #4CAF50; }
        .status-warning { color: #FF9800; }
        .status-critical { color: #F44336; }
        .logs { background: white; padding: 20px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .log-entry { padding: 10px; border-bottom: 1px solid #eee; }
        .log-error { color: #F44336; }
        .log-warning { color: #FF9800; }
        .log-info { color: #2196F3; }
    </style>
</head>
<body>
    <div class="dashboard">
        <div class="header">
            <h1>🚀 ShopForge Monitoring Dashboard</h1>
            <p>Real-time system monitoring and alerting</p>
        </div>

        <div class="metrics">
            <div class="metric-card">
                <div class="metric-value" id="cpu-usage">--%</div>
                <div class="metric-label">CPU Usage</div>
            </div>
            <div class="metric-card">
                <div class="metric-value" id="memory-usage">--%</div>
                <div class="metric-label">Memory Usage</div>
            </div>
            <div class="metric-card">
                <div class="metric-value" id="disk-usage">--%</div>
                <div class="metric-label">Disk Usage</div>
            </div>
            <div class="metric-card">
                <div class="metric-value status-healthy" id="backend-status">--</div>
                <div class="metric-label">Backend Status</div>
            </div>
            <div class="metric-card">
                <div class="metric-value status-healthy" id="frontend-status">--</div>
                <div class="metric-label">Frontend Status</div>
            </div>
            <div class="metric-card">
                <div class="metric-value" id="error-count">--</div>
                <div class="metric-label">Errors (1h)</div>
            </div>
        </div>

        <div class="logs">
            <h2>📋 Recent Logs</h2>
            <div id="logs-container">
                <p>Loading logs...</p>
            </div>
        </div>
    </div>

    <script>
        // Auto-refresh every 30 seconds
        setInterval(() => {
            location.reload();
        }, 30000);
    </script>
</body>
</html>
EOF

    log_success "Monitoring dashboard generated: $DASHBOARD_FILE"
}

# ── MAIN MONITORING EXECUTION ───────────────────────────────────────────────
main() {
    log "📊 Starting automated monitoring..."

    # Setup monitoring infrastructure
    setup_monitoring

    # Run monitoring tasks
    collect_metrics
    check_health
    analyze_logs
    optimize_performance
    generate_dashboard

    log_success "🎉 Monitoring cycle completed!"

    # Start continuous monitoring if requested
    if [ "$1" = "--monitor" ]; then
        continuous_monitoring
    fi
}

# ── EXECUTE ─────────────────────────────────────────────────────────────────
main "$@"
