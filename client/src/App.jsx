import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Students from './pages/Students.jsx';
import StudentForm from './pages/StudentForm.jsx';
import StudentProfile from './pages/StudentProfile.jsx';
import Classes from './pages/Classes.jsx';
import Teachers from './pages/Teachers.jsx';
import Salaries from './pages/Salaries.jsx';
import AttendanceStudents from './pages/AttendanceStudents.jsx';
import AttendanceTeachers from './pages/AttendanceTeachers.jsx';
import AttendanceReport from './pages/AttendanceReport.jsx';
import Fees from './pages/Fees.jsx';
import Dues from './pages/Dues.jsx';
import Receipt from './pages/Receipt.jsx';
import Exams from './pages/Exams.jsx';
import ExamMarks from './pages/ExamMarks.jsx';
import Marksheet from './pages/Marksheet.jsx';
import ClassResult from './pages/ClassResult.jsx';
import { getToken, setToken } from './api.js';

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      return getToken() ? JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(getToken()), (c) => c.charCodeAt(0)))) : null;
    } catch {
      return null;
    }
  });
  const navigate = useNavigate();

  const handleLogin = (token, u) => {
    setToken(token);
    setUser(u ? { name: u.name, role: u.role } : null);
    navigate('/');
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    navigate('/login');
  };

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<Layout user={user} onLogout={handleLogout} />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/students" element={<Students />} />
        <Route path="/students/new" element={<StudentForm />} />
        <Route path="/students/:id" element={<StudentProfile />} />
        <Route path="/students/:id/edit" element={<StudentForm />} />
        <Route path="/classes" element={<Classes />} />
        <Route path="/teachers" element={<Teachers />} />
        <Route path="/salaries" element={<Salaries />} />
        <Route path="/attendance/students" element={<AttendanceStudents />} />
        <Route path="/attendance/teachers" element={<AttendanceTeachers />} />
        <Route path="/attendance/report" element={<AttendanceReport />} />
        <Route path="/fees" element={<Fees />} />
        <Route path="/fees/dues" element={<Dues />} />
        <Route path="/fees/receipt/:feeId" element={<Receipt />} />
        <Route path="/exams" element={<Exams />} />
        <Route path="/exams/:id/marks" element={<ExamMarks />} />
        <Route path="/exams/:id/marksheet/:studentId" element={<Marksheet />} />
        <Route path="/exams/:id/results" element={<ClassResult />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
