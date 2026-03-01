// MongoDB shell script для создания администратора
// Запуск: mongo hawklets create_admin_mongodb.js

print("=== Создание администратора Hawklets ===");

// Проверяем подключение
try {
    db.runCommand({ ping: 1 });
    print("✓ MongoDB подключен успешно");
} catch (e) {
    print("✗ Ошибка подключения к MongoDB: " + e);
    quit(1);
}

// Проверяем, существует ли уже администратор
var existingAdmin = db.admins.findOne({
    $or: [
        { email: "admin@hawklets.com" },
        { username: "admin" }
    ]
});

if (existingAdmin) {
    print("Администратор уже существует:");
    print("  ID: " + existingAdmin._id);
    print("  Email: " + existingAdmin.email);
    print("  Username: " + existingAdmin.username);
    print("  Role: " + (existingAdmin.role || "admin"));
    quit(0);
}

// Создаем хеш пароля (SHA256 для простоты)
// Внимание: Для продакшн используйте bcrypt!
function sha256(str) {
    return CryptoJS.SHA256(str).toString();
}

// Пароль по умолчанию: admin123
var password = "admin123";
var passwordHash = sha256(password);

// Создаем администратора
var adminData = {
    email: "admin@hawklets.com",
    username: "admin",
    full_name: "System Administrator",
    role: "superadmin",
    permissions: ["*"],
    auth: {
        password_hash: passwordHash,
        last_login: null
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null
};

var result = db.admins.insertOne(adminData);

if (result.insertedId) {
    print("✓ Администратор успешно создан!");
    print("  ID: " + result.insertedId);
    print("  Email: " + adminData.email);
    print("  Username: " + adminData.username);
    print("  Password: " + password);
    print("  Role: " + adminData.role);
    print("  Permissions: " + JSON.stringify(adminData.permissions));
    print("");
    print("ВАЖНО: Используется простой SHA256 хеш.");
    print("Для продакшн обновите пароль через админ-панель или используйте bcrypt.");
} else {
    print("✗ Ошибка создания администратора");
    quit(1);
}

// Проверяем коллекции
print("");
print("=== Проверка коллекций ===");
var collections = db.getCollectionNames();
print("Доступные коллекции: " + collections.join(", "));

if (collections.includes("admins")) {
    var adminCount = db.admins.countDocuments();
    print("Количество администраторов: " + adminCount);
}

if (collections.includes("users")) {
    var userCount = db.users.countDocuments();
    print("Количество пользователей: " + userCount);
}

print("");
print("=== Инструкции для тестирования ===");
print("1. Войдите в админ-панель: https://hawklets.com/admin/login");
print("2. Используйте credentials:");
print("   Email: admin@hawklets.com");
print("   Password: admin123");
print("");
print("3. Проверьте API эндпоинты:");
print("   curl -X POST -H 'Content-Type: application/json' \\");
print("     -d '{\"email\":\"admin@hawklets.com\",\"password\":\"admin123\"}' \\");
print("     https://hawklets.com/api/admin/auth/login");
print("");
print("Администратор создан успешно!");