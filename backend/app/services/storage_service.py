import os
import uuid
import boto3
from botocore.config import Config
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
            s3_region = settings.AWS_REGION or "ap-south-1"
            s3_config = Config(
                region_name=s3_region,
                signature_version='s3v4',
                s3={'addressing_style': 'virtual'}
            )
            endpoint_url = f"https://s3.{s3_region}.amazonaws.com"
            
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=s3_region,
                endpoint_url=endpoint_url,
                config=s3_config
            )
            self.bucket = settings.AWS_S3_BUCKET
            self.base_url = (
                settings.AWS_S3_PUBLIC_BASE_URL.rstrip('/')
                if settings.AWS_S3_PUBLIC_BASE_URL
                else f"https://{self.bucket}.s3.{s3_region}.amazonaws.com"
            )
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
            put_kwargs = {
                'Bucket': self.bucket,
                'Key': path,
                'Body': content,
                'ContentType': self._get_mime_type(filename)
            }
            try:
                self.s3_client.put_object(ACL='public-read', **put_kwargs)
            except Exception:
                self.s3_client.put_object(**put_kwargs)
        else:
            # Save locally
            target_dir = os.path.join(self.base_path, clean_sub_dir)
            if not os.path.exists(target_dir):
                os.makedirs(target_dir)
            
            file_path = os.path.join(target_dir, unique_filename)
            with open(file_path, "wb") as f:
                f.write(content)
                
        return path, file_size

    def extract_relative_key(self, path: str) -> str:
        """
        Strips domain, base URL, query parameters (e.g. presigned AWS parameters),
        and leading slashes/uploads prefix from a given path or URL to retrieve
        the clean relative S3 key or local storage relative path.
        """
        if not path:
            return ""
        if str(path).startswith("data:"):
            return str(path)
            
        from urllib.parse import urlparse
        parsed = urlparse(str(path))
        
        # If it's a full URL to an external non-S3 domain (like ui-avatars.com), return original
        if parsed.scheme in ("http", "https") and parsed.netloc:
            is_our_s3 = (
                (self.bucket and self.bucket in parsed.netloc) or 
                "s3.amazonaws.com" in parsed.netloc or
                (settings.AWS_S3_PUBLIC_BASE_URL and parsed.netloc in settings.AWS_S3_PUBLIC_BASE_URL)
            )
            if not is_our_s3:
                return str(path)

        clean_path = parsed.path.lstrip("/")
        if clean_path.startswith("uploads/"):
            clean_path = clean_path[len("uploads/"):]
        if self.use_s3 and self.bucket and clean_path.startswith(f"{self.bucket}/"):
            clean_path = clean_path[len(f"{self.bucket}/"):]
            
        return clean_path

    def get_public_url(self, path: str, expires_in: Optional[int] = None) -> str:
        """
        Returns a public URL for a given path or full URL.
        For S3, returns a permanent public URL (e.g. https://bucket.s3.region.amazonaws.com/key)
        so URLs NEVER EXPIRE. If expires_in is explicitly passed, generates a temporary pre-signed URL.
        """
        if not path:
            return ""
            
        if str(path).startswith("data:"):
            return path

        clean_key = self.extract_relative_key(path)
        if clean_key.startswith(("http://", "https://")):
            return clean_key

        if self.use_s3:
            if expires_in is not None:
                try:
                    return self.s3_client.generate_presigned_url(
                        'get_object',
                        Params={'Bucket': self.bucket, 'Key': clean_key},
                        ExpiresIn=expires_in
                    )
                except Exception:
                    return f"{self.base_url}/{clean_key}"
            return f"{self.base_url}/{clean_key}"
        else:
            return f"/uploads/{clean_key}"

    def delete_file(self, path: str):
        """Deletes a file if it exists."""
        if not path:
            return

        clean_key = self.extract_relative_key(path)
        if not clean_key or clean_key.startswith(("http://", "https://")):
            return

        if self.use_s3:
            try:
                self.s3_client.delete_object(Bucket=self.bucket, Key=clean_key)
            except Exception:
                pass
        else:
            full_path = os.path.join(self.base_path, clean_key)
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
