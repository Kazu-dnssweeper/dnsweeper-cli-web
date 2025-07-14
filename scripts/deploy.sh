#!/bin/bash

# DNSweeper Production Deployment Script
set -e

echo "🚀 Starting DNSweeper Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker and Docker Compose are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Dependencies check passed"
}

# Check if .env file exists
check_environment() {
    print_status "Checking environment configuration..."
    
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            print_warning ".env file not found. Copying from .env.example"
            cp .env.example .env
            print_warning "Please edit .env file with your configuration before proceeding."
            read -p "Press Enter to continue after editing .env file..."
        else
            print_error ".env file not found and no .env.example available"
            exit 1
        fi
    fi
    
    print_success "Environment configuration check passed"
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    mkdir -p logs
    mkdir -p data
    mkdir -p nginx/ssl
    mkdir -p web/backend/uploads
    mkdir -p web/backend/logs
    
    print_success "Directories created"
}

# Generate SSL certificates if they don't exist
generate_ssl() {
    print_status "Checking SSL certificates..."
    
    if [ ! -f nginx/ssl/cert.pem ] || [ ! -f nginx/ssl/key.pem ]; then
        print_warning "SSL certificates not found. Generating self-signed certificates..."
        
        openssl req -x509 -newkey rsa:4096 -keyout nginx/ssl/key.pem -out nginx/ssl/cert.pem -days 365 -nodes \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
        
        print_warning "Self-signed certificates generated. Replace with proper certificates in production!"
    fi
    
    print_success "SSL certificates ready"
}

# Build and start services
deploy_services() {
    print_status "Building and starting services..."
    
    # Pull latest images
    docker-compose pull --quiet
    
    # Build custom images
    docker-compose build --no-cache
    
    # Start services
    docker-compose up -d
    
    print_success "Services started"
}

# Wait for services to be healthy
wait_for_services() {
    print_status "Waiting for services to be ready..."
    
    # Wait for database
    echo "Waiting for PostgreSQL..."
    timeout 60 bash -c 'until docker-compose exec -T postgres pg_isready -U dnsweeper; do sleep 2; done'
    
    # Wait for Redis
    echo "Waiting for Redis..."
    timeout 30 bash -c 'until docker-compose exec -T redis redis-cli ping; do sleep 2; done'
    
    # Wait for backend
    echo "Waiting for Backend API..."
    timeout 60 bash -c 'until curl -s http://localhost:3001/health > /dev/null; do sleep 2; done'
    
    # Wait for frontend
    echo "Waiting for Frontend..."
    timeout 60 bash -c 'until curl -s http://localhost:3000 > /dev/null; do sleep 2; done'
    
    print_success "All services are ready"
}

# Show deployment status
show_status() {
    print_status "Deployment Status:"
    docker-compose ps
    
    echo ""
    print_success "🎉 DNSweeper has been deployed successfully!"
    echo ""
    echo "Access URLs:"
    echo "  📱 Frontend: https://localhost (or http://localhost:3000)"
    echo "  🔌 Backend API: http://localhost:3001"
    echo "  📊 Health Check: http://localhost:3001/health"
    echo ""
    echo "Default admin credentials:"
    echo "  📧 Email: admin@dnsweeper.local"
    echo "  🔑 Password: admin123"
    echo ""
    print_warning "⚠️  Please change the default password in production!"
    echo ""
    echo "Useful commands:"
    echo "  📋 View logs: docker-compose logs -f"
    echo "  ⏹️  Stop services: docker-compose down"
    echo "  🔄 Restart services: docker-compose restart"
    echo "  🧹 Clean up: docker-compose down -v --remove-orphans"
}

# Main deployment flow
main() {
    echo "🎯 DNSweeper Production Deployment"
    echo "=================================="
    
    check_dependencies
    check_environment
    create_directories
    generate_ssl
    deploy_services
    wait_for_services
    show_status
}

# Handle script interruption
trap 'print_error "Deployment interrupted"; exit 1' INT TERM

# Run main deployment
main "$@"