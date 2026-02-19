#!/usr/bin/env python3
"""
Скрипт для запуска Hawklets API из корневой директории проекта
"""

import sys
import os

# Добавляем текущую директорию в PYTHONPATH
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    import uvicorn
    
    print("Starting Hawklets API server...")
    print("Docs: http://localhost:8000/api/docs")
    print("Health: http://localhost:8000/api/health")
    
    uvicorn.run(
        "backend.server:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )