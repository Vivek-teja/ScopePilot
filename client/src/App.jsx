import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DemoProvider, useDemoSession } from './hooks/DemoContext.jsx';
import AppShell from './components/AppShell.jsx';
import LoginPage from './pages/LoginPage.jsx';
import WorkspacePage from './pages/WorkspacePage.jsx';
import ProjectsPage from './pages/ProjectsPage.jsx';
import ProjectDetailPage from './pages/ProjectDetailPage.jsx';
import ChangeRequestDetailPage from './pages/ChangeRequestDetailPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import './App.css';

/**
 * ProtectedRoute – redirects to demo login if no session exists.
 * In Part 2, this guard will check a real auth token instead.
 */
function ProtectedRoute({ children }) {
  const { session } = useDemoSession();
  if (!session) return <Navigate to="/" replace />;
  return <AppShell>{children}</AppShell>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LoginPage />} />

      {/* Protected – require demo session */}
      <Route
        path="/workspace"
        element={<ProtectedRoute><WorkspacePage /></ProtectedRoute>}
      />
      <Route
        path="/projects"
        element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>}
      />
      <Route
        path="/projects/:projectId"
        element={<ProtectedRoute><ProjectDetailPage /></ProtectedRoute>}
      />
      <Route
        path="/projects/:projectId/changes/:crId"
        element={<ProtectedRoute><ChangeRequestDetailPage /></ProtectedRoute>}
      />

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <DemoProvider>
        <AppRoutes />
      </DemoProvider>
    </BrowserRouter>
  );
}
