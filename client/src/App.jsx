import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DemoProvider, useDemoSession } from './hooks/DemoContext.jsx';
import { ProjectTabsProvider } from './hooks/ProjectTabsContext.jsx';
import AppShell from './components/AppShell.jsx';
import LoginPage from './pages/LoginPage.jsx';
import WorkspacePage from './pages/WorkspacePage.jsx';
import ProjectsPage from './pages/ProjectsPage.jsx';
import ProjectDetailPage from './pages/ProjectDetailPage.jsx';
import ChangeRequestDetailPage from './pages/ChangeRequestDetailPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import { LoadingState, ErrorState } from './components/ui.jsx';
import './App.css';

/**
 * ProtectedRoute – guards authenticated routes.
 * Displays LoadingState while verifying/restoring session, and ErrorState if API fails.
 */
function ProtectedRoute({ children }) {
  const { session, loading, error, retryRestore } = useDemoSession();
  if (loading) {
    return <LoadingState message="Restoring session..." />;
  }
  if (error) {
    return (
      <div style={{ padding: '2rem', maxWidth: '600px', margin: '4rem auto' }}>
        <ErrorState
          message={error}
          onRetry={retryRestore}
        />
      </div>
    );
  }
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
        <ProjectTabsProvider>
          <AppRoutes />
        </ProjectTabsProvider>
      </DemoProvider>
    </BrowserRouter>
  );
}
