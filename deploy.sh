#!/bin/bash
# AWS Deployment Script for Official Carbon Credit Registry

set -e

echo "🚀 Official Carbon Credit Registry - AWS Deployment"
echo "=================================================="
echo ""

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed"
    echo "Please install it from: https://aws.amazon.com/cli/"
    exit 1
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured"
    echo "Please run: aws configure"
    exit 1
fi

echo "✅ AWS CLI and credentials verified"
echo ""

# Get region
REGION=$(aws configure get region || echo "us-east-1")
echo "📍 AWS Region: $REGION"
echo ""

echo "Select deployment option:"
echo "1) EC2 + Docker Compose (Budget-friendly, ~$35/month)"
echo "2) Use CloudFormation template"
echo "3) Manual setup"
echo ""
read -p "Enter choice [1-3]: " choice

case $choice in
    1)
        echo ""
        echo "🚀 Deploying via EC2 + Docker Compose..."
        
        # Get key pair name
        echo ""
        echo "Available EC2 Key Pairs:"
        aws ec2 describe-key-pairs --output text --query 'KeyPairs[*].KeyName'
        echo ""
        read -p "Enter key pair name: " KEY_PAIR
        
        # Get instance type
        read -p "Enter instance type [t3.medium]: " INSTANCE_TYPE
        INSTANCE_TYPE=${INSTANCE_TYPE:-t3.medium}
        
        # Launch EC2 instance
        echo ""
        echo "📦 Launching EC2 instance..."
        INSTANCE_ID=$(aws ec2 run-instances \
            --image-id ami-0c55b159cbfafe1f0 \
            --instance-type $INSTANCE_TYPE \
            --key-name $KEY_PAIR \
            --security-groups default \
            --user-data file://deploy/ec2-setup.sh \
            --query 'Instances[0].InstanceId' \
            --output text)
        
        echo "✅ Instance launched: $INSTANCE_ID"
        echo ""
        echo "⏳ Waiting for instance to be running..."
        aws ec2 wait instance-running --instance-ids $INSTANCE_ID
        
        # Get public IP
        PUBLIC_IP=$(aws ec2 describe-instances \
            --instance-ids $INSTANCE_ID \
            --query 'Reservations[0].Instances[0].PublicIpAddress' \
            --output text)
        
        echo "✅ Instance is running!"
        echo ""
        echo "🌐 Access your application:"
        echo "  - UI: http://$PUBLIC_IP:3000"
        echo "  - API: http://$PUBLIC_IP:4000"
        echo "  - Health: http://$PUBLIC_IP:4000/health"
        echo ""
        echo "🔑 SSH access:"
        echo "  ssh -i ~/.ssh/$KEY_PAIR.pem ec2-user@$PUBLIC_IP"
        echo ""
        echo "⏳ Waiting for application to start (this may take 2-3 minutes)..."
        ;;
    
    2)
        echo ""
        echo "🚀 Deploying via CloudFormation..."
        
        read -p "Enter stack name [carbon-registry]: " STACK_NAME
        STACK_NAME=${STACK_NAME:-carbon-registry}
        
        echo "Available EC2 Key Pairs:"
        aws ec2 describe-key-pairs --output text --query 'KeyPairs[*].KeyName'
        echo ""
        read -p "Enter key pair name: " KEY_PAIR
        
        aws cloudformation create-stack \
            --stack-name $STACK_NAME \
            --template-body file://deploy/cloudformation-template.yaml \
            --parameters ParameterKey=KeyPairName,ParameterValue=$KEY_PAIR \
            --capabilities CAPABILITY_NAMED_IAM
        
        echo ""
        echo "⏳ Waiting for stack to be created..."
        aws cloudformation wait stack-create-complete --stack-name $STACK_NAME
        
        echo ""
        echo "✅ Stack created successfully!"
        echo ""
        aws cloudformation describe-stacks \
            --stack-name $STACK_NAME \
            --query 'Stacks[0].Outputs' \
            --output table
        ;;
    
    3)
        echo ""
        echo "Manual Setup Instructions:"
        echo "========================"
        echo ""
        echo "1. Launch an EC2 instance (t3.medium recommended)"
        echo "2. SSH into the instance"
        echo "3. Run the setup script:"
        echo "   curl https://raw.githubusercontent.com/ShantanuVr/official-carbon-credit-registry/main/deploy/ec2-setup.sh | bash"
        echo ""
        echo "Or clone and run locally:"
        echo "   git clone https://github.com/ShantanuVr/official-carbon-credit-registry.git"
        echo "   cd official-carbon-credit-registry"
        echo "   ./deploy/ec2-setup.sh"
        ;;
    
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "✅ Deployment process started!"
echo ""
echo "📖 For more details, see AWS_DEPLOYMENT_GUIDE.md"

