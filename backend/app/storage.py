import uuid
from pathlib import Path
from typing import Optional

from fastapi import HTTPException, UploadFile
from supabase import create_client, Client

from app.config import settings


class StorageService:
    def __init__(self):
        self.client: Optional[Client] = None
        if settings.use_supabase_storage and settings.supabase_url and settings.supabase_key:
            self.client = create_client(settings.supabase_url, settings.supabase_key)

    def _ensure_bucket(self):
        if not self.client:
            return
        try:
            buckets = self.client.storage.list_buckets()
            bucket_names = [b.name for b in buckets]
            if settings.supabase_bucket not in bucket_names:
                self.client.storage.create_bucket(
                    settings.supabase_bucket,
                    options={"public": True},
                )
        except Exception:
            pass

    def save_photo(self, file: UploadFile) -> str:
        content_type = (file.content_type or "").lower()
        allowed = {"image/jpeg": ".jpg", "image/png": ".png", "image/jpg": ".jpg"}
        ext = allowed.get(content_type)
        if not ext:
            raise HTTPException(status_code=400, detail="Foto harus JPG atau PNG")

        data = file.file.read()
        max_bytes = settings.max_photo_mb * 1024 * 1024
        if len(data) > max_bytes:
            raise HTTPException(status_code=400, detail=f"Ukuran foto maks {settings.max_photo_mb}MB")
        if len(data) == 0:
            raise HTTPException(status_code=400, detail="Foto kosong")

        filename = f"{uuid.uuid4().hex}{ext}"

        if self.client:
            self._ensure_bucket()
            self.client.storage.from_(settings.supabase_bucket).upload(
                filename,
                data,
                file_options={"content-type": content_type, "upsert": "false"},
            )
            return f"supabase://{filename}"
        else:
            dest: Path = settings.upload_path / filename
            dest.write_bytes(data)
            return filename

    def get_public_url(self, path: str) -> str:
        if path.startswith("supabase://"):
            filename = path.replace("supabase://", "")
            if self.client:
                return self.client.storage.from_(settings.supabase_bucket).get_public_url(filename)
            return f"/uploads/{filename}"
        if self.client:
            return self.client.storage.from_(settings.supabase_bucket).get_public_url(path)
        return f"/uploads/{path}"

    def delete_photo(self, path: str) -> bool:
        if path.startswith("supabase://"):
            filename = path.replace("supabase://", "")
            if self.client:
                try:
                    self.client.storage.from_(settings.supabase_bucket).remove([filename])
                    return True
                except Exception:
                    return False
        else:
            try:
                (settings.upload_path / path).unlink(missing_ok=True)
                return True
            except Exception:
                return False


storage_service = StorageService()