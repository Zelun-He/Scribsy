# Amazon S3 Setup Guide for Scribsy

This guide will help you set up Amazon S3 integration with your Scribsy application for secure, scalable file storage.

## What is Amazon S3?

Amazon S3 (Simple Storage Service) is a cloud storage service that provides:
- **Scalable storage**: Store virtually unlimited amounts of data
- **High availability**: 99.99% availability SLA
- **Security**: Built-in encryption, access controls, and compliance features
- **Cost-effective**: Pay only for what you use
- **Integration**: Works seamlessly with other AWS services

## Prerequisites

1. **AWS Account**: You need an AWS account with billing enabled
2. **AWS CLI** (optional): For easier management of S3 buckets
3. **Python environment**: Your Scribsy application environment

## Step 1: Create an S3 Bucket

### Option A: Using AWS Console
1. Log into [AWS Console](https://console.aws.amazon.com/)
2. Navigate to S3 service
3. Click "Create bucket"
4. Choose a unique bucket name (e.g., `scribsy-audio-files-2024`)
5. Select your preferred region (recommend same as your application)
6. Configure options:
   - **Block Public Access**: Keep all blocks enabled for security
   - **Bucket Versioning**: Enable if you want file versioning
   - **Encryption**: Enable default encryption (recommended)
7. Click "Create bucket"

### Option B: Using AWS CLI
```bash
aws s3 mb s3://scribsy-audio-files-2024 --region us-east-1
```

## Step 2: Create IAM User for S3 Access

### Option A: Using AWS Console
1. Go to IAM service in AWS Console
2. Click "Users" → "Create user"
3. Enter username: `scribsy-s3-user`
4. Select "Programmatic access"
5. Click "Next: Permissions"
6. Click "Attach existing policies directly"
7. Search for and select `AmazonS3FullAccess` (or create custom policy)
8. Complete user creation
9. **Important**: Save the Access Key ID and Secret Access Key

### Option B: Using AWS CLI
```bash
# Create user
aws iam create-user --user-name scribsy-s3-user

# Create access key
aws iam create-access-key --user-name scribsy-s3-user

# Attach policy
aws iam attach-user-policy --user-name scribsy-s3-user --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
```

## Step 3: Configure Environment Variables

Create or update your `.env` file with S3 credentials:

```bash
# S3 Configuration
USE_S3=true
S3_BUCKET_NAME=scribsy-audio-files-2024
S3_ACCESS_KEY_ID=your_access_key_here
S3_SECRET_ACCESS_KEY=your_secret_key_here
S3_REGION_NAME=us-east-1
```

## Step 4: Install Dependencies

Install the required Python packages:

```bash
pip install boto3
```

Or update your requirements.txt and install:

```bash
pip install -r requirements.txt
```

## Step 5: Run Database Migration

Run the migration script to add S3 fields to your database:

```bash
python migrate_add_s3_fields.py
```

## Step 6: Test S3 Integration

1. Start your Scribsy application
2. Upload an audio file through the transcribe endpoint
3. Check the response for S3 metadata
4. Verify the file appears in your S3 bucket

## Security Best Practices

### 1. IAM Policy Restrictions
Instead of `AmazonS3FullAccess`, create a custom policy with minimal permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::your-bucket-name",
                "arn:aws:s3:::your-bucket-name/*"
            ]
        }
    ]
}
```

### 2. Bucket Policy
Add a bucket policy to restrict access:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "DenyPublicRead",
            "Effect": "Deny",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::your-bucket-name/*",
            "Condition": {
                "StringEquals": {
                    "aws:PrincipalType": "Anonymous"
                }
            }
        }
    ]
}
```

### 3. Encryption
Enable default encryption on your bucket:
- Server-side encryption with Amazon S3-managed keys (SSE-S3)
- Or use AWS KMS for more control

## Cost Optimization

### 1. Lifecycle Policies
Set up lifecycle policies to move old files to cheaper storage:

```bash
# Move files older than 30 days to IA
aws s3api put-bucket-lifecycle-configuration --bucket your-bucket-name --lifecycle-configuration '{
    "Rules": [
        {
            "ID": "MoveToIA",
            "Status": "Enabled",
            "Filter": {"Prefix": ""},
            "Transitions": [
                {
                    "Days": 30,
                    "StorageClass": "STANDARD_IA"
                }
            ]
        }
    ]
}'
```

### 2. Storage Classes
- **Standard**: For frequently accessed files
- **Standard-IA**: For infrequently accessed files (cheaper)
- **Glacier**: For long-term archival (cheapest)

## Monitoring and Logging

### 1. Enable S3 Access Logging
```bash
aws s3api put-bucket-logging --bucket your-bucket-name --bucket-logging-status '{
    "LoggingEnabled": {
        "TargetBucket": "your-logging-bucket",
        "TargetPrefix": "logs/"
    }
}'
```

### 2. CloudWatch Metrics
Monitor your S3 usage through CloudWatch:
- Request counts
- Data transfer
- Error rates

## Troubleshooting

### Common Issues

1. **Access Denied**
   - Check IAM user permissions
   - Verify bucket name and region
   - Ensure access keys are correct

2. **Bucket Not Found**
   - Verify bucket name spelling
   - Check if bucket exists in the specified region

3. **File Upload Fails**
   - Check file size limits
   - Verify network connectivity
   - Check AWS service status

### Testing S3 Connection

Use the S3 status endpoint to verify connectivity:

```bash
curl http://localhost:8000/s3/status
```

Expected response:
```json
{
    "available": true,
    "bucket_name": "your-bucket-name"
}
```

## Alternative: Local S3 Testing with MinIO

For development/testing without AWS costs, you can use MinIO:

1. **Install MinIO**:
   ```bash
   # Docker
   docker run -p 9000:9000 -p 9001:9001 minio/minio server /data --console-address ":9001"
   
   # Or download binary
   wget https://dl.min.io/server/minio/release/linux-amd64/minio
   chmod +x minio
   ./minio server /data
   ```

2. **Create bucket**:
   ```bash
   mc mb local/scribsy-test
   ```

3. **Update environment**:
   ```bash
   USE_S3=true
   S3_BUCKET_NAME=scribsy-test
   S3_ACCESS_KEY_ID=minioadmin
   S3_SECRET_ACCESS_KEY=minioadmin
   S3_ENDPOINT_URL=http://localhost:9000
   ```

## Next Steps

After setting up S3:

1. **Test file uploads** through your application
2. **Monitor costs** in AWS billing dashboard
3. **Set up alerts** for unusual usage patterns
4. **Implement backup strategies** for critical data
5. **Consider CDN integration** for faster file delivery

## Support

- **AWS S3 Documentation**: [https://docs.aws.amazon.com/s3/](https://docs.aws.amazon.com/s3/)
- **Boto3 Documentation**: [https://boto3.amazonaws.com/v1/documentation/api/latest/index.html](https://boto3.amazonaws.com/v1/documentation/api/latest/index.html)
- **AWS Support**: Available with paid support plans 