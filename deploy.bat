@echo off
setlocal EnableDelayedExpansion

REM ConceptForgeAI Production Deployment Script
REM This script deploys the application to AWS with production-ready configuration

set ENVIRONMENT=%1
if "%ENVIRONMENT%"=="" set ENVIRONMENT=prod

set STACK_NAME=conceptforge-platform-%ENVIRONMENT%
if "%AWS_REGION%"=="" set REGION=us-east-1
if not "%AWS_REGION%"=="" set REGION=%AWS_REGION%

echo.
echo ========================================
echo   ConceptForgeAI Production Deployment
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
    echo    Visit: https://aws.amazon.com/cli/
    exit /b 1
) else (
    echo ✅ AWS CLI found
)

python -m samcli --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ SAM CLI is not installed. Please install it first.
    echo    Visit: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html
    exit /b 1
) else (
    echo ✅ SAM CLI found
)

REM Check AWS credentials
aws sts get-caller-identity >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ AWS credentials not configured. Please run 'aws configure' first.
    exit /b 1
) else (
    echo ✅ AWS credentials configured
)

REM Check Bedrock access
echo 🔍 Checking Bedrock model access...
aws bedrock list-foundation-models --region %REGION% >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Warning: Cannot verify Bedrock access. Make sure you have enabled model access in the Bedrock console.
    echo    Visit: https://console.aws.amazon.com/bedrock/
    pause
)

REM Install Lambda dependencies
echo 📦 Installing Lambda dependencies...
cd lambda
npm install --production
if %errorlevel% neq 0 (
    echo ❌ Failed to install Lambda dependencies
    exit /b 1
)
cd ..

REM Build and deploy the SAM application
echo 🏗️  Building SAM application...
python -m samcli build
if %errorlevel% neq 0 (
    echo ❌ SAM build failed
    exit /b 1
)

echo 🚀 Deploying to AWS...
python -m samcli deploy ^
    --stack-name %STACK_NAME% ^
    --region %REGION% ^
    --capabilities CAPABILITY_IAM ^
    --parameter-overrides Environment=%ENVIRONMENT% ^
    --confirm-changeset ^
    --tags Environment=%ENVIRONMENT% Application=ConceptForgeAI

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
for /f "tokens=1 delims=." %%i in ("%WEBSITE_URL:http://=%") do set BUCKET_NAME=%%i

REM Update configuration file
echo 🔧 Updating configuration...
powershell -Command "(Get-Content config.js) -replace 'YOUR_API_GATEWAY_ENDPOINT_HERE/validate', '%API_ENDPOINT%/validate' | Set-Content config.js"
powershell -Command "(Get-Content config.js) -replace 'USE_MOCK_DATA: true', 'USE_MOCK_DATA: false' | Set-Content config.js"
powershell -Command "(Get-Content config.js) -replace 'ENVIRONMENT: ''development''', 'ENVIRONMENT: ''production''' | Set-Content config.js"

REM Upload frontend files to S3
echo 📤 Uploading frontend files to S3...
aws s3 cp index.html s3://%BUCKET_NAME%/ --region %REGION% --cache-control "max-age=300"
aws s3 cp styles.css s3://%BUCKET_NAME%/ --region %REGION% --cache-control "max-age=86400"
aws s3 cp script.js s3://%BUCKET_NAME%/ --region %REGION% --cache-control "max-age=86400"
aws s3 cp config.js s3://%BUCKET_NAME%/ --region %REGION% --cache-control "max-age=300"
aws s3 cp data-manager.js s3://%BUCKET_NAME%/ --region %REGION% --cache-control "max-age=86400"
aws s3 cp test.html s3://%BUCKET_NAME%/ --region %REGION% --cache-control "max-age=86400"

REM Create error page
echo ^<!DOCTYPE html^>^<html^>^<head^>^<title^>ConceptForgeAI - Page Not Found^</title^>^</head^>^<body^>^<h1^>Page Not Found^</h1^>^<p^>^<a href="/"^>Return to ConceptForgeAI^</a^>^</p^>^</body^>^</html^> > error.html
aws s3 cp error.html s3://%BUCKET_NAME%/ --region %REGION%
del error.html

REM Set up CloudWatch alarms
echo 📊 Setting up monitoring...
aws cloudwatch put-metric-alarm ^
    --alarm-name "ConceptForgeAI-%ENVIRONMENT%-HighLatency" ^
    --alarm-description "API response time > 10 seconds" ^
    --metric-name Duration ^
    --namespace AWS/Lambda ^
    --statistic Average ^
    --period 300 ^
    --threshold 10000 ^
    --comparison-operator GreaterThanThreshold ^
    --dimensions Name=FunctionName,Value=conceptforge-validate-%ENVIRONMENT% ^
    --evaluation-periods 2 ^
    --region %REGION% >nul 2>&1

aws cloudwatch put-metric-alarm ^
    --alarm-name "ConceptForgeAI-%ENVIRONMENT%-HighErrors" ^
    --alarm-description "Lambda error rate > 5%%" ^
    --metric-name Errors ^
    --namespace AWS/Lambda ^
    --statistic Sum ^
    --period 300 ^
    --threshold 5 ^
    --comparison-operator GreaterThanThreshold ^
    --dimensions Name=FunctionName,Value=conceptforge-validate-%ENVIRONMENT% ^
    --evaluation-periods 2 ^
    --region %REGION% >nul 2>&1

echo.
echo ✅ Deployment completed successfully!
echo.
echo ========================================
echo           DEPLOYMENT SUMMARY
echo ========================================
echo 🌐 Website URL: %WEBSITE_URL%
echo 🚀 CloudFront URL: %CLOUDFRONT_URL%
echo 🔗 API Endpoint: %API_ENDPOINT%
echo 📊 CloudWatch Dashboard: https://console.aws.amazon.com/cloudwatch/home?region=%REGION%#dashboards:name=ConceptForgeAI-%ENVIRONMENT%
echo.
echo ========================================
echo            NEXT STEPS
echo ========================================
echo 1. 🧪 Test the application at: %CLOUDFRONT_URL%
echo 2. 🔐 Enable Bedrock model access if not already done
echo 3. 🔑 Update API keys in Parameter Store for research integration:
echo    - /conceptforge/%ENVIRONMENT%/pubmed-api-key
echo    - /conceptforge/%ENVIRONMENT%/semantic-scholar-api-key
echo 4. 📈 Monitor performance in CloudWatch
echo 5. 🎯 Start offering validation services!
echo.
echo 💡 Pro Tips:
echo - Use CloudFront URL for better performance
echo - Monitor costs in AWS Cost Explorer
echo - Set up billing alerts for cost control
echo - Consider custom domain for professional branding
echo.

pause