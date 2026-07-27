#!/bin/bash
set -euo pipefail

# Production Deployment Script for CodRoom
# Usage: ./deploy.sh [staging|production] [version]

ENVIRONMENT=${1:-production}
VERSION=${2:-latest}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Configuration
REGISTRY="ghcr.io"
IMAGE_PREFIX="yourorg/codroom"
HEALTH_CHECK_TIMEOUT=300
ROLLBACK_TIMEOUT=60

# Environment-specific configuration
if [[ "$ENVIRONMENT" == "staging" ]]; then
    CLUSTER_NAME="codroom-staging"
    NAMESPACE="codroom-staging"
    DOMAIN="staging.codroom.com"
elif [[ "$ENVIRONMENT" == "production" ]]; then
    CLUSTER_NAME="codroom-production"
    NAMESPACE="codroom"
    DOMAIN="codroom.com"
else
    log_error "Invalid environment: $ENVIRONMENT. Use 'staging' or 'production'"
    exit 1
fi

# Pre-deployment checks
pre_deployment_checks() {
    log_info "Running pre-deployment checks..."
    
    # Check required tools
    for tool in kubectl docker helm; do
        if ! command -v $tool &> /dev/null; then
            log_error "$tool is not installed"
            exit 1
        fi
    done
    
    # Check cluster connectivity
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    # Check namespace exists
    if ! kubectl get namespace $NAMESPACE &> /dev/null; then
        log_info "Creating namespace $NAMESPACE"
        kubectl create namespace $NAMESPACE
    fi
    
    # Verify images exist
    for service in app socket; do
        image="$REGISTRY/$IMAGE_PREFIX-$service:$VERSION"
        if ! docker manifest inspect $image &> /dev/null; then
            log_error "Image $image does not exist"
            exit 1
        fi
    done
    
    log_success "Pre-deployment checks passed"
}

# Database migration
run_migrations() {
    log_info "Running database migrations..."
    
    kubectl run migration-job-$(date +%s) \
        --namespace=$NAMESPACE \
        --image=$REGISTRY/$IMAGE_PREFIX-app:$VERSION \
        --restart=Never \
        --rm -i --tty \
        --env-from=secret/codroom-secrets \
        --env-from=configmap/codroom-config \
        --command -- npx prisma migrate deploy
    
    if [[ $? -eq 0 ]]; then
        log_success "Database migrations completed"
    else
        log_error "Database migrations failed"
        exit 1
    fi
}

# Deploy application
deploy_application() {
    log_info "Deploying CodRoom $VERSION to $ENVIRONMENT..."
    
    # Update image tags in deployment
    kubectl set image deployment/codroom-app \
        app=$REGISTRY/$IMAGE_PREFIX-app:$VERSION \
        --namespace=$NAMESPACE
    
    kubectl set image deployment/codroom-socket \
        socket=$REGISTRY/$IMAGE_PREFIX-socket:$VERSION \
        --namespace=$NAMESPACE
    
    # Wait for rollout
    kubectl rollout status deployment/codroom-app --namespace=$NAMESPACE --timeout=300s
    kubectl rollout status deployment/codroom-socket --namespace=$NAMESPACE --timeout=300s
    
    log_success "Deployment completed"
}

# Health checks
health_checks() {
    log_info "Running health checks..."
    
    local app_url="https://$DOMAIN"
    local socket_url="https://socket.$DOMAIN"
    local start_time=$(date +%s)
    
    while true; do
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))
        
        if [[ $elapsed -gt $HEALTH_CHECK_TIMEOUT ]]; then
            log_error "Health checks timed out after ${HEALTH_CHECK_TIMEOUT}s"
            return 1
        fi
        
        # Check app health
        if curl -sf "$app_url/api/health" > /dev/null 2>&1; then
            log_success "App health check passed"
            break
        fi
        
        log_info "Waiting for app to be healthy... (${elapsed}s elapsed)"
        sleep 10
    done
    
    # Run smoke tests
    log_info "Running smoke tests..."
    
    # Test user registration
    local test_email="test-$(date +%s)@example.com"
    local register_response=$(curl -s -X POST "$app_url/api/auth/register" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$test_email\",\"password\":\"TestPass123!\",\"name\":\"Test User\"}")
    
    if echo "$register_response" | grep -q "success\|created"; then
        log_success "Registration smoke test passed"
    else
        log_warning "Registration smoke test failed: $register_response"
    fi
    
    # Test room creation (requires auth, so just check endpoint exists)
    local rooms_response=$(curl -s -o /dev/null -w "%{http_code}" "$app_url/api/rooms")
    if [[ "$rooms_response" == "401" ]]; then
        log_success "Rooms endpoint smoke test passed (401 expected without auth)"
    else
        log_warning "Rooms endpoint returned unexpected status: $rooms_response"
    fi
    
    log_success "Health checks completed"
}

# Rollback function
rollback() {
    log_warning "Rolling back deployment..."
    
    kubectl rollout undo deployment/codroom-app --namespace=$NAMESPACE
    kubectl rollout undo deployment/codroom-socket --namespace=$NAMESPACE
    
    kubectl rollout status deployment/codroom-app --namespace=$NAMESPACE --timeout=${ROLLBACK_TIMEOUT}s
    kubectl rollout status deployment/codroom-socket --namespace=$NAMESPACE --timeout=${ROLLBACK_TIMEOUT}s
    
    log_success "Rollback completed"
}

# Cleanup function
cleanup() {
    log_info "Cleaning up old resources..."
    
    # Remove old ReplicaSets (keep last 3)
    kubectl get rs --namespace=$NAMESPACE --sort-by=.metadata.creationTimestamp -o name | head -n -3 | xargs -r kubectl delete --namespace=$NAMESPACE
    
    # Remove completed migration jobs older than 1 day
    kubectl get jobs --namespace=$NAMESPACE --field-selector=status.successful=1 -o name | \
        xargs -I {} kubectl get {} --namespace=$NAMESPACE -o jsonpath='{.metadata.name} {.status.completionTime}' | \
        awk -v cutoff="$(date -d '1 day ago' -u +%Y-%m-%dT%H:%M:%SZ)" '$2 < cutoff {print $1}' | \
        xargs -r kubectl delete job --namespace=$NAMESPACE
    
    log_success "Cleanup completed"
}

# Main deployment flow
main() {
    log_info "Starting deployment of CodRoom $VERSION to $ENVIRONMENT"
    
    # Trap errors and rollback
    trap 'log_error "Deployment failed. Rolling back..."; rollback; exit 1' ERR
    
    pre_deployment_checks
    run_migrations
    deploy_application
    
    # Remove error trap before health checks (we don't want to rollback on health check failures)
    trap - ERR
    
    if ! health_checks; then
        log_error "Health checks failed. Manual intervention required."
        log_info "To rollback manually, run: kubectl rollout undo deployment/codroom-app deployment/codroom-socket --namespace=$NAMESPACE"
        exit 1
    fi
    
    cleanup
    
    log_success "Deployment of CodRoom $VERSION to $ENVIRONMENT completed successfully!"
    log_info "Application URL: https://$DOMAIN"
    log_info "Socket URL: https://socket.$DOMAIN"
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi