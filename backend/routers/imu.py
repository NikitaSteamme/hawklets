import os
import re
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import sys
from pathlib import Path

current_dir = Path(__file__).parent
parent_dir = current_dir.parent.parent
if str(parent_dir) not in sys.path:
    sys.path.insert(0, str(parent_dir))

try:
    from backend.routers.auth import get_current_user
except ImportError:
    try:
        from routers.auth import get_current_user
    except ImportError:
        from ..routers.auth import get_current_user

router = APIRouter(prefix="/imu", tags=["imu"])

db = None
UPLOAD_DIR = Path("/app/uploads/imu_logs")

# Only allow simple filenames — no path traversal
_SAFE_FILENAME = re.compile(r'^[\w\-\.]+\.txt$')


def set_db_connection(database):
    global db
    db = database


class IMULogUpload(BaseModel):
    filename: str
    content: str


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_imu_log(
    payload: IMULogUpload,
    current_user: dict = Depends(get_current_user),
):
    """
    Принимает текстовый лог IMU-данных, полученный с трекера по BLE.
    Сохраняет файл в /app/uploads/imu_logs/{user_id}/{filename}.
    """
    if not _SAFE_FILENAME.match(payload.filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid filename. Must be a .txt file with no path components.",
        )

    user_id = current_user["id"]
    user_dir = UPLOAD_DIR / user_id
    user_dir.mkdir(parents=True, exist_ok=True)

    file_path = user_dir / payload.filename

    try:
        file_path.write_text(payload.content, encoding="utf-8")
    except OSError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save log: {e}",
        )

    # Store metadata in DB so logs are queryable
    if db is not None:
        await db.imu_logs.insert_one({
            "owner_id": user_id,
            "filename": payload.filename,
            "size_bytes": len(payload.content.encode("utf-8")),
            "path": str(file_path),
            "uploaded_at": datetime.now(timezone.utc),
        })

    return {
        "success": True,
        "filename": payload.filename,
        "size_bytes": len(payload.content.encode("utf-8")),
    }
