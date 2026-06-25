import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import StudentTestPage from './pages/StudentTestPage';
import StudentResultPage from './pages/StudentResultPage';
import TeacherLoginPage from './pages/TeacherLoginPage';
import TeacherClassSelectPage from './pages/TeacherClassSelectPage';
import TeacherDashboardPage from './pages/TeacherDashboardPage';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/test" element={<StudentTestPage />} />
        <Route path="/result/:id" element={<StudentResultPage />} />
        <Route path="/teacher" element={<TeacherLoginPage />} />
        <Route path="/teacher/class" element={<TeacherClassSelectPage />} />
        <Route path="/teacher/dashboard" element={<TeacherDashboardPage />} />
      </Routes>
    </Layout>
  );
}
