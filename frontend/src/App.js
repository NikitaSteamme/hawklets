import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Home } from './components/Home';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import AdminHome from './components/AdminHome';
import AdminUsers from './components/AdminUsers';
import { Toaster } from './components/ui/sonner';

// Placeholder components for other admin pages
const AdminStats = () => <div className="p-6">Статистика (в разработке)</div>;
const AdminAdmins = () => <div className="p-6">Управление администраторами (в разработке)</div>;
const AdminSettings = () => <div className="p-6">Настройки (в разработке)</div>;

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />}>
            <Route index element={<AdminHome />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="stats" element={<AdminStats />} />
            <Route path="admins" element={<AdminAdmins />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </div>
  );
}

export default App;