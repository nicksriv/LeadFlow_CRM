---
description: Deploy LeadFlow CRM to Contabo VPS using Docker
---

# Deploy to Contabo VPS

This guide outlines the steps to deploy the LeadFlow CRM to your Contabo VPS.

## Prerequisites
- A Contabo VPS (Ubuntu 20.04+ recommended)
- Root access to the VPS
- Domain or subdomain pointing to the VPS IP address (optional but recommended)

## Steps

### 1. SSH into your VPS
```bash
ssh root@213.199.48.187
```

### 2. Install Docker & Docker Compose
If Docker is not already installed, run the following commands:
```bash
# Update package index
apt-get update

# Install prerequisites
apt-get install -y ca-certificates curl gnupg

# Add Docker's official GPG key
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

# Set up the repository
echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### 3. Clone the Repository
Navigate to the directory where you want to host the app (e.g., `/var/www`):
```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/nicksriv/LeadFlow_CRM.git
cd LeadFlow_CRM
```

### 4. Configure Environment Variables
Create a `.env` file for production:
```bash
nano .env
```
Paste the following content (update values as needed):
```env
NODE_ENV=production
DATABASE_URL=postgresql://postgres:postgres@db:5432/leadflow_crm
SESSION_SECRET=your_secure_production_secret
OPENAI_API_KEY=your_openai_api_key
PORT=5000
```
Save and exit (`Ctrl+X`, `Y`, `Enter`).

### 5. Start the Application
Run the application using Docker Compose:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### 6. Initialize Database
Once the containers are running, push the schema and seed the database:
```bash
# Push schema
docker compose -f docker-compose.prod.yml exec app npm run db:push

# Seed data (optional)
docker compose -f docker-compose.prod.yml exec app npx tsx server/seed.ts
```

### 7. Verify Deployment
Open your browser and navigate to your VPS IP address or domain:
`http://213.199.48.187`

You should see the LeadFlow CRM login/dashboard.
