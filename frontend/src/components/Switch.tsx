/** Chave liga/desliga no estilo do iPhone (verde quando ligada). */
export default function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="inline-flex min-h-11 shrink-0 items-center justify-center disabled:opacity-50"
    >
      <span
        className={`relative inline-block h-[31px] w-[51px] rounded-full transition-colors duration-200 ${
          checked ? 'bg-[#34c759]' : 'bg-[#39393d]'
        }`}
      >
        <span
          className={`absolute left-[2px] top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,.25),0_1px_1px_rgba(0,0,0,.16)] transition-transform duration-200 ${
            checked ? 'translate-x-[20px]' : 'translate-x-0'
          }`}
        />
      </span>
    </button>
  );
}
