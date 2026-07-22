import { Suspense, lazy } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { TopBar } from './components/TopBar';
import { useTheme } from './hooks/useTheme';
import { useI18n } from './lib/i18n';
import { PageLoader, EmptyState, Button } from './components/ui';

// 路由级代码分包：recharts（Dashboard）与各页按需加载，压缩首屏包体
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Score = lazy(() => import('./pages/Score'));
const Posts = lazy(() => import('./pages/Posts'));
const ApiDocs = lazy(() => import('./pages/ApiDocs'));

export default function App() {
  const { theme, toggle } = useTheme();
  const { t } = useI18n();
  return (
    <div className="min-h-screen">
      <TopBar theme={theme} toggleTheme={toggle} />
      <main className="mx-auto max-w-[1200px] px-5 py-8">
        <Suspense fallback={<PageLoader text={t('加载中…', 'Loading…')} />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/score" element={<Score />} />
            <Route path="/posts" element={<Posts />} />
            <Route path="/docs" element={<ApiDocs />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

function NotFound() {
  const { t } = useI18n();
  return (
    <div className="py-16">
      <EmptyState
        title={<span className="mono text-[40px] font-medium text-ink-muted">404</span>}
        hint={t('页面走丢了，返回看板继续分析选题。', 'This page is missing. Head back to the dashboard.')}
        action={
          <Link to="/">
            <Button>{t('返回看板', 'Back to dashboard')}</Button>
          </Link>
        }
      />
    </div>
  );
}
