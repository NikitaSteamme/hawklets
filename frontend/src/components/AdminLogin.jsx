import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { toast } from 'sonner';
import axios from 'axios';

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post('/api/admin/auth/login', {
        username,
        password
      });
      
      // Сохраняем токен в localStorage
      localStorage.setItem('admin_token', response.data.access_token);
      localStorage.setItem('admin_data', JSON.stringify(response.data.admin));
      
      toast.success("Успешный вход", {
        description: "Добро пожаловать в админ-панель",
      });
      
      // Перенаправляем на админ-панель
      navigate('/admin');
    } catch (error) {
      toast.error("Ошибка входа", {
        description: error.response?.data?.detail || "Неверное имя пользователя или пароль",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xl">H</span>
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Админ-панель Hawklets</CardTitle>
          <CardDescription className="text-center">
            Войдите в систему для управления приложением
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Имя пользователя</Label>
              <Input
                id="username"
                type="text"
                placeholder="Введите имя пользователя"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                placeholder="Введите пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white font-semibold"
              disabled={loading}
            >
              {loading ? 'Вход...' : 'Войти'}
            </Button>
          </form>
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center">
              Для доступа к админ-панели необходимы специальные права администратора
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;