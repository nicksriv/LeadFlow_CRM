#!/bin/bash

# Configuration
REPO_URL="https://github.com/nicksriv/LeadFlow_CRM.git"
APP_DIR="/var/www/LeadFlow_CRM"

# Colors
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${GREEN}LeadFlow CRM Deployment Helper${NC}"
echo "This script will help you deploy the application to your VPS."
echo ""

# Get VPS details
read -p "Enter VPS IP Address: " VPS_IP
read -p "Enter VPS Username (default: root): " VPS_USER
VPS_USER=${VPS_USER:-root}

echo ""
echo "Deploying to $VPS_USER@$VPS_IP..."
echo "You may be asked for your SSH password."
echo ""

# SSH Command to execute on server
ssh -t $VPS_USER@$VPS_IP << EOF
  echo -e "${GREEN}1. Updating System...${NC}"
  apt-get update -y

  echo -e "${GREEN}2. Checking Docker...${NC}"
  if ! command -v docker &> /dev/null; then
      echo "Installing Docker..."
      apt-get install -y ca-certificates curl gnupg
      install -m 0755 -d /etc/apt/keyrings
      curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
      chmod a+r /etc/apt/keyrings/docker.gpg
      echo \
        "deb [arch="\$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
        "\$(. /etc/os-release && echo "\$VERSION_CODENAME")" stable" | \
        tee /etc/apt/sources.list.d/docker.list > /dev/null
      apt-get update
      apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  else
      echo "Docker is already installed."
  fi

  echo -e "${GREEN}3. Setting up Application...${NC}"
  mkdir -p /var/www
  if [ -d "$APP_DIR" ]; then
      echo "Updating existing repository..."
      cd $APP_DIR
      git pull
  else
      echo "Cloning repository..."
      cd /var/www
      git clone $REPO_URL
      cd $APP_DIR
  fi

  echo -e "${GREEN}4. Configuring Environment...${NC}"
  if [ ! -f .env ]; then
      echo "Creating .env file..."
      cat > .env << EOL
NODE_ENV=production
DATABASE_URL=postgresql://postgres:postgres@db:5432/leadflow_crm
SESSION_SECRET=$(openssl rand -hex 32)
OPENAI_API_KEY=dummy_key_please_change
PORT=5000
EOL
      echo "Created default .env file. Please update OPENAI_API_KEY later."
  fi

  echo -e "${GREEN}5. Starting Services...${NC}"
  docker compose -f docker-compose.prod.yml up -d --build

  echo -e "${GREEN}6. Initializing Database...${NC}"
  echo "Waiting for application to be ready..."
  
  # Wait for the app to respond (max 30 attempts)
  for i in {1..30}; do
    if docker compose -f docker-compose.prod.yml exec app curl -s http://localhost:5000/api/health > /dev/null || \
       docker compose -f docker-compose.prod.yml exec app curl -s http://localhost:5000 > /dev/null; then
      echo "Application is ready!"
      break
    fi
    echo "Waiting for app... ($i/30)"
    sleep 2
  done
  
  # Give it a few more seconds to be sure
  sleep 5

  docker compose -f docker-compose.prod.yml exec app npm run db:push
  docker compose -f docker-compose.prod.yml exec app npx tsx server/seed.ts

  echo -e "${GREEN}✅ Deployment Complete!${NC}"
  echo "Your app should be live at http://$VPS_IP:8081"
EOF
