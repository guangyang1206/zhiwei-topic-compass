import { ReactNode, useEffect } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-lg border border-hairline bg-surface-1 ${className}`}
      style={{ boxShadow: 'var(--shadow-sm)' }}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: boolean;
}) {
  return (
    <Card className="p-5">
      <div className="text-[13px] text-ink-subtle">{label}</div>
      <div
        className={`mono mt-2 text-[28px] font-medium leading-none ${accent ? 'text-accent' : 'text-ink'}`}
      >
        {value}
      </div>
      {hint && <div className="mt-2 text-[12px] text-ink-tertiary">{hint}</div>}
    </Card>
  );
}

const levelColor: Record<string, string> = {
  强推: 'var(--accent)',
  可做: 'var(--violet)',
  谨慎: 'var(--arch, #BA7517)',
  不建议: 'var(--danger)',
};

export function LevelBadge({ level }: { level: string }) {
  const c = levelColor[level] || 'var(--ink-subtle)';
  return (
    <span
      className="inline-flex items-center rounded-sm px-2 py-0.5 text-[12px] font-medium"
      style={{ color: c, background: 'color-mix(in srgb, ' + c + ' 12%, transparent)' }}
    >
      {level}
    </span>
  );
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost';
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  const base =
    'inline-flex items-center justify-center rounded-md px-4 py-2 text-[13px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const styles =
    variant === 'primary'
      ? { background: 'var(--accent)', color: '#fff' }
      : { background: 'transparent', color: 'var(--ink-muted)', border: '1px solid var(--hairline-strong)' };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={base} style={styles}>
      {children}
    </button>
  );
}

/** 轻量模态框：遮罩 + 居中卡片，Esc 关闭 */
export function Modal({
  open,
  onClose,
  title,
  children,
  width = 560,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  width?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = ''; };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8"
      style={{ background: 'color-mix(in srgb, #000 44%, transparent)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="mt-4 w-full rounded-xl border border-hairline bg-surface-1"
        style={{ maxWidth: width, boxShadow: 'var(--shadow-lg, 0 12px 40px rgba(0,0,0,.18))' }}
      >
        <div className="flex items-center justify-between border-b border-hairline px-5 py-3.5">
          <h3 className="text-[15px] font-medium text-ink">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-ink-tertiary transition-colors hover:bg-surface-2 hover:text-ink"
            aria-label="close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

/** 右侧滑出抽屉：遮罩 + 右侧面板，Esc 关闭 */
export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  width = 440,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  width?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = ''; };
  }, [open, onClose]);

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-200 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      style={{ background: 'color-mix(in srgb, #000 40%, transparent)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="absolute right-0 top-0 flex h-full flex-col border-l border-hairline bg-surface-1 transition-transform duration-200 ease-out"
        style={{
          width: '100%',
          maxWidth: width,
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          boxShadow: 'var(--shadow-lg, -12px 0 40px rgba(0,0,0,.18))',
        }}
      >
        <div className="flex items-start justify-between border-b border-hairline px-5 py-3.5">
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-medium text-ink">{title}</h3>
            {subtitle && <p className="mt-0.5 truncate text-[12px] text-ink-tertiary">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="ml-3 shrink-0 rounded-md p-1 text-ink-tertiary transition-colors hover:bg-surface-2 hover:text-ink"
            aria-label="close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

/** 小图标按钮（表格行内操作用） */
export function IconButton({
  onClick,
  title,
  danger = false,
  children,
}: {
  onClick?: () => void;
  title?: string;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-tertiary transition-colors hover:bg-surface-2"
      style={danger ? { color: 'var(--danger)' } : undefined}
    >
      {children}
    </button>
  );
}

/** 空状态占位 */
export function EmptyState({ title, hint, action }: { title: ReactNode; hint?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      <div className="text-[14px] font-medium text-ink-muted">{title}</div>
      {hint && <div className="max-w-[320px] text-[12px] text-ink-tertiary">{hint}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** 品牌旋转指示器 */
export function Spinner({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin"
      style={{ color: 'var(--accent)' }}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.2" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** 页面级加载态（含 Suspense fallback 复用） */
export function PageLoader({ text }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <Spinner size={22} />
      {text && <div className="text-[13px] text-ink-subtle">{text}</div>}
    </div>
  );
}

/** 统一错误态：文案 + 重试 */
export function ErrorState({ text, onRetry, retryLabel = '重试' }: { text: string; onRetry?: () => void; retryLabel?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: 'color-mix(in srgb, var(--danger) 12%, transparent)' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2">
          <path d="M12 8v5M12 16.5v.5" strokeLinecap="round" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      </div>
      <p className="max-w-[380px] text-[13px] text-ink-muted">{text}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-1 rounded-md border border-hairline-strong px-3.5 py-1.5 text-[13px] text-ink-muted transition-colors hover:border-accent hover:text-accent">
          {retryLabel}
        </button>
      )}
    </div>
  );
}
