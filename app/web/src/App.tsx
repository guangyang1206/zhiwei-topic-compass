import { Routes, Route } from 'react-router-dom';
import { TopBar } from './components/TopBar';
import { useTheme } from './hooks/useTheme';
import Dashboard from './pages/Dashboard';
import Score from './pages/Score';
import Posts from './pages/Posts';
import ApiDocs from './pages/ApiDocs';

export default function App() {
  const { theme, toggle } = useTheme();
  return (
    <div className="min-h-screen">
      <TopBar theme={theme} toggleTheme={toggle} />
      <main className="mx-auto max-w-[1200px] px-5 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/score" element={<Score />} />
          <Route path="/posts" element={<Posts />} />
          <Route path="/docs" element={<ApiDocs />} />
        </Routes>
      </main>
    </div>
  );
}
