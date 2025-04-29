# Скрипт для миграции глаголов из JSON-файлов в MongoDB
import json
import os
from pymongo import MongoClient

MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/verbsdb')
mongo_client = MongoClient(MONGO_URI)
db = mongo_client.get_default_database()

# Пути к JSON-файлам
IRREGULAR_PATH = 'irregular_verbs.json'
REGULAR_PATH = 'regular_verbs.json'

# Коллекции в базе
irregular_collection = db['irregular_verbs']
regular_collection = db['regular_verbs']

def migrate_verbs():
    # Миграция неправильных глаголов
    if os.path.exists(IRREGULAR_PATH):
        with open(IRREGULAR_PATH, encoding='utf-8') as f:
            verbs = json.load(f)
            irregular_collection.delete_many({})
            if isinstance(verbs, list):
                irregular_collection.insert_many(verbs)
            elif isinstance(verbs, dict):
                # Преобразуем dict в список документов
                irregular_collection.insert_many([
                    v for k, v in verbs.items()
                ])
        print(f"Migrated {irregular_collection.count_documents({})} irregular verbs.")
    else:
        print(f"{IRREGULAR_PATH} not found.")
    # Миграция правильных глаголов
    if os.path.exists(REGULAR_PATH):
        with open(REGULAR_PATH, encoding='utf-8') as f:
            verbs = json.load(f)
            regular_collection.delete_many({})
            if isinstance(verbs, list):
                regular_collection.insert_many(verbs)
            elif isinstance(verbs, dict):
                # Преобразуем dict в список документов
                regular_collection.insert_many([
                    v for k, v in verbs.items()
                ])
        print(f"Migrated {regular_collection.count_documents({})} regular verbs.")
    else:
        print(f"{REGULAR_PATH} not found.")

if __name__ == '__main__':
    migrate_verbs()
