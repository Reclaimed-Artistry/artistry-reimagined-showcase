import { Toaster as Sonner } from '@/components/ui/sonner';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { LearningProvider } from '@/components/learning/LearningProvider';
import { SiteLayout } from '@/components/learning/SiteLayout';
import Index from '@/pages/Index';
import Paths from '@/pages/Paths';
import PathDetail from '@/pages/PathDetail';
import Lesson from '@/pages/Lesson';
import Project from '@/pages/Project';
import Dashboard from '@/pages/Dashboard';
import Privacy from '@/pages/Privacy';
import NotFound from '@/pages/NotFound';

export default function App() {
  return (
    <LearningProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<SiteLayout />}>
            <Route path="/" element={<Index />} />
            <Route path="/paths" element={<Paths />} />
            <Route path="/paths/:slug" element={<PathDetail />} />
            <Route path="/paths/:slug/lessons/:lessonSlug" element={<Lesson />} />
            <Route path="/paths/:slug/project" element={<Project />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Sonner theme="light" position="bottom-right" closeButton richColors />
    </LearningProvider>
  );
}
