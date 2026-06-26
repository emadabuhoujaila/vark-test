import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import StudentTestPage from './pages/StudentTestPage';
import StudentResultPage from './pages/StudentResultPage';
import TeacherAuthPage from './pages/teacher/TeacherAuthPage';
import TeacherHomePage from './pages/teacher/TeacherHomePage';
import TeacherMessagesPage from './pages/teacher/TeacherMessagesPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/test" element={<StudentTestPage />} />
        <Route path="/result/:id" element={<StudentResultPage />} />
        <Route path="/teacher" element={<TeacherAuthPage />} />
        <Route path="/teacher/home" element={<TeacherHomePage />} />
        <Route path="/teacher/messages" element={<TeacherMessagesPage />} />
        <Route path="/admin" element={<AdminLoginPage />} />
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
      </Routes>
    </Layout>
  );
}
