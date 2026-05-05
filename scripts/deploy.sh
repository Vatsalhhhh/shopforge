#!/bin/bash
# AUTOMATED DEPLOYMENT SCRIPT - DevOps Engineer
# CEO: Vatsal Solanki | Team: Billionaires
# Purpose: Zero-touch deployment with automated rollback

set -e  # Exit on error
set -o pipefail  # Catch errors in pipes

# ── CONFIGURATION ────────────────────────────────────────────────────────
DEPLOY_ENV=${DEPLOY_ENV:-production}
APP_NAME="shopforge"
BACKEND_DIR="./backend"
FRONTEND_DIR="./frontend"
HEALTH_CHECK_URL="http://localhost:8000/api/v1/health"
HEALTH_CHECK_TIMEOUT=300  # 5 minutes
ROLLBACK_ON_FAILURE=true

# ── LOGGING ───────────────────────────────────────────────────────────────
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

log_error() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ❌ ERROR: $1" >&2
}

log_success() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ✅ SUCCESS: $1"
}

log_warning() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  WARNING: $1"
}

# ── PRE-DEPLOYMENT CHECKS ─────────────────────────────────────────────────
pre_deploy_checks() {
    log "Running pre-deployment checks..."

    # Check if required tools are installed
    command -v docker >/dev/null 2>&1 || { log_error "Docker not installed"; exit 1; }
    command -v git >/dev/null 2>&1 || { log_error "Git not installed"; exit 1; }

    # Check if we're on the correct branch
    CURRENT_BRANCH=$(git branch --show-current)
    if [ "$DEPLOY_ENV" = "production" ] && [ "$CURRENT_BRANCH" != "main" ]; then
        log_error "Production deployment must be from main branch (current: $CURRENT_BRANCH)"
        exit 1
    fi

    # Check for uncommitted changes
    if [ -n "$(git status --porcelain)" ]; then
        log_warning "Uncommitted changes detected"
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_error "Deployment cancelled"
            exit 1
        fi
    fi

    log_success "Pre-deployment checks passed"
}

# ── BACKUP CURRENT DEPLOYMENT ───────────────────────────────────────────────
backup_deployment() {
    log "Creating backup of current deployment..."

    BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"

    # Backup database
    if docker ps | grep -q postgres; then
        log "Backing up database..."
        docker compose exec -T postgres pg_dump -U shopforge shopforge > "$BACKUP_DIR/database.sql"
        log_success "Database backup created: $BACKUP_DIR/database.sql"
    fi

    # Backup current images
    log "Backing up Docker images..."
    docker save shopforge-backend:latest > "$BACKUP_DIR/backend.tar" 2>/dev/null || true
    docker save shopforge-frontend:latest > "$BACKUP_DIR/frontend.tar" 2>/dev/null || true

    log_success "Backup completed: $BACKUP_DIR"
}

# ── BUILD APPLICATIONS ───────────────────────────────────────────────────────
build_applications() {
    log "Building applications..."

    # Build backend
    log "Building backend..."
    cd "$BACKEND_DIR"
    docker build -t "${APP_NAME}-backend:latest" .
    cd ..
    log_success "Backend built successfully"

    # Build frontend
    log "Building frontend..."
    cd "$FRONTEND_DIR"
    docker build -t "${APP_NAME}-frontend:latest" .
    cd ..
    log_success "Frontend built successfully"
}

# ── RUN MIGRATIONS ───────────────────────────────────────────────────────────
run_migrations() {
    log "Running database migrations..."

    if docker compose exec backend alembic upgrade head; then
        log_success "Migrations completed successfully"
    else
        log_error "Migration failed"
        return 1
    fi
}

# ── DEPLOY APPLICATIONS ───────────────────────────────────────────────────────
deploy_applications() {
    log "Deploying applications..."

    # Stop current services gracefully
    log "Stopping current services..."
    docker compose down

    # Start new services
    log "Starting new services..."
    docker compose up -d

    log_success "Applications deployed"
}

