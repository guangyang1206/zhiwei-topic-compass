import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type Lang = 'zh' | 'en';

interface I18nCtx {
  lang: Lang;
  toggle: () => void;
  t: (zh: string, en: string) => string;
}

const Ctx = createContext<I18nCtx>({ lang: 'zh', toggle: () => {}, t: (zh) => zh });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('lang') as Lang) || 'zh');
  const toggle = useCallback(() => {
    setLang((prev) => {
      const next = prev === 'zh' ? 'en' : 'zh';
      localStorage.setItem('lang', next);
      document.documentElement.lang = next === 'zh' ? 'zh-CN' : 'en';
      return next;
    });
  }, []);
  const t = useCallback((zh: string, en: string) => (lang === 'zh' ? zh : en), [lang]);
  return <Ctx.Provider value={{ lang, toggle, t }}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
