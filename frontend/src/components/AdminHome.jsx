import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { toast } from 'sonner';
import axios from 'axios';
import {
  Users,
  UserPlus,
  Shield,
  Clock,
  TrendingUp,
  Activity,
  Calendar,
  BarChart3
} from 'lucide-react';

const AdminHome = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await axios.get('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setStats(response.data);
    } catch (error) {
      toast.error("Ошибка загрузки статистики", {
        description: error.response?.data?.detail || "Не удалось загрузить данные",
      });
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Всего пользователей",
      value: stats?.total_users || 0,
      icon: <Users className="w-6 h-6 text-blue-500" />,
      change: `+${stats?.users_last_24h || 0} за сутки`,
      color: "bg-blue-50 border-blue-200"
    },
    {
      title: "Лист ожидания",
      value: stats?.total_waitlist || 0,
      icon: <UserPlus className="w-6 h-6 text-green-500" />,
      change: `+${stats?.waitlist_last_24h || 0} за сутки`,
      color: "bg-green-50 border-green-200"
    },
    {
      title: "Администраторы",
      value: stats?.total_admins || 0,
      icon: <Shield className="w-6 h-6 text-purple-500" />,
      change: "Активные",
      color: "bg-purple-50 border-purple-200"
    },
    {
      title: "Статус сервера",
      value: stats?.server_status === "healthy" ? "Работает" : "Ошибка",
      icon: <Activity className="w-6 h-6 text-amber-500" />,
      change: "Время: " + new Date(stats?.timestamp).toLocaleTimeString('ru-RU'),
      color: "bg-amber-50 border-amber-200"
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка статистики...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Дашборд админ-панели</h1>
        <p className="text-gray-600 mt-2">
          Обзор статистики и управления приложением Hawklets
        </p>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <Card key={index} className={`border-2 ${card.color}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">
                {card.title}
              </CardTitle>
              <div className="p-2 rounded-lg bg-white">
                {card.icon}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{card.value}</div>
              <p className="text-xs text-gray-500 mt-2">{card.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Действия */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-2 border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Быстрые действия
            </CardTitle>
            <CardDescription>
              Часто используемые функции админ-панели
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button className="h-12 justify-start" variant="outline">
                <Users className="w-4 h-4 mr-2" />
                Управление пользователями
              </Button>
              <Button className="h-12 justify-start" variant="outline">
                <Shield className="w-4 h-4 mr-2" />
                Администраторы
              </Button>
              <Button className="h-12 justify-start" variant="outline">
                <Calendar className="w-4 h-4 mr-2" />
                События
              </Button>
              <Button className="h-12 justify-start" variant="outline">
                <BarChart3 className="w-4 h-4 mr-2" />
                Аналитика
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              Последняя активность
            </CardTitle>
            <CardDescription>
              Недавние действия в системе
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { time: "10:30", action: "Новый пользователь зарегистрирован", user: "user@example.com" },
                { time: "09:45", action: "Обновлен шаблон тренировки", user: "Админ" },
                { time: "Вчера", action: "Добавлен в лист ожидания", user: "waiting@example.com" },
                { time: "2 дня назад", action: "Создан отчет по активности", user: "Система" }
              ].map((activity, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50">
                  <div className="w-2 h-2 bg-amber-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{activity.action}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm text-gray-500">{activity.user}</span>
                      <span className="text-xs text-gray-400">{activity.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Информация о системе */}
      <Card className="border-2 border-gray-200">
        <CardHeader>
          <CardTitle>Информация о системе</CardTitle>
          <CardDescription>
            Технические данные и состояние сервисов
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h3 className="font-medium text-gray-700">Версия API</h3>
              <p className="text-gray-900">1.0.0</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-gray-700">База данных</h3>
              <p className="text-gray-900">MongoDB (работает)</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-gray-700">Последнее обновление</h3>
              <p className="text-gray-900">
                {stats?.timestamp ? new Date(stats.timestamp).toLocaleString('ru-RU') : 'Нет данных'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminHome;