@echo off
setlocal EnableDelayedExpansion

REM ConceptForgeAI Simple Deployment (No SAM Required)
REM This script deploys using CloudFormation directly

set ENVIRONMENT=%1
if "%ENVIRONMENT%"=="" set ENVIRONMENT=prod

set STACK_NAME=conceptforge-platform-%ENVIRONMENT%
if "%AWS_REGION%"=="" set REGION=us-east-1
if not "%AWS_REGION%"=="" set REGION=%AWS_REGION%

echo.
echo ========================================
echo   ConceptForgeAI Simple Deployment
echo ========================================
echo Environment: %ENVIRONMENT%
echo Region: %REGION%
echo Stack: %STACK_NAME%
echo.

REM Check prerequisites
echo 📋 Checking prerequisites...

aws --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ AWS CLI is not installed. Please install it first.
    exit /b 1
) else (
    echo ✅ AWS CLI found
)

REM Check AWS credentials
aws sts get-caller-identity >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ AWS credentials not configured. Please run 'aws configure' first.
    exit /b 1
) else (
    echo ✅ AWS credentials configured
)

REM Create deployment bucket
set BUCKET_NAME=conceptforge-deploy-%RANDOM%-%ENVIRONMENT%
echo 📦 Creating deployment bucket: %BUCKET_NAME%
aws s3 mb s3://%BUCKET_NAME% --region %REGION%

REM Package Lambda functions
echo 📦 Packaging Lambda functions...
cd lambda
if exist node_modules rmdir /s /q node_modules
npm install --production
if %errorlevel% neq 0 (
    echo ❌ Failed to install Lambda dependencies
    exit /b 1
)

REM Create Lambda ZIP files
powershell -Command "Compress-Archive -Path *.js, node_modules, package.json -DestinationPath ../lambda-package.zip -Force"
cd ..

REM Upload Lambda package
aws s3 cp lambda-package.zip s3://%BUCKET_NAME%/lambda-package.zip --region %REGION%

REM Update CloudFormation template for direct deployment
powershell -Command "(Get-Content cloudformation.yaml) -replace 'CodeUri: lambda/', 'Code: { S3Bucket: %BUCKET_NAME%, S3Key: lambda-package.zip }' | Set-Content cloudformation-deploy.yaml"

REM Deploy CloudFormation stack
echo 🚀 Deploying CloudFormation stack...
aws cloudformation deploy ^
    --template-file cloudformation-deploy.yaml ^
    --stack-name %STACK_NAME% ^
    --region %REGION% ^
    --capabilities CAPABILITY_IAM ^
    --parameter-overrides Environment=%ENVIRONMENT%

if %errorlevel% neq 0 (
    echo ❌ Deployment failed
    exit /b 1
)

REM Get deployment outputs
echo 📋 Getting deployment outputs...
for /f "tokens=*" %%i in ('aws cloudformation describe-stacks --stack-name %STACK_NAME% --region %REGION% --query "Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue" --output text') do set API_ENDPOINT=%%i
for /f "tokens=*" %%i in ('aws cloudformation describe-stacks --stack-name %STACK_NAME% --region %REGION% --query "Stacks[0].Outputs[?OutputKey==`WebsiteURL`].OutputValue" --output text') do set WEBSITE_URL=%%i
for /f "tokens=*" %%i in ('aws cloudformation describe-stacks --stack-name %STACK_NAME% --region %REGION% --query "Stacks[0].Outputs[?OutputKey==`CloudFrontURL`].OutputValue" --output text') do set CLOUDFRONT_URL=%%i

REM Extract bucket name from website URL
for /f "tokens=1 delims=." %%i in ("%WEBSITE_URL:http://=%") do set WEB_BUCKET_NAME=%%i

REM Update configuration file
echo 🔧 Updating configuration...
powershell -Command "(Get-Content config.js) -replace 'YOUR_API_GATEWAY_ENDPOINT_HERE/validate', '%API_ENDPOINT%/validate' | Set-Content config.js"
powershell -Command "(Get-Content config.js) -replace 'USE_MOCK_DATA: true', 'USE_MOCK_DATA: false' | Set-Content config.js"

REM Upload frontend files to S3
echo 📤 Uploading frontend files...
aws s3 cp index.html s3://%WEB_BUCKET_NAME%/ --region %REGION%
aws s3 cp styles.css s3://%WEB_BUCKET_NAME%/ --region %REGION%
aws s3 cp script.js s3://%WEB_BUCKET_NAME%/ --region %REGION%
aws s3 cp config.js s3://%WEB_BUCKET_NAME%/ --region %REGION%
aws s3 cp data-manager.js s3://%WEB_BUCKET_NAME%/ --region %REGION%
aws s3 cp simple.html s3://%WEB_BUCKET_NAME%/ --region %REGION%

REM Cleanup
del lambda-package.zip
del cloudformation-deploy.yaml
aws s3 rb s3://%BUCKET_NAME% --force

echo.
echo ✅ Deployment completed successfully!
echo.
echo ========================================
echo           DEPLOYMENT SUMMARY
echo ========================================
echo 🌐 Website URL: %WEBSITE_URL%
echo 🚀 CloudFront URL: %CLOUDFRONT_URL%
echo 🔗 API Endpoint: %API_ENDPOINT%
echo.
echo ========================================
echo            NEXT STEPS
echo ========================================
echo 1. 🧪 Test at: %CLOUDFRONT_URL%
echo 2. 🔐 Enable Bedrock model access:
echo    https://console.aws.amazon.com/bedrock/
echo 3. 🎯 Start offering validation services!
echo.

pause