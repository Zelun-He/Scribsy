"""
S3 service for handling file storage operations
"""
import boto3
import os
from pathlib import Path
from typing import Optional, BinaryIO
from botocore.exceptions import ClientError, NoCredentialsError
from app.config import settings
import logging

logger = logging.getLogger(__name__)

class S3Service:
    """Service for handling S3 operations"""
    
    def __init__(self):
        self.s3_client = None
        self.bucket_name = settings.s3_bucket_name
        
        if settings.use_s3:
            try:
                self.s3_client = boto3.client(
                    's3',
                    aws_access_key_id=settings.s3_access_key_id,
                    aws_secret_access_key=settings.s3_secret_access_key,
                    region_name=settings.s3_region_name,
                    endpoint_url=settings.s3_endpoint_url
                )
                # Test connection
                self.s3_client.head_bucket(Bucket=self.bucket_name)
                logger.info(f"Successfully connected to S3 bucket: {self.bucket_name}")
            except (ClientError, NoCredentialsError) as e:
                logger.error(f"Failed to initialize S3 client: {e}")
                self.s3_client = None
    
    def is_available(self) -> bool:
        """Check if S3 is available and configured"""
        return self.s3_client is not None and self.bucket_name
    
    async def upload_file(self, file_path: Path, s3_key: str, content_type: Optional[str] = None) -> bool:
        """Upload a file to S3"""
        if not self.is_available():
            logger.warning("S3 not available, falling back to local storage")
            return False
        
        try:
            extra_args = {}
            if content_type:
                extra_args['ContentType'] = content_type
            
            self.s3_client.upload_file(
                str(file_path),
                self.bucket_name,
                s3_key,
                ExtraArgs=extra_args
            )
            logger.info(f"Successfully uploaded {file_path} to S3 as {s3_key}")
            return True
        except Exception as e:
            logger.error(f"Failed to upload {file_path} to S3: {e}")
            return False
    
    async def upload_fileobj(self, file_obj: BinaryIO, s3_key: str, content_type: Optional[str] = None) -> bool:
        """Upload a file object to S3"""
        if not self.is_available():
            logger.warning("S3 not available, falling back to local storage")
            return False
        
        try:
            extra_args = {}
            if content_type:
                extra_args['ContentType'] = content_type
            
            self.s3_client.upload_fileobj(
                file_obj,
                self.bucket_name,
                s3_key,
                ExtraArgs=extra_args
            )
            logger.info(f"Successfully uploaded file object to S3 as {s3_key}")
            return True
        except Exception as e:
            logger.error(f"Failed to upload file object to S3: {e}")
            return False
    
    async def download_file(self, s3_key: str, local_path: Path) -> bool:
        """Download a file from S3"""
        if not self.is_available():
            logger.warning("S3 not available")
            return False
        
        try:
            self.s3_client.download_file(
                self.bucket_name,
                s3_key,
                str(local_path)
            )
            logger.info(f"Successfully downloaded {s3_key} from S3 to {local_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to download {s3_key} from S3: {e}")
            return False
    
    async def delete_file(self, s3_key: str) -> bool:
        """Delete a file from S3"""
        if not self.is_available():
            logger.warning("S3 not available")
            return False
        
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            logger.info(f"Successfully deleted {s3_key} from S3")
            return True
        except Exception as e:
            logger.error(f"Failed to delete {s3_key} from S3: {e}")
            return False
    
    def get_file_url(self, s3_key: str, expires_in: int = 3600) -> Optional[str]:
        """Generate a presigned URL for file access"""
        if not self.is_available():
            return None
        
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': s3_key},
                ExpiresIn=expires_in
            )
            return url
        except Exception as e:
            logger.error(f"Failed to generate presigned URL for {s3_key}: {e}")
            return None
    
    def get_file_size(self, s3_key: str) -> Optional[int]:
        """Get file size from S3"""
        if not self.is_available():
            return None
        
        try:
            response = self.s3_client.head_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            return response.get('ContentLength')
        except Exception as e:
            logger.error(f"Failed to get file size for {s3_key}: {e}")
            return None

# Create global S3 service instance
s3_service = S3Service() 