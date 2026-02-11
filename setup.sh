#!/bin/bash

# AI Idea Validation Engine Setup Script
# This script helps you set up the development environment and prepare for deployment

echo "🚀 Setting up AI Idea Validation Engine..."

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "   Visit: https://nodejs.org/"
    exit 1
else
    echo "✅ Node.js found: $(node --version)"
fi

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    echo "   Visit: https://aws.amazon.com/cli/"
    exit 1
else
    echo "✅ AWS CLI found: $(aws --version)"
fi

# Check if SAM CLI is installed
if ! command -v sam &> /dev/null; then
    echo "❌ SAM CLI is not installed. Please install it first."
    echo "   Visit: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html"
    exit 1
else
    echo "✅ SAM CLI found: $(sam --version)"
fi

# Check AWS credentials
echo "🔐 Checking AWS credentials..."
if aws sts get-caller-identity &> /dev/null; then
    echo "✅ AWS credentials configured"
    aws sts get-caller-identity --query 'Account' --output text | xargs echo "   Account ID:"
else
    echo "❌ AWS credentials not configured. Please run 'aws configure' first."
    exit 1
fi

# Install Lambda dependencies
echo "📦 Installing Lambda dependencies..."
cd lambda
npm install
cd ..

# Make scripts executable
echo "🔧 Setting up scripts..."
chmod +x deploy.sh

# Create .gitignore if it doesn't exist
if [ ! -f .gitignore ]; then
    echo "📝 Creating .gitignore..."
    cat > .gitignore << EOF
# Dependencies
node_modules/
lambda/node_modules/

# AWS
.aws-sam/
samconfig.toml

# Environment files
.env
.env.local

# Logs
*.log

# OS generated files
.DS_Store
Thumbs.db

# IDE files
.vscode/
.idea/

# Backup files
*.bak
EOF
fi

echo ""
echo "✅ Setup completed successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Test the frontend locally by opening index.html in your browser"
echo "2. Deploy to AWS by running: ./deploy.sh dev"
echo "3. Update config.js with your API Gateway endpoint after deployment"
echo ""
echo "💡 Tips:"
echo "- The app works with mock data by default for development"
echo "- Make sure you have Bedrock access enabled in your AWS account"
echo "- Check the README.md for detailed instructions"