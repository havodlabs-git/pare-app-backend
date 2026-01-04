#!/bin/bash

# Deploy Pare! Backend to Google Cloud Run
# Usage: ./deploy-cloud-run.sh

set -e

echo "🚀 Deploying Pare! Backend to Google Cloud Run..."

# Variables
PROJECT_ID="pare-app-483321"
SERVICE_NAME="pare-app-backend"
REGION="us-central1"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Authenticate with service account
echo "🔐 Authenticating with Google Cloud..."
gcloud auth activate-service-account --key-file=../upload/pare-app-483321-08c2718bc3bd.json

# Set project
echo "📦 Setting project..."
gcloud config set project ${PROJECT_ID}

# Build and push Docker image
echo "🏗️  Building Docker image..."
gcloud builds submit --tag ${IMAGE_NAME}

# Deploy to Cloud Run
echo "🚢 Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME} \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 10 \
  --set-env-vars "NODE_ENV=production,JWT_EXPIRES_IN=7d,RATE_LIMIT_WINDOW_MS=900000,RATE_LIMIT_MAX_REQUESTS=100" \
  --set-secrets "MONGODB_URI=MONGODB_URI:latest,JWT_SECRET=JWT_SECRET:latest,CORS_ORIGIN=CORS_ORIGIN:latest"

echo "✅ Deployment complete!"
echo "🌐 Your API is now live at:"
gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format 'value(status.url)'
