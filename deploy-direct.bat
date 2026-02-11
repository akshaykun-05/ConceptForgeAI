@echo off
setlocal EnableDelayedExpansion

REM ConceptForgeAI Direct CloudFormation Deployment
set ENVIRONMENT=%1
if "%ENVIRONMENT%"=="" set ENVIRONMENT=prod

set STACK_NAME=conceptforge-platform-%ENVIRONMENT%
set REGION=us-east-1

echo.
echo ========================================
echo   ConceptForgeAI Direct Deployment
echo ========================================
echo Environment: %ENVIRONMENT%
echo Region: %REGION%
echo Stack: %STACK_NAME%
echo.

REM Check AWS credentials
aws sts get-caller-identity >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ AWS credentials not configured. Please run 'aws configure' first.
    exit /b 1
) else (
    echo ✅ AWS credentials configured
)

REM Create a unique deployment bucket
set BUCKET_NAME=conceptforge-deploy-%RANDOM%-%ENVIRONMENT%
echo 📦 Creating deployment bucket: %BUCKET_NAME%
aws s3 mb s3://%BUCKET_NAME% --region %REGION%

REM Install Lambda dependencies
echo 📦 Installing Lambda dependencies...
cd lambda
npm install --production
if %errorlevel% neq 0 (
    echo ❌ Failed to install Lambda dependencies
    exit /b 1
)

REM Create Lambda ZIP
echo 📦 Creating Lambda package...
powershell -Command "Compress-Archive -Path *.js, node_modules, package.json -DestinationPath ../lambda-package.zip -Force"
cd ..

REM Upload Lambda package
echo 📤 Uploading Lambda package...
aws s3 cp lambda-package.zip s3://%BUCKET_NAME%/lambda-package.zip --region %REGION%

