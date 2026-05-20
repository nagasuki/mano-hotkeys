interface Props {
  checked: boolean
  onChange(v: boolean): void
  label?: string
}

export function Toggle({ checked, onChange, label }: Props) {
  return (
    <label className="flex items-center gap-2 text-sm text-ink-300">
      {label && <span>{label}</span>}
      <button
        onClick={() => onChange(!checked)}
        className={[
          'relative h-5 w-9 rounded-full transition',
          checked ? 'bg-accent-500' : 'bg-ink-700'
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-0.5 h-4 w-4 rounded-full bg-white transition',
            checked ? 'left-4' : 'left-0.5'
          ].join(' ')}
        />
      </button>
    </label>
  )
}
