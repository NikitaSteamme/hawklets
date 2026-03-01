// Быстрое исправление для админ-панели на продакшн
// Добавьте этот код в index.html или создайте отдельный файл

(function() {
  // Проверяем текущий путь
  const currentPath = window.location.pathname;
  
  // Если пользователь на /admin, делаем редирект
  if (currentPath === '/admin') {
    // Проверяем, есть ли токен администратора
    const adminToken = localStorage.getItem('admin_token');
    
    if (adminToken) {
      // Если есть токен, перенаправляем на дашборд
      window.location.href = '/admin/dashboard';
    } else {
      // Если нет токена, перенаправляем на страницу входа
      window.location.href = '/admin/login';
    }
  }
  
  // Создаем простую страницу входа, если ее нет
  if (currentPath === '/admin/login') {
    // Проверяем, есть ли уже контент
    if (!document.querySelector('.admin-login-container')) {
      document.body.innerHTML = `
        <div class="admin-login-container" style="
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        ">
          <div style="
            background: white;
            padding: 2rem;
            border-radius: 1rem;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            width: 100%;
            max-width: 400px;
          ">
            <div style="text-align: center; margin-bottom: 2rem;">
              <div style="
                width: 60px;
                height: 60px;
                background: #f59e0b;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 1rem;
              ">
                <span style="color: white; font-weight: bold; font-size: 1.5rem;">H</span>
              </div>
              <h1 style="margin: 0; color: #1f2937; font-size: 1.875rem;">Hawklets Admin</h1>
              <p style="color: #6b7280; margin-top: 0.5rem;">Вход в админ-панель</p>
            </div>
            
            <form id="adminLoginForm" style="display: none;">
              <div style="margin-bottom: 1rem;">
                <label style="display: block; margin-bottom: 0.5rem; color: #374151; font-weight: 500;">
                  Имя пользователя
                </label>
                <input type="text" id="username" style="
                  width: 100%;
                  padding: 0.75rem;
                  border: 1px solid #d1d5db;
                  border-radius: 0.5rem;
                  font-size: 1rem;
                  box-sizing: border-box;
                " placeholder="admin">
              </div>
              
              <div style="margin-bottom: 1.5rem;">
                <label style="display: block; margin-bottom: 0.5rem; color: #374151; font-weight: 500;">
                  Пароль
                </label>
                <input type="password" id="password" style="
                  width: 100%;
                  padding: 0.75rem;
                  border: 1px solid #d1d5db;
                  border-radius: 0.5rem;
                  font-size: 1rem;
                  box-sizing: border-box;
                " placeholder="••••••••">
              </div>
              
              <button type="submit" style="
                width: 100%;
                background: #f59e0b;
                color: white;
                padding: 0.75rem;
                border: none;
                border-radius: 0.5rem;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
                transition: background 0.2s;
              " onmouseover="this.style.background='#d97706'" onmouseout="this.style.background='#f59e0b'">
                Войти
              </button>
            </form>
            
            <div id="loginMessage" style="
              text-align: center;
              padding: 1.5rem;
              background: #f3f4f6;
              border-radius: 0.5rem;
              margin-top: 1rem;
            ">
              <p style="margin: 0; color: #4b5563;">
                Админ-панель находится в разработке.<br>
                Используйте API для аутентификации.
              </p>
              <div style="margin-top: 1rem;">
                <a href="/" style="
                  color: #f59e0b;
                  text-decoration: none;
                  font-weight: 500;
                ">Вернуться на главную</a>
              </div>
            </div>
            
            <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #e5e7eb;">
              <p style="font-size: 0.875rem; color: #9ca3af; text-align: center; margin: 0;">
                Для доступа необходимы права администратора
              </p>
            </div>
          </div>
        </div>
      `;
      
      // Добавляем обработчик формы
      const form = document.getElementById('adminLoginForm');
      if (form) {
        form.addEventListener('submit', function(e) {
          e.preventDefault();
          const username = document.getElementById('username').value;
          const password = document.getElementById('password').value;
          
          // Простая проверка (в реальном приложении используйте API)
          if (username === 'admin' && password === 'admin123') {
            localStorage.setItem('admin_token', 'temp_token');
            window.location.href = '/admin/dashboard';
          } else {
            alert('Неверное имя пользователя или пароль');
          }
        });
      }
    }
  }
})();

// Добавьте этот скрипт в index.html перед закрывающим тегом </body>
// <script src="/quick_admin_fix.js"></script>