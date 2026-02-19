from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Any, List, Dict
from datetime import datetime, timezone
import uuid


class BaseDocument(BaseModel):
    """Базовая модель для документов MongoDB"""
    model_config = ConfigDict(
        arbitrary_types_allowed=True,
        populate_by_name=True,
        json_encoders={
            datetime: lambda v: v.isoformat() if v else None
        }
    )
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), alias="_id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_at: Optional[datetime] = None
    
    def to_mongo(self, exclude_none: bool = True) -> Dict[str, Any]:
        """Конвертирует модель в словарь для MongoDB"""
        data = self.model_dump(by_alias=True, exclude_none=exclude_none)
        # Конвертируем datetime в строки для MongoDB
        for key, value in data.items():
            if isinstance(value, datetime):
                data[key] = value.isoformat()
        return data
    
    @classmethod
    def from_mongo(cls, data: Dict[str, Any]) -> "BaseDocument":
        """Создает модель из данных MongoDB"""
        if data is None:
            return None
        
        # Конвертируем строки обратно в datetime
        for key in ['created_at', 'updated_at', 'deleted_at']:
            if key in data and isinstance(data[key], str):
                data[key] = datetime.fromisoformat(data[key].replace('Z', '+00:00'))
        
        return cls(**data)


class TimestampMixin(BaseModel):
    """Миксин для временных меток"""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_at: Optional[datetime] = None


class OwnerMixin(BaseModel):
    """Миксин для владельца документа"""
    owner_id: str