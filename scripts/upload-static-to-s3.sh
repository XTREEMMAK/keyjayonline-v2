#!/bin/bash
# Upload static assets to DigitalOcean Spaces
# Requires AWS CLI configured with Spaces credentials
#
# Usage:
#   ./scripts/upload-static-to-s3.sh
#
# Environment variables required:
#   AWS_ACCESS_KEY_ID     - DigitalOcean Spaces access key
#   AWS_SECRET_ACCESS_KEY - DigitalOcean Spaces secret key

set -e

BUCKET="kjo"
ENDPOINT="https://nyc3.digitaloceanspaces.com"

# Check for required environment variables
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    echo "Error: AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be set"
    echo "These should be your DigitalOcean Spaces credentials"
    exit 1
fi

echo "Uploading static assets to DigitalOcean Spaces..."
echo "Bucket: $BUCKET"
echo "Endpoint: $ENDPOINT"

aws s3 sync ./static s3://$BUCKET/ \
  --endpoint-url $ENDPOINT \
  --acl public-read \
  --exclude "*.gitkeep" \
  --exclude ".DS_Store"

echo "Upload complete!"
echo "Files are available at: https://kjo.nyc3.cdn.digitaloceanspaces.com/"
