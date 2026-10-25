import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api, errorText, getToken, setToken } from '../../lib/api';
import { Marca, useTitulo } from '../../components/Site';

export default function Login() {
  useTitulo('Entrar — Painel REI DO POD CAF');
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (getToken()) return <Navigate to="/admin" replace />;

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      const r = await api<{ token: string }>('auth/login', { method: 'POST', body: { email, password }, auth: false });
      setToken(r.token);
      nav('/admin', { replace: true });
    } catch (err) {
      setErro(errorText(err, 'Não foi possível entrar'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center px-[max(1.25rem,env(safe-area-inset-left))] py-[max(2rem,env(safe-area-inset-top))]">
      <div className="brilho-topo" aria-hidden="true" />
      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Marca />
        </div>
        <form onSubmit={entrar} className="adm-card entrada space-y-4 p-5 sm:p-7">
          <div>
            <h1 className="font-display text-3xl font-extrabold uppercase">Painel</h1>
            <p className="text-sm text-texto-2">Entre para cuidar do catálogo.</p>
          </div>
          <label className="block space-y-1.5">
            <span className="adm-label">E-mail</span>
            <input
              className="adm-input px-3.5"
              type="email"
              inputMode="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="adm-label">Senha</span>
            <input
              className="adm-input px-3.5"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {erro && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{erro}</p>}
          <button type="submit" disabled={enviando} className="botao-ouro adm-btn w-full text-base font-bold uppercase tracking-wider">
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
