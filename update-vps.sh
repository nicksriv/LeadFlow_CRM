#!/bin/bash

# Update LeadFlow CRM on Contabo VPS
# This script pulls the latest changes and rebuilds the Docker containers

# Configuration
VPS_IP="213.199.48.187"  # Contabo VPS IP
VPS_USER="root"          # Default root user
APP_DIR="/var/www/LeadFlow_CRM"

echo "🚀 Updating LeadFlow CRM on $VPS_IP..."
echo ""

# SSH into VPS and run update commands
ssh -t $VPS_USER@$VPS_IP << 'EOF'
  echo "📦 Navigating to app directory..."
  cd /var/www/LeadFlow_CRM

  echo "⬇️  Pulling latest changes from GitHub..."
  git fetch --all
  git pull origin main

  echo "🛑 Stopping current containers..."
  docker compose -f docker-compose.prod.yml down

  echo "🔨 Rebuilding and starting containers..."
  docker compose -f docker-compose.prod.yml up -d --build

  echo "⏳ Waiting for services to start..."
  sleep 10

  echo "🗄️  Running database migrations..."
  docker compose -f docker-compose.prod.yml exec app npm run db:push

  echo "🧹 Cleaning up old Docker images..."
  docker image prune -f

  echo "✅ Deployment complete!"
  echo ""
  echo "📊 Container status:"
  docker compose -f docker-compose.prod.yml ps

  echo ""
  echo "🌐 Application should be available at: http://$(curl -s ifconfig.me):6487"
EOF

echo ""
echo "✨ Update completed successfully!"
