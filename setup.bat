@echo off
echo 🚀 Setting up AI Idea Validation Engine...

REM Check prerequisites
echo 📋 Checking prerequisites...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    echo    Visit: https://nodejs.org/
    exit /b 1
) else (
    echo ✅ Node.js found
    node --version
)

REM Check if AWS CLI is installed
aws --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ AWS CLI is not installed. Please install it first.
    echo    Visit: https://aws.amazon.com/cli/
    exit /b 1
) else (
    echo ✅ AWS CLI found
    aws --version
)

REM Check if SAM CLI is installed
sam --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ SAM CLI is not installed. Please install it first.
    echo    Visit: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html
    exit /b 1
) else (
    echo ✅ SAM CLI found
    sam --version
)

REM Check AWS credentials
echo 🔐 Checking AWS credentials...
aws sts get-caller-identity >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ AWS credentials not configured. Please run 'aws configure' first.
    exit /b 1
) else (
    echo ✅ AWS credentials configured
)

REM Install Lambda dependencies
echo 📦 Installing Lambda dependencies...
cd lambda
npm install
cd ..

REM Create .gitignore if it doesn't exist
if not exist .gitignore (
    echo 📝 Creating .gitignore...
    (
        echo # Dependencies
        echo node_modules/
        echo lambda/node_modules/
        echo.
        echo # AWS
        echo .aws-sam/
        echo samconfig.toml
        echo.
        echo # Environment files
        echo .env
        echo .env.local
        echo.
        echo # Logs
        echo *.log
        echo.
        echo # OS generated files
        echo .DS_Store
        echo Thumbs.db
        echo.
        echo # IDE files
        echo .vscode/
        echo .idea/
        echo.
        echo # Backup files
        echo *.bak
    ) > .gitignore
)

echo.
echo ✅ Setup completed successfully!
echo.
echo 📝 Next steps:
echo 1. Test the frontend locally by opening index.html in your browser
echo 2. Deploy to AWS by running: deploy.bat dev
echo 3. Update config.js with your API Gateway endpoint after deployment
echo.
echo 💡 Tips:
echo - The app works with mock data by default for development
echo - Make sure you have Bedrock access enabled in your AWS account
echo - Check the README.md for detailed instructions