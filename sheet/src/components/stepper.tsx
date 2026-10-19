import type { ComponentChildren } from "preact";

export function Stepper({ label, value, min = -Infinity, max = Infinity, onChange, suffix, step = 1 }:
  { label: string; value: number; min?: number; max?: number; onChange: (v: number) => void; suffix?: ComponentChildren; step?: number }) {
  const dec = () => { if (value - step >= min) onChange(value - step); };
  const inc = () => { if (value + step <= max) onChange(value + step); };
  return (
    <span class="steel-stepper" role="group" aria-label={label}>
      <button type="button" aria-label={`decrease ${label}`} onClick={dec} disabled={value - step < min}>−</button>
      <span class="well"><span>{value}</span>{suffix !== undefined && <span class="max">{suffix}</span>}</span>
      <button type="button" aria-label={`increase ${label}`} onClick={inc} disabled={value + step > max}>+</button>
    </span>
  );
}
