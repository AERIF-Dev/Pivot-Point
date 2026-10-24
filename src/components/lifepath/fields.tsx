import { useEffect, useId, useState, type ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WEEKDAYS, type Weekday } from "@/lib/lifepath/types";
import { cn } from "@/lib/utils";

interface BaseProps {
  label: string;
  hint?: ReactNode;
  className?: string | undefined;
}

export function FieldShell({
  id,
  label,
  hint,
  className,
  children,
}: BaseProps & { id: string; children: ReactNode }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function NumberField({
  label,
  hint,
  className,
  value,
  onChange,
  prefix,
  suffix,
  step = 1,
  min = 0,
  max,
}: BaseProps & {
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
  min?: number;
  max?: number;
}) {
  const id = useId();
  const [text, setText] = useState(String(value ?? 0));
  useEffect(() => {
    if (Number(text) !== value) setText(String(value ?? 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <FieldShell id={id} label={label} hint={hint} className={className}>
      <div className="relative">
        {prefix ? (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
            {prefix}
          </span>
        ) : null}
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          max={max}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            const n = Number(e.target.value);
            if (e.target.value === "") onChange(0);
            else if (Number.isFinite(n)) onChange(max != null ? Math.min(max, n) : n);
          }}
          className={cn("tabular h-10 bg-card", prefix && "pl-7", suffix && "pr-14")}
        />
        {suffix ? (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </div>
    </FieldShell>
  );
}

export function TimeField({
  label,
  hint,
  className,
  value,
  onChange,
}: BaseProps & { value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} className={className}>
      <Input
        id={id}
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="tabular h-10 bg-card"
      />
    </FieldShell>
  );
}

export function TextField({
  label,
  hint,
  className,
  value,
  onChange,
  placeholder,
}: BaseProps & { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} className={className}>
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 bg-card"
      />
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  hint,
  className,
  value,
  onChange,
  placeholder,
  rows = 4,
}: BaseProps & {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} className={className}>
      <Textarea
        id={id}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="bg-card text-sm leading-relaxed"
      />
    </FieldShell>
  );
}

export function DayPicker({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: Weekday[];
  onChange: (v: Weekday[]) => void;
  className?: string | undefined;
}) {
  return (
    <fieldset className={cn("space-y-1.5", className)}>
      <legend className="text-sm font-medium text-foreground">{label}</legend>
      <div className="flex flex-wrap gap-1.5 pt-1.5">
        {WEEKDAYS.map((d) => {
          const on = value.includes(d);
          return (
            <button
              key={d}
              type="button"
              aria-pressed={on}
              onClick={() =>
                onChange(on ? value.filter((x) => x !== d) : WEEKDAYS.filter((x) => x === d || value.includes(x)))
              }
              className={cn(
                "h-9 min-w-11 rounded-lg border px-2 text-xs font-semibold transition-colors",
                on
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground",
              )}
            >
              {d}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
