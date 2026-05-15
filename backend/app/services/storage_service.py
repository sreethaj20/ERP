import os
import uuid
import boto3
from typing import Optional, Tuple, Any, List
from fastapi import UploadFile
from app.core.config import settings

class StorageService:
    def __init__(self):
        # Check if S3 is configured
        self.use_s3 = all([
            settings.AWS_ACCESS_KEY_ID,
            settings.AWS_SECRET_ACCESS_KEY,
            settings.AWS_S3_BUCKET
        ])
        
        if self.use_s3:
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_REGION
            )
            self.bucket = settings.AWS_S3_BUCKET
            self.base_url = settings.AWS_S3_PUBLIC_BASE_URL.rstrip('/') if settings.AWS_S3_PUBLIC_BASE_URL else f"https://{self.bucket}.s3.{settings.AWS_REGION}.amazonaws.com"
        else:
            self.base_path = settings.UPLOAD_DIR
            if not os.path.exists(self.base_path):
                os.makedirs(self.base_path)

    async def save_file(self, file: UploadFile, sub_dir: str = "") -> Tuple[str, int]:
        """Saves a file and returns (path_or_url, size)."""
        content = await file.read()
        return await self.save_content(content, file.filename, sub_dir)

    async def save_content(self, content: bytes, filename: str, sub_dir: str = "") -> Tuple[str, int]:
        """Saves bytes content and returns (path, size)."""
        name_part, file_ext = os.path.splitext(filename)
        # Preserve original name (e.g. candidate name) + unique suffix
        unique_filename = f"{name_part}_{uuid.uuid4().hex[:6]}{file_ext}"
        # Normalize sub_dir to use forward slashes and no leading/trailing slash
        clean_sub_dir = sub_dir.strip("/\\").replace("\\", "/")
        
        path = f"{clean_sub_dir}/{unique_filename}" if clean_sub_dir else unique_filename
        file_size = len(content)
        
        if self.use_s3:
            # Upload to S3
            self.s3_client.put_object(
                Bucket=self.bucket,
                Key=path,
                Body=content,
                ContentType=self._get_mime_type(filename)
            )
        else:
            # Save locally
            target_dir = os.path.join(self.base_path, clean_sub_dir)
            if not os.path.exists(target_dir):
                os.makedirs(target_dir)
            
            file_path = os.path.join(target_dir, unique_filename)
            with open(file_path, "wb") as f:
                f.write(content)
                
        return path, file_size

    def get_public_url(self, path: str, expires_in: int = 3600) -> str:
        """
        Returns a public URL for a given relative path.
        For S3, generates a Pre-signed URL to ensure security (prevents data breaching).
        """
        if not path:
            return ""
        
        if str(path).startswith(("http://", "https://", "data:")):
            return path
            
        if self.use_s3:
            try:
                # Generate a pre-signed URL for the S3 object
                url = self.s3_client.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': self.bucket, 'Key': str(path).lstrip('/')},
                    ExpiresIn=expires_in
                )
                return url
            except Exception as e:
                # Fallback to public URL if pre-signing fails (e.g. config error)
                return f"{self.base_url}/{str(path).lstrip('/')}"
        else:
            return f"/uploads/{str(path).lstrip('/')}"

    def delete_file(self, path: str):
        """Deletes a file if it exists."""
        if not path:
            return

        if self.use_s3:
            try:
                self.s3_client.delete_object(Bucket=self.bucket, Key=path)
            except Exception:
                pass
        else:
            full_path = os.path.join(self.base_path, path)
            if os.path.exists(full_path):
                os.remove(full_path)

    def _get_mime_type(self, filename: str) -> str:
        import mimetypes
        mime_type, _ = mimetypes.guess_type(filename)
        return mime_type or 'application/octet-stream'

    def hydrate_urls(self, obj: Any, fields: List[str]) -> Any:
        """
        In-place hydration of relative paths into public URLs for specified fields.
        Supports both SQLAlchemy models and dictionaries.
        """
        if not obj:
            return obj
            
        for field in fields:
            # Handle dict
            if isinstance(obj, dict):
                if obj.get(field):
                    obj[field] = self.get_public_url(obj[field])
            # Handle object (SQLAlchemy model or Pydantic)
            else:
                val = getattr(obj, field, None)
                if val:
                    setattr(obj, field, self.get_public_url(val))
        return obj

storage_service = StorageService()