# ── HEALTH CHECKS ────────────────────────────────────────────────────────────
health_checks() {
    log "Running health checks..."

    local elapsed=0
    local interval=5

    while [ $elapsed -lt $HEALTH_CHECK_TIMEOUT ]; do
        if curl -f -s "$HEALTH_CHECK_URL" > /dev/null 2>&1; then
            log_success "Health check passed"
            return 0
        fi

        log "Waiting for services to be healthy... (${elapsed}s/${HEALTH_CHECK_TIMEOUT}s)"
        sleep $interval
        elapsed=$((elapsed + interval))
    done

    log_error "Health check failed after ${HEALTH_CHECK_TIMEOUT}s"
    return 1
}

# ── ROLLBACK ─────────────────────────────────────────────────────────────────
rollback() {
    log_error "Initiating rollback..."

    # Stop failed deployment
    docker compose down

    # Restore from backup
    LATEST_BACKUP=$(ls -t ./backups/ | head -1)
    if [ -n "$LATEST_BACKUP" ]; then
        log "Restoring from backup: $LATEST_BACKUP"

        # Restore database
        if [ -f "./backups/$LATEST_BACKUP/database.sql" ]; then
            docker compose up -d postgres
            sleep 10
            docker compose exec -T postgres psql -U shopforge shopforge < "./backups/$LATEST_BACKUP/database.sql"
        fi

        # Load previous images
        if [ -f "./backups/$LATEST_BACKUP/backend.tar" ]; then
            docker load < "./backups/$LATEST_BACKUP/backend.tar"
        fi
        if [ -f "./backups/$LATEST_BACKUP/frontend.tar" ]; then
            docker load < "./backups/$LATEST_BACKUP/frontend.tar"
        fi

        # Start services
        docker compose up -d

        log_success "Rollback completed"
    else
        log_error "No backup found for rollback"
        exit 1
    fi
}

# ── POST-DEPLOYMENT ─────────────────────────────────────────────────────────
post_deploy() {
    log "Running post-deployment tasks..."

    # Clear Redis cache
    log "Clearing Redis cache..."
    docker compose exec redis redis-cli FLUSHALL

    # Warm up cache
    log "Warming up cache..."
    curl -s "http://localhost:8000/api/v1/products" > /dev/null

    log_success "Post-deployment tasks completed"
}

# ── NOTIFICATIONS ───────────────────────────────────────────────────────────
send_notification() {
    local status=$1
    local message=$2

    log "Sending notification: $status - $message"

    # Add your notification service here (Slack, Discord, Email, etc.)
    # Example: curl -X POST "$SLACK_WEBHOOK" -d "{\"text\":\"$message\"}"
}

# ── MAIN DEPLOYMENT FLOW ───────────────────────────────────────────────────
main() {
    log "🚀 Starting automated deployment..."
    log "Environment: $DEPLOY_ENV"
    log "Branch: $(git branch --show-current)"
    log "Commit: $(git rev-parse --short HEAD)"

    # Pre-deployment checks
    pre_deploy_checks || exit 1

    # Backup current deployment
    backup_deployment

    # Build applications
    build_applications || { rollback; exit 1; }

    # Deploy applications
    deploy_applications || { rollback; exit 1; }

    # Run migrations
    run_migrations || { rollback; exit 1; }

    # Health checks
    if ! health_checks; then
        if [ "$ROLLBACK_ON_FAILURE" = true ]; then
            rollback
            send_notification "FAILED" "Deployment failed and rolled back"
            exit 1
        else
            log_warning "Health check failed but rollback disabled"
            send_notification "WARNING" "Deployment completed with health check failures"
        fi
    fi

    # Post-deployment tasks
    post_deploy

    # Success notification
    log_success "🎉 Deployment completed successfully!"
    send_notification "SUCCESS" "Deployment completed successfully"

    # Display deployment info
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📊 DEPLOYMENT SUMMARY"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Environment: $DEPLOY_ENV"
    echo "Backend: http://localhost:8000"
    echo "Frontend: http://localhost:3000"
    echo "API Docs: http://localhost:8000/api/docs"
    echo "Health: $HEALTH_CHECK_URL"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# ── EXECUTE ─────────────────────────────────────────────────────────────────
main "$@"
