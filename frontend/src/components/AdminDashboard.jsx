import React, { useState, useEffect } from 'react';
import { useNavigate, Outlet, Link, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { toast } from 'sonner';
import axios from 'axios';
import {
  Users,
  BarChart3,
  Settings,
  LogOut,
  Home,
  UserCog,
  Shield,
  Calendar,
  Activity
} from 'lucide-react';

const AdminDashboard = () => {
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin/login');
      return;
    }

    try {
      const response = await axios.get('/api/admin/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setAdminData(response.data);
    } catch (error) {
      toast.error("Ошибка авторизации", {
        description: "Пожалуйста, войдите снова",
      });
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_data');
      navigate('/admin/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_data');
    toast.success("Выход выполнен", {
      description: "Вы успешно вышли из системы",
    });
    navigate('/admin/login');
  };

  const navigationItems = [
    { name: 'Дашборд', path: '/admin', icon: <Home className="w-5 h-5" /> },
    { name: 'Пользователи', path: '/admin/users', icon: <Users className="w-5 h-5" /> },
    { name: 'Статистика', path: '/admin/stats', icon: <BarChart3 className="w-5 h-5" /> },
    { name: 'Администраторы', path: '/admin/admins', icon: <Shield className="w-5 h-5" /> },
    { name: 'Настройки', path: '/admin/settings', icon: <Settings className="w-5 h-5" /> },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка админ-панели...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-lg">H</span>
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="font-bold text-gray-900">Hawklets Admin</h1>
                <p className="text-xs text-gray-500">Панель управления</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 p-4">
          <nav className="space-y-1">
            {navigationItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {item.icon}
                  {sidebarOpen && <span>{item.name}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <UserCog className="w-4 h-4 text-amber-600" />
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {adminData?.username}
                </p>
                <p className="text-xs text-gray-500 capitalize">{adminData?.role}</p>
              </div>
            )}
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full justify-start text-gray-700 hover:text-red-600 hover:border-red-200"
          >
            <LogOut className="w-4 h-4 mr-2" />
            {sidebarOpen && 'Выйти'}
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">
                {navigationItems.find(item => item.path === location.pathname)?.name || 'Дашборд'}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                {new Date().toLocaleDateString('ru-RU', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;