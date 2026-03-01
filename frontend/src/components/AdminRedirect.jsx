import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminRedirect = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Проверяем, есть ли токен администратора
    const token = localStorage.getItem('admin_token');
    
    if (token) {
      // Если есть токен, перенаправляем на дашборд
      navigate('/admin/dashboard');
    } else {
      // Если нет токена, перенаправляем на страницу входа
      navigate('/admin/login');
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="mt-4 text-gray-600">Перенаправление в админ-панель...</p>
      </div>
    </div>
  );
};

export default AdminRedirect;