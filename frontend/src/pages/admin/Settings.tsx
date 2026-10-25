import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api, errorText } from '../../lib/api';
import { logoUrl, useCatalog, waLink, type Settings as S } from '../../lib/catalog';
import { resizeImage } from '../../lib/image';
import { useToast } from '../../components/Toast';
import { useTitulo } from '../../components/Site';

function Bloco({ titulo, children, texto }: { titulo: string; texto?: string; children: React.ReactNode }) {
  return (
    <section className="adm-card space-y-4 p-4 sm:p-5">
      <div>
        <h2 className="font-display text-2xl font-extrabold uppercase">{titulo}</h2>
        {texto && <p className="text-xs text-texto-3">{texto}</p>}
      </div>
      {children}
    </section>
  );
}

function Campo({ label, dica, children }: { label: string; dica?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block min-w-0 space-y-1.5">
      <span className="adm-label">{label}</span>
      {children}
      {dica && <span className="block break-words text-xs text-texto-3">{dica}</span>}
    </label>
  );
}

export default function Settings() {
  useTitulo('Ajustes — Painel');
  const toast = useToast();
  const { reload } = useCatalog();
  const fileRef = useRef<HTMLInputElement>(null);
  const [s, setS] = useState<S | null>(null);
  const [logoV, setLogoV] = useState(0);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [enviandoLogo, setEnviandoLogo] = useState(false);
  const [senha, setSenha] = useState({ current: '', password: '', confirm: '' });
  const [trocando, setTrocando] = useState(false);

  useEffect(() => {
    api<{ settings: S; logoVersion: number }>('admin/settings')
      .then((r) => {
        setS(r.settings);
        setLogoV(r.logoVersion);
      })
      .catch((e) => setErro(errorText(e, 'Não foi possível carregar os ajustes')));
  }, []);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!s) return;
    setSalvando(true);
    try {
      const r = await api<{ settings: S }>('admin/settings', { method: 'PUT', body: s });
      setS(r.settings);
      toast('Ajustes salvos');
      reload();
    } catch (err) {
      toast(errorText(err, 'Não foi possível salvar'), true);
    } finally {
      setSalvando(false);
    }
  }

  async function enviarLogo(file?: File) {
    if (!file) return;
    setEnviandoLogo(true);
    try {
      const logo = await resizeImage(file, 256);
      const r = await api<{ logoVersion: number }>('admin/logo', { method: 'PUT', body: { logo } });
      setLogoV(r.logoVersion);
      toast('Logo atualizada');
      reload();
    } catch (err) {
      toast(errorText(err, 'Não foi possível enviar a logo'), true);
    } finally {
      setEnviandoLogo(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function trocarSenha(e: FormEvent) {
    e.preventDefault();
    if (senha.password !== senha.confirm) return toast('A confirmação não bate com a nova senha', true);
    setTrocando(true);
    try {
      await api('auth/password', { method: 'POST', body: { current: senha.current, password: senha.password } });
      setSenha({ current: '', password: '', confirm: '' });
      toast('Senha alterada. Atualize também no Cofre de senhas do Hub.');
    } catch (err) {
      toast(errorText(err), true);
    } finally {
      setTrocando(false);
    }
  }

  if (erro) return <div className="adm-card p-6 text-sm text-red-300">{erro}</div>;
  if (!s) return <div className="adm-card h-96 animate-pulse" />;

  const set = (k: keyof S, v: string) => setS((x) => (x ? { ...x, [k]: v } : x));

  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="font-display text-3xl font-extrabold uppercase sm:text-4xl">Ajustes</h1>

      <form onSubmit={salvar}>
        <Bloco titulo="Suporte e pagamento" texto="O WhatsApp é o canal de suporte (os pedidos são feitos no app).">
          <Campo label="Número do WhatsApp" dica="Com DDI e DDD, só números. Ex.: 5545998078084">
            <input
              className="adm-input px-3.5"
              type="tel"
              inputMode="numeric"
              autoComplete="off"
              value={s.whatsapp}
              onChange={(e) => set('whatsapp', e.target.value.replace(/\D/g, ''))}
            />
          </Campo>
          <Campo label="Chave Pix (opcional)" dica="Aparece para o cliente que escolher Pix na entrega.">
            <input className="adm-input px-3.5" maxLength={120} value={s.pixKey} onChange={(e) => set('pixKey', e.target.value)} />
          </Campo>
          <Campo label="Mensagem inicial do suporte (WhatsApp)">
            <textarea className="adm-input min-h-20 px-3.5 py-2.5" maxLength={500} value={s.msgHelp} onChange={(e) => set('msgHelp', e.target.value)} />
          </Campo>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <a href={waLink(s.whatsapp, s.msgHelp)} target="_blank" rel="noopener noreferrer" className="adm-btn adm-btn-ghost px-4">
              Testar no WhatsApp
            </a>
            <button type="submit" disabled={salvando} className="botao-ouro adm-btn px-6 font-bold">
              {salvando ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </Bloco>
      </form>

      <form onSubmit={salvar}>
        <Bloco titulo="Banner do início" texto="Título grande e texto do topo da loja. A última palavra do título fica dourada.">
          <Campo label="Título">
            <input className="adm-input px-3.5" maxLength={60} value={s.bannerTitle} onChange={(e) => set('bannerTitle', e.target.value)} />
          </Campo>
          <Campo label="Texto">
            <textarea className="adm-input min-h-20 px-3.5 py-2.5" maxLength={200} value={s.bannerText} onChange={(e) => set('bannerText', e.target.value)} />
          </Campo>
          <div className="flex justify-end">
            <button type="submit" disabled={salvando} className="botao-ouro adm-btn px-6 font-bold">
              {salvando ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </Bloco>
      </form>

      <Bloco titulo="Logo" texto="Aparece no topo da loja e do painel. Use uma imagem quadrada.">
        <div className="flex items-center gap-4">
          <img src={logoUrl(logoV)} alt="Logo atual" className="h-20 w-20 shrink-0 rounded-full object-cover ring-1 ring-ouro/40" />
          <div className="min-w-0">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => enviarLogo(e.target.files?.[0])} />
            <button type="button" disabled={enviandoLogo} className="adm-btn adm-btn-ghost px-4" onClick={() => fileRef.current?.click()}>
              {enviandoLogo ? 'Enviando…' : 'Trocar logo'}
            </button>
          </div>
        </div>
      </Bloco>

      <form onSubmit={trocarSenha}>
        <Bloco titulo="Senha do painel">
          <Campo label="Senha atual">
            <input className="adm-input px-3.5" type="password" autoComplete="current-password" required value={senha.current} onChange={(e) => setSenha({ ...senha, current: e.target.value })} />
          </Campo>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Nova senha" dica="Mínimo de 8 caracteres">
              <input className="adm-input px-3.5" type="password" autoComplete="new-password" minLength={8} required value={senha.password} onChange={(e) => setSenha({ ...senha, password: e.target.value })} />
            </Campo>
            <Campo label="Repita a nova senha">
              <input className="adm-input px-3.5" type="password" autoComplete="new-password" minLength={8} required value={senha.confirm} onChange={(e) => setSenha({ ...senha, confirm: e.target.value })} />
            </Campo>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={trocando} className="adm-btn adm-btn-ghost px-5">
              {trocando ? 'Trocando…' : 'Trocar senha'}
            </button>
          </div>
        </Bloco>
      </form>
    </div>
  );
}
