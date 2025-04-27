# Скрипт миграции пользователей из users.json в MongoDB
import json
import os
from pymongo import MongoClient

MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/verbsdb')
USERS_FILE = 'users.json'

mongo_client = MongoClient(MONGO_URI)
db = mongo_client.get_default_database()
users_collection = db['users']

def migrate_users():
    if not os.path.exists(USERS_FILE):
        print('users.json not found')
        return
    with open(USERS_FILE, 'r', encoding='utf-8') as f:
        users = json.load(f)
    # Очищаем коллекцию перед миграцией (опционально)
    users_collection.delete_many({})
    users_collection.insert_many(users)
    print(f'Migrated {len(users)} users to MongoDB')

if __name__ == '__main__':
    migrate_users()