REM Create simplified CloudFormation template
echo 🏗️  Creating CloudFormation template...
(
echo AWSTemplateFormatVersion: '2010-09-09'
echo Description: 'ConceptForgeAI - AI Idea Validation Platform'
echo.
echo Parameters:
echo   Environment:
echo     Type: String
echo     Default: %ENVIRONMENT%
echo.
echo Resources:
echo   # DynamoDB Table
echo   ValidationTable:
echo     Type: AWS::DynamoDB::Table
echo     Properties:
echo       TableName: !Sub 'conceptforge-validations-${Environment}'
echo       BillingMode: PAY_PER_REQUEST
echo       AttributeDefinitions:
echo         - AttributeName: id
echo           AttributeType: S
echo       KeySchema:
echo         - AttributeName: id
echo           KeyType: HASH
echo       TimeToLiveSpecification:
echo         AttributeName: ttl
echo         Enabled: true
echo.
echo   # Lambda Execution Role
echo   LambdaExecutionRole:
echo     Type: AWS::IAM::Role
echo     Properties:
echo       AssumeRolePolicyDocument:
echo         Version: '2012-10-17'
echo         Statement:
echo           - Effect: Allow
echo             Principal:
echo               Service: lambda.amazonaws.com
echo             Action: sts:AssumeRole
echo       ManagedPolicyArns:
echo         - arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
echo       Policies:
echo         - PolicyName: DynamoDBAccess
echo           PolicyDocument:
echo             Version: '2012-10-17'
echo             Statement:
echo               - Effect: Allow
echo                 Action:
echo                   - dynamodb:PutItem
echo                   - dynamodb:GetItem
echo                   - dynamodb:Query
echo                   - dynamodb:Scan
echo                 Resource: !GetAtt ValidationTable.Arn
echo               - Effect: Allow
echo                 Action:
echo                   - bedrock:InvokeModel
echo                 Resource: 
echo                   - 'arn:aws:bedrock:*::foundation-model/anthropic.claude-3-haiku-20240307-v1:0'
echo.
echo   # Lambda Function
echo   ValidateIdeaFunction:
echo     Type: AWS::Lambda::Function
echo     Properties:
echo       FunctionName: !Sub 'conceptforge-validate-${Environment}'
echo       Runtime: nodejs18.x
echo       Handler: validate-idea.handler
echo       Code:
echo         S3Bucket: %BUCKET_NAME%
echo         S3Key: lambda-package.zip
echo       Role: !GetAtt LambdaExecutionRole.Arn
echo       Timeout: 30
echo       MemorySize: 512
echo       Environment:
echo         Variables:
echo           DYNAMODB_TABLE: !Ref ValidationTable
echo           BEDROCK_REGION: !Ref AWS::Region
echo.
echo   # API Gateway
echo   ApiGateway:
echo     Type: AWS::ApiGateway::RestApi
echo     Properties:
echo       Name: !Sub 'conceptforge-api-${Environment}'
echo       EndpointConfiguration:
echo         Types:
echo           - REGIONAL
echo.
echo   # API Gateway Resource
echo   ValidateResource:
echo     Type: AWS::ApiGateway::Resource
echo     Properties:
echo       RestApiId: !Ref ApiGateway
echo       ParentId: !GetAtt ApiGateway.RootResourceId
echo       PathPart: validate
echo.
echo   # API Gateway Method
echo   ValidateMethod:
echo     Type: AWS::ApiGateway::Method
echo     Properties:
echo       RestApiId: !Ref ApiGateway
echo       ResourceId: !Ref ValidateResource
echo       HttpMethod: POST
echo       AuthorizationType: NONE
echo       Integration:
echo         Type: AWS_PROXY
echo         IntegrationHttpMethod: POST
echo         Uri: !Sub 'arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${ValidateIdeaFunction.Arn}/invocations'
echo.
echo   # CORS Options Method
echo   OptionsMethod:
echo     Type: AWS::ApiGateway::Method
echo     Properties:
echo       RestApiId: !Ref ApiGateway
echo       ResourceId: !Ref ValidateResource
echo       HttpMethod: OPTIONS
echo       AuthorizationType: NONE
echo       Integration:
echo         Type: MOCK
echo         IntegrationResponses:
echo           - StatusCode: 200
echo             ResponseParameters:
echo               method.response.header.Access-Control-Allow-Headers: "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
echo               method.response.header.Access-Control-Allow-Methods: "'POST,OPTIONS'"
echo               method.response.header.Access-Control-Allow-Origin: "'*'"
echo         RequestTemplates:
echo           application/json: '{"statusCode": 200}'
echo       MethodResponses:
echo         - StatusCode: 200
echo           ResponseParameters:
echo             method.response.header.Access-Control-Allow-Headers: true
echo             method.response.header.Access-Control-Allow-Methods: true
echo             method.response.header.Access-Control-Allow-Origin: true
echo.
echo   # API Gateway Deployment
echo   ApiDeployment:
echo     Type: AWS::ApiGateway::Deployment
echo     DependsOn:
echo       - ValidateMethod
echo       - OptionsMethod
echo     Properties:
echo       RestApiId: !Ref ApiGateway
echo       StageName: !Ref Environment
echo.
echo   # Lambda Permission
echo   LambdaPermission:
echo     Type: AWS::Lambda::Permission
echo     Properties:
echo       FunctionName: !Ref ValidateIdeaFunction
echo       Action: lambda:InvokeFunction
echo       Principal: apigateway.amazonaws.com
echo       SourceArn: !Sub '${ApiGateway}/*/*'
echo.
echo   # S3 Bucket for website
echo   WebsiteBucket:
echo     Type: AWS::S3::Bucket
echo     Properties:
echo       BucketName: !Sub 'conceptforge-website-${Environment}-${AWS::AccountId}'
echo       WebsiteConfiguration:
echo         IndexDocument: index.html
echo         ErrorDocument: index.html
echo       PublicAccessBlockConfiguration:
echo         BlockPublicAcls: false
echo         BlockPublicPolicy: false
echo         IgnorePublicAcls: false
echo         RestrictPublicBuckets: false
echo.
echo   # S3 Bucket Policy
echo   WebsiteBucketPolicy:
echo     Type: AWS::S3::BucketPolicy
echo     Properties:
echo       Bucket: !Ref WebsiteBucket
echo       PolicyDocument:
echo         Statement:
echo           - Effect: Allow
echo             Principal: '*'
echo             Action: s3:GetObject
echo             Resource: !Sub '${WebsiteBucket}/*'
echo.
echo Outputs:
echo   ApiEndpoint:
echo     Description: 'API Gateway endpoint URL'
echo     Value: !Sub 'https://${ApiGateway}.execute-api.${AWS::Region}.amazonaws.com/${Environment}'
echo.
echo   WebsiteURL:
echo     Description: 'Website URL'
echo     Value: !GetAtt WebsiteBucket.WebsiteURL
) > cloudformation-simple.yaml

