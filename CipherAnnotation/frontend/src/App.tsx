/**
 * App Component
 * Main application routing and layout setup
 */

import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/shared/ProtectedRoute';

// Pages
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import NotFoundPage from '@/pages/NotFoundPage';
import DocumentsPage from '@/pages/DocumentsPage';
import DocumentDetailPage from '@/pages/DocumentDetailPage';
import PublicDocumentsPage from '@/pages/PublicDocumentsPage';
import ProfilePage from '@/pages/ProfilePage';
import AnnotationPage from '@/pages/AnnotationPage';

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Landing page (public, no Layout) */}
        <Route path="/" element={<LandingPage />} />

        {/* Layout wrapper for authenticated routes */}
        <Route element={<Layout />}>
          {/* Auth pages (no layout) */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected routes */}
          <Route
            path="/documents"
            element={
              <ProtectedRoute>
                <DocumentsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/documents/public"
            element={
              <ProtectedRoute>
                <PublicDocumentsPage />
              </ProtectedRoute>
            }
          />

          {/* Document Detail - view/edit a specific document */}
          <Route
            path="/documents/:documentId"
            element={
              <ProtectedRoute>
                <DocumentDetailPage />
              </ProtectedRoute>
            }
          />

          {/* Document Edit - redirect to detail page */}
          <Route
            path="/documents/:documentId/edit"
            element={
              <ProtectedRoute>
                <DocumentDetailPage />
              </ProtectedRoute>
            }
          />

          {/* AnnotationPage - annotate document pages */}
          <Route
            path="/documents/:documentId/annotate/:pageId"
            element={
              <ProtectedRoute>
                <AnnotationPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          {/* 404 Not Found */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
