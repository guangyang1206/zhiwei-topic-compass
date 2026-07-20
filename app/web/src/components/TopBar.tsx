import { NavLink } from 'react-router-dom';
import { useI18n } from '../lib/i18n';
import { Theme } from '../hooks/useTheme';

export function TopBar({ theme, toggleTheme }: { theme: Theme; toggleTheme: () => void }) {
  const { lang, toggle, t } = useI18n();

  const nav = [
    { to: '/', label: t('看板', 'Dashboard'), end: true },
    { to: '/score', label: t('选题评分', 'Score'), end: false },
    { to: '/posts', label: t('发布记录', 'Posts'), end: false },
    { to: '/docs', label: 'API', end: false },
  ];

  return (
    <header
      className="sticky top-0 z-30 border-b border-hairline"
      style={{ background: 'color-mix(in srgb, var(--canvas) 88%, transparent)', backdropFilter: 'blur(8px)' }}
    >
      <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-6 px-5">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-5 w-5 rounded-sm"
            style={{ background: 'var(--accent)' }}
            aria-hidden
          />
          <span className="text-[15px] font-medium text-ink">知微 ZhiWei</span>
        </div>

        <nav className="flex items-center gap-1">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `rounded-md px-3 py-1.5 text-[13px] transition-colors ${
                  isActive ? 'text-ink' : 'text-ink-subtle hover:text-ink-muted'
                }`
              }
              style={({ isActive }) => (isActive ? { background: 'var(--surface-2)' } : {})}
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={toggle}
            className="rounded-md border border-hairline-strong px-2.5 py-1.5 text-[12px] text-ink-muted transition-colors hover:text-ink"
            title={t('切换语言', 'Switch language')}
          >
            {lang === 'zh' ? 'EN' : '中'}
          </button>
          <button
            onClick={toggleTheme}
            className="rounded-md border border-hairline-strong px-2.5 py-1.5 text-[12px] text-ink-muted transition-colors hover:text-ink"
            title={t('切换主题', 'Toggle theme')}
          >
            {theme === 'light' ? '◐' : '◑'}
          </button>
        </div>
      </div>
    </header>
  );
}
