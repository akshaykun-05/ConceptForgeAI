#!/bin/bash

# AI Idea Validation Engine Deployment Script
# This script deploys the application to AWS using CloudFormation and SAM

set -e

ENVIRONMENT=${1:-dev}
STACK_NAME="idea-validation-engine-$ENVIRONMENT"
REGION=${AWS_REGION:-us-east-1}

echo "🚀 Deploying AI Idea Validation Engine to AWS..."
echo "Environment: $ENVIRONMENT"
echo "Region: $REGION"
echo "Stack: $STACK_NAME"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if SAM CLI is installed
if ! command -v sam &> /dev/null; then
    echo "❌ SAM CLI is not installed. Please install it first."
    exit 1
fi

# Build and deploy the SAM application
echo "📦 Building SAM application..."
sam build

echo "🚀 Deploying to AWS..."
sam deploy \
    --stack-name $STACK_NAME \
    --region $REGION \
    --capabilities CAPABILITY_IAM \
    --parameter-overrides Environment=$ENVIRONMENT \
    --confirm-changeset

# Get the outputs
echo "📋 Getting deployment outputs..."
API_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
    --output text)

WEBSITE_URL=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`WebsiteURL`].OutputValue' \
    --output text)

BUCKET_NAME=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`DynamoDBTable`].OutputValue' \
    --output text | sed 's/.*\///')

# Update the frontend with the API endpoint
echo "🔧 Updating frontend configuration..."
sed -i.bak "s|// Replace this with actual AWS Lambda endpoint|const API_ENDPOINT = '$API_ENDPOINT/validate';|g" script.js
sed -i.bak "s|await this.callValidationAPI(idea);|const response = await fetch(API_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idea }) }); const result = await response.json(); return result;|g" script.js

# Upload frontend files to S3
echo "📤 Uploading frontend files to S3..."
BUCKET_NAME=$(echo $WEBSITE_URL | sed 's|http://||' | sed 's|\.s3-website.*||')

aws s3 cp index.html s3://$BUCKET_NAME/ --region $REGION
aws s3 cp styles.css s3://$BUCKET_NAME/ --region $REGION  
aws s3 cp script.js s3://$BUCKET_NAME/ --region $REGION

echo "✅ Deployment completed successfully!"
echo ""
echo "🌐 Website URL: $WEBSITE_URL"
echo "🔗 API Endpoint: $API_ENDPOINT"
echo ""
echo "📝 Next steps:"
echo "1. Visit the website URL to test the application"
echo "2. Make sure you have Bedrock model access enabled in your AWS account"
echo "3. Monitor CloudWatch logs for any issues"