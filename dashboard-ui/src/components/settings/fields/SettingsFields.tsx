interface SettingsInputProps {
  label: string;
  description?: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: 'text' | 'number' | 'password' | 'color';
  placeholder?: string;
  mono?: boolean;
}

export function SettingsInput({
  label,
  description,
  value,
  onChange,
  type = 'text',
  placeholder,
  mono,
}: SettingsInputProps) {
  return (
    <div className="space-y-2">
      <div>
        <label className="block text-sm font-medium text-ink">{label}</label>
        {description && <p className="mt-0.5 text-xs text-ink-muted">{description}</p>}
      </div>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint transition-colors focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-soft)] ${mono ? 'font-mono' : ''}`}
      />
    </div>
  );
}

interface SettingsTextareaProps {
  label: string;
  description?: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  mono?: boolean;
}

export function SettingsTextarea({
  label,
  description,
  value,
  onChange,
  rows = 4,
  mono,
}: SettingsTextareaProps) {
  return (
    <div className="space-y-2">
      <div>
        <label className="block text-sm font-medium text-ink">{label}</label>
        {description && <p className="mt-0.5 text-xs text-ink-muted">{description}</p>}
      </div>
      <textarea
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint transition-colors focus:border-[var(--accent)] focus:outline-none ${mono ? 'font-mono' : ''}`}
      />
    </div>
  );
}

interface SettingsSelectProps {
  label: string;
  description?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}

export function SettingsSelect({ label, description, value, onChange, options }: SettingsSelectProps) {
  return (
    <div className="space-y-2">
      <div>
        <label className="block text-sm font-medium text-ink">{label}</label>
        {description && <p className="mt-0.5 text-xs text-ink-muted">{description}</p>}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-2.5 text-sm text-ink focus:border-[var(--accent)] focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-zinc-900">
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface SettingsSliderProps {
  label: string;
  description?: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
}

export function SettingsSlider({
  label,
  description,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix = '',
}: SettingsSliderProps) {
  return (
    <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3.5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-ink">{label}</p>
          {description && <p className="text-xs text-ink-muted">{description}</p>}
        </div>
        <span className="font-mono text-sm tabular-nums text-[var(--accent)]">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[var(--surface-overlay)] accent-[var(--accent)]"
      />
    </div>
  );
}

interface SettingsSegmentedProps {
  label: string;
  description?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}

export function SettingsSegmented({
  label,
  description,
  value,
  onChange,
  options,
}: SettingsSegmentedProps) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium text-ink">{label}</p>
        {description && <p className="text-xs text-ink-muted">{description}</p>}
      </div>
      <div className="flex flex-wrap gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`rounded-lg px-3 py-2 text-xs font-medium transition-all ${
              value === o.value
                ? 'bg-[var(--accent-soft)] text-ink shadow-sm'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
