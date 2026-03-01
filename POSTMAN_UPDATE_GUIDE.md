# Руководство по обновлению Postman коллекции

Это руководство описывает необходимые изменения в Postman коллекции Hawklets API после обновления эндпоинтов аутентификации.

## Что изменилось в API

### 1. Логин теперь использует поле `email` вместо `username`
**Старый формат:**
```json
{
  "username": "user@example.com",
  "password": "password"
}
```

**Новый формат:**
```json
{
  "email": "user@example.com",
  "password": "password"
}
```

### 2. Добавлены новые эндпоинты:
- `PUT /auth/update` - обновление информации аккаунта
- `DELETE /auth/delete` - удаление аккаунта

### 3. Обновление токена теперь использует JSON body вместо query параметра
**Старый формат:** `POST /auth/refresh?refresh_token=token`
**Новый формат:** `POST /auth/refresh` с JSON телом

## Шаги по обновлению Postman коллекции

### Шаг 1: Обновить запрос логина

1. Откройте коллекцию "Hawklets API" в Postman
2. Найдите запрос "Login" в папке "Authentication"
3. Перейдите на вкладку "Body"
4. Измените поле с `username` на `email`:

**Было:**
```json
{
  "username": "{{email}}",
  "password": "{{password}}"
}
```

**Стало:**
```json
{
  "email": "{{email}}",
  "password": "{{password}}"
}
```

### Шаг 2: Обновить запрос обновления токена

1. Найдите запрос "Refresh Token" в папке "Authentication"
2. Удалите query параметр `refresh_token` из URL
3. Перейдите на вкладку "Body"
4. Выберите "raw" и "JSON" формат
5. Добавьте JSON тело:

```json
{
  "refresh_token": "{{refresh_token}}"
}
```

### Шаг 3: Добавить новый запрос "Update Account"

1. В папке "Authentication" создайте новый запрос
2. Настройте следующие параметры:

**Основные настройки:**
- Метод: `PUT`
- URL: `{{base_url}}/auth/update`
- Headers:
  - `X-API-Key`: `{{api_key}}`
  - `Authorization`: `Bearer {{access_token}}`
  - `Content-Type`: `application/json`

**Body (raw JSON):**
```json
{
  "display_name": "Updated Name",
  "password": "new_password_optional"
}
```

**Tests (опционально):**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has user data", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('id');
    pm.expect(jsonData).to.have.property('email');
    pm.expect(jsonData).to.have.property('display_name');
});
```

### Шаг 4: Добавить новый запрос "Delete Account"

1. В папке "Authentication" создайте новый запрос
2. Настройте следующие параметры:

**Основные настройки:**
- Метод: `DELETE`
- URL: `{{base_url}}/auth/delete`
- Headers:
  - `X-API-Key`: `{{api_key}}`
  - `Authorization`: `Bearer {{access_token}}`
  - `Content-Type`: `application/json`

**Body (raw JSON):**
```json
{
  "confirm": true
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Account deleted successfully", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('message');
    pm.expect(jsonData.message).to.include('deleted');
});
```

### Шаг 5: Обновить переменные окружения

Убедитесь, что в вашем окружении Postman есть следующие переменные:

| Переменная | Описание | Пример значения |
|------------|----------|-----------------|
| `base_url` | Базовый URL API | `https://hawklets.com/api` |
| `api_key` | API ключ | `*****` |
| `email` | Email пользователя | `test@example.com` |
| `password` | Пароль пользователя | `TestPassword123!` |
| `access_token` | Access token (устанавливается автоматически) | |
| `refresh_token` | Refresh token (устанавливается автоматически) | |

### Шаг 6: Обновить тестовые скрипты (опционально)

Если у вас есть тестовые скрипты в Postman, обновите их для работы с новыми эндпоинтами:

**Пример скрипта для автоматического получения токенов после логина:**
```javascript
// В запросе "Login" добавьте этот скрипт в раздел "Tests"
pm.test("Login successful", function () {
    pm.response.to.have.status(200);
});

var jsonData = pm.response.json();
pm.environment.set("access_token", jsonData.access_token);
pm.environment.set("refresh_token", jsonData.refresh_token);
```

## Полный рабочий процесс в Postman

### Сценарий 1: Полный цикл работы с пользователем

1. **Register** → Создание нового аккаунта
2. **Login** → Получение access и refresh токенов
3. **Get Current User** → Проверка, что пользователь авторизован
4. **Update Account** → Изменение информации аккаунта
5. **Refresh Token** → Обновление access token
6. **Delete Account** → Удаление аккаунта

### Сценарий 2: Быстрое тестирование

1. Используйте существующие учетные данные в переменных окружения
2. Выполните **Login** для получения токенов
3. Тестируйте защищенные эндпоинты с полученным токеном

## Устранение неполадок

### Проблема: "Field required" ошибка при логине
**Решение:** Убедитесь, что в теле запроса используется поле `email`, а не `username`.

### Проблема: 401 ошибка при вызове защищенных эндпоинтов
**Решение:**
1. Проверьте, что access token установлен в переменных окружения
2. Убедитесь, что токен не истек (действителен 30 минут)
3. Используйте **Refresh Token** для получения нового access token

### Проблема: 422 ошибка при обновлении токена
**Решение:** Убедитесь, что refresh token передается в JSON теле, а не как query параметр.

### Проблема: Переменные окружения не обновляются
**Решение:** Проверьте скрипты в разделе "Tests" запроса Login, они должны устанавливать переменные `access_token` и `refresh_token`.

## Автоматизация тестирования

### Коллекция Runner
Создайте коллекцию для автоматического тестирования:

1. **Register** (сохранить user_id в переменную)
2. **Login** (сохранить токены)
3. **Get Current User** (проверить ответ)
4. **Update Account** (изменить данные)
5. **Get Current User** (проверить обновление)
6. **Refresh Token** (обновить токен)
7. **Delete Account** (очистить тестовые данные)

### Pre-request Scripts
Для автоматической установки заголовков добавьте pre-request script:

```javascript
// Установить заголовок X-API-Key для всех запросов
pm.request.headers.add({
    key: 'X-API-Key',
    value: pm.environment.get('api_key')
});
```

## Экспорт/Импорт коллекции

### Экспорт обновленной коллекции:
1. В Postman выберите коллекцию "Hawklets API"
2. Нажмите "..." → "Export"
3. Выберите формат "Collection v2.1"
4. Сохраните файл

### Импорт коллекции:
1. В Postman нажмите "Import"
2. Выберите экспортированный файл
3. Настройте переменные окружения

## Дополнительные ресурсы

1. **Документация API:** `backend/README_API.md`
2. **Примеры запросов:** `API_EXAMPLES.md`
3. **Тестовый скрипт:** `test_user_auth_complete.py`
4. **Production URL:** `https://hawklets.com/api`
5. **API Key:** `*****`

## Контакты для поддержки

При возникновении проблем с API или Postman коллекцией:
1. Проверьте документацию
2. Запустите тестовый скрипт `test_user_auth_complete.py` для проверки API
3. Обратитесь к разработчикам системы
