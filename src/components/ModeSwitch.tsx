import { ExperienceMode } from '../types';

export function ModeSwitch({
  mode,
  onChange,
}: {
  mode: ExperienceMode;
  onChange: (mode: ExperienceMode) => void;
}) {
  return (
    <div className="inline-flex rounded-full border border-white/12 bg-white/6 p-1">
      {([
        { key: 'beginner', label: 'Beginner' },
        { key: 'advanced', label: 'Advanced' },
      ] as const).map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onChange(item.key)}
          className={`rounded-full px-4 py-2 text-xs font-semibold tracking-[0.18em] transition ${
            mode === item.key
              ? 'bg-[var(--color-sand)] text-[var(--color-ink)]'
              : 'text-white/70 hover:text-white'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
