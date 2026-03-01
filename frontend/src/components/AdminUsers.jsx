import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import axios from 'axios';
import {
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  User,
  Mail,
  Calendar,
  Clock,
  Filter
} from 'lucide-react';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [isLastPage, setIsLastPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState(null);

  const pageSize = 50;

  useEffect(() => {
    fetchUsers(currentPage);
    fetchStats();
  }, [currentPage]);

  const fetchUsers = async (page) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await axios.get(`/api/admin/users/${page}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setUsers(response.data.users);
      setTotalUsers(response.data.total_users);
      setIsLastPage(response.data.is_last_page);
    } catch (error) {
      toast.error("Ошибка загрузки пользователей", {
        description: error.response?.data?.detail || "Не удалось загрузить данные",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await axios.get('/api/admin/users/count', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    // В будущем можно реализовать поиск по API
    toast.info("Поиск будет реализован в следующем обновлении");
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (!isLastPage) {
      setCurrentPage(currentPage + 1);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.display_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Заголовок и статистика */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Управление пользователями</h1>
        <p className="text-gray-600 mt-2">
          Всего пользователей: {totalUsers} • За последние 24 часа: {stats?.users_last_24h || 0}
        </p>
      </div>

      {/* Поиск и фильтры */}
      <Card className="border-2 border-gray-200">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Поиск по email или имени..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12"
                />
              </div>
            </form>
            <div className="flex gap-2">
              <Button variant="outline" className="h-12">
                <Filter className="w-4 h-4 mr-2" />
                Фильтры
              </Button>
              <Button variant="outline" className="h-12">
                Экспорт
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Таблица пользователей */}
      <Card className="border-2 border-gray-200">
        <CardHeader>
          <CardTitle>Список пользователей</CardTitle>
          <CardDescription>
            Страница {currentPage} • Показано {filteredUsers.length} из {totalUsers} пользователей
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="mt-4 text-gray-600">Загрузка пользователей...</p>
              </div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">Пользователи не найдены</h3>
              <p className="text-gray-500 mt-2">
                {searchQuery ? 'Попробуйте изменить поисковый запрос' : 'На этой странице нет пользователей'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Пользователь</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Email</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Дата регистрации</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Последний вход</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{user.display_name}</p>
                              <p className="text-sm text-gray-500">ID: {user.id.substring(0, 8)}...</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <Mail className="w-4 h-4 text-gray-400 mr-2" />
                            <span className="text-gray-700">{user.email}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                            <span className="text-gray-700">{formatDate(user.created_at)}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 text-gray-400 mr-2" />
                            <span className="text-gray-700">
                              {user.last_login ? formatDateTime(user.last_login) : 'Никогда'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline">
                              Просмотр
                            </Button>
                            <Button size="sm" variant="outline" className="text-amber-600 border-amber-200">
                              Редактировать
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Пагинация */}
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  Показано {(currentPage - 1) * pageSize + 1} - {(currentPage - 1) * pageSize + filteredUsers.length} из {totalUsers}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    className="h-10 w-10"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, Math.ceil(totalUsers / pageSize)) }, (_, i) => {
                      const pageNum = i + 1;
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="h-10 w-10"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    {Math.ceil(totalUsers / pageSize) > 5 && (
                      <span className="px-2 text-gray-500">...</span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleNextPage}
                    disabled={isLastPage}
                    className="h-10 w-10"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                <div className="text-sm text-gray-500">
                  {isLastPage ? 'Последняя страница' : `Страница ${currentPage} из ${Math.ceil(totalUsers / pageSize)}`}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Информация о пагинации */}
      <Card className="border-2 border-amber-200 bg-amber-50">
        <CardContent className="p-6">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-medium text-amber-900">Информация о пагинации</h3>
              <p className="text-amber-800/80 text-sm mt-1">
                • На каждой странице отображается максимум 50 пользователей<br />
                • Флаг "is_last_page" в API указывает, является ли текущая страница последней<br />
                • Для перехода между страницами используйте кнопки навигации или номера страниц
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUsers;