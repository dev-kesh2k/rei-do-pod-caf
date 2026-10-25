import { useState, type FormEvent } from 'react';
import { errorText } from '../lib/api';
import { maskPhone, phoneDigits, useCliente } from '../lib/customer';

/** Entrar com o celular (e o nome no primeiro acesso). Fica lembrado no aparelho. */
export default function LoginCliente({ titulo = 'Entre com seu celular', texto }: { titulo?: string; texto?: string }) {
  const { entrar } = useCliente();
  const [phone, setPhone] = useState('');
  const [nome, setNome] = useState('');
  const [pedeNome, setPedeNome] = useState(false);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro('');
    const d = phoneDigits(phone);
    if (d.length < 10) return setErro('Informe o celular com DDD.');
    if (pedeNome && !nome.trim()) return setErro('Informe seu nome.');
    setEnviando(true);
    try {
      const r = await entrar(d, pedeNome ? nome.trim() : undefined);
      if (r === 'precisa-nome') setPedeNome(true);
    } catch (err) {
      setErro(errorText(err, 'Não foi possível entrar'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="loja-card space-y-4 p-4 sm:p-6">
      <div>
        <h2 className="font-display text-2xl font-extrabold uppercase">{titulo}</h2>
        <p className="text-sm text-texto-2">{texto ?? 'Sem senha: seus pedidos e endereço ficam ligados ao seu número.'}</p>
      </div>
      <label className="block space-y-1.5">
        <span className="adm-label">Celular com DDD</span>
        <input
          className="adm-input px-3.5"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="(45) 99999-9999"
          value={phone}
          onChange={(e) => {
            setPhone(maskPhone(e.target.value));
            setPedeNome(false);
          }}
          required
        />
      </label>
      {pedeNome && (
        <label className="entrada block space-y-1.5">
          <span className="adm-label">Primeiro acesso: como você se chama?</span>
          <input className="adm-input px-3.5" autoComplete="name" maxLength={80} value={nome} onChange={(e) => setNome(e.target.value)} autoFocus required />
        </label>
      )}
      {erro && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{erro}</p>}
      <button type="submit" disabled={enviando} className="botao-ouro adm-btn w-full text-base font-bold uppercase tracking-wider">
        {enviando ? 'Entrando…' : pedeNome ? 'Criar e entrar' : 'Continuar'}
      </button>
    </form>
  );
}
