import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type Toast = { id: number; text: string; error?: boolean };
const Ctx = createContext<(text: string, error?: boolean) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<Toast[]>([]);
  const show = useCallback((text: string, error = false) => {
    const id = Date.now() + Math.random();
    setList((l) => [...l.slice(-2), { id, text, error }]);
    setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), error ? 4500 : 2500);
  }, []);
  return (
    <Ctx.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-[max(1rem,env(safe-area-inset-top))] z-[100] flex flex-col items-center gap-2 px-4">
        {list.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`entrada pointer-events-auto max-w-full rounded-xl border px-4 py-3 text-sm font-medium shadow-2xl backdrop-blur ${
              t.error ? 'border-red-400/30 bg-red-950/90 text-red-100' : 'border-ouro/30 bg-superficie-2/95 text-texto'
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