REM Deploy CloudFormation stack
echo 🚀 Deploying CloudFormation stack...
aws cloudformation deploy ^
    --template-file cloudformation-simple.yaml ^
    --stack-name %STACK_NAME% ^
    --region %REGION% ^
    --capabilities CAPABILITY_IAM ^
    --parameter-overrides Environment=%ENVIRONMENT%

if %errorlevel% neq 0 (
    echo ❌ Deployment failed
    exit /b 1
)

REM Get outputs
echo 📋 Getting deployment outputs...
for /f "tokens=*" %%i in ('aws cloudformation describe-stacks --stack-name %STACK_NAME% --region %REGION% --query "Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue" --output text') do set API_ENDPOINT=%%i
for /f "tokens=*" %%i in ('aws cloudformation describe-stacks --stack-name %STACK_NAME% --region %REGION% --query "Stacks[0].Outputs[?OutputKey==`WebsiteURL`].OutputValue" --output text') do set WEBSITE_URL=%%i

REM Extract bucket name
for /f "tokens=1 delims=." %%i in ("%WEBSITE_URL:http://=%") do set WEB_BUCKET_NAME=%%i

REM Update config
echo 🔧 Updating configuration...
powershell -Command "(Get-Content config.js) -replace 'YOUR_API_GATEWAY_ENDPOINT_HERE/validate', '%API_ENDPOINT%/validate' | Set-Content config.js"
powershell -Command "(Get-Content config.js) -replace 'USE_MOCK_DATA: true', 'USE_MOCK_DATA: false' | Set-Content config.js"

REM Upload website files
echo 📤 Uploading website files...
aws s3 cp index.html s3://%WEB_BUCKET_NAME%/ --region %REGION%
aws s3 cp styles.css s3://%WEB_BUCKET_NAME%/ --region %REGION%
aws s3 cp script.js s3://%WEB_BUCKET_NAME%/ --region %REGION%
aws s3 cp config.js s3://%WEB_BUCKET_NAME%/ --region %REGION%
aws s3 cp data-manager.js s3://%WEB_BUCKET_NAME%/ --region %REGION%
aws s3 cp simple.html s3://%WEB_BUCKET_NAME%/ --region %REGION%

REM Cleanup
del lambda-package.zip
del cloudformation-simple.yaml
aws s3 rb s3://%BUCKET_NAME% --force

echo.
echo ✅ Deployment completed successfully!
echo.
echo ========================================
echo           DEPLOYMENT SUMMARY
echo ========================================
echo 🌐 Website URL: %WEBSITE_URL%
echo 🔗 API Endpoint: %API_ENDPOINT%
echo.
echo ========================================
echo            NEXT STEPS
echo ========================================
echo 1. 🧪 Test at: %WEBSITE_URL%
echo 2. 🔐 Enable Bedrock model access:
echo    https://console.aws.amazon.com/bedrock/
echo 3. 🎯 Start offering validation services!
echo.

pause