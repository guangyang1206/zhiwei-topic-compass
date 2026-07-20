import { ReactNode } from 'react';

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
