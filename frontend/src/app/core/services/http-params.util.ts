import { HttpParams } from '@angular/common/http';

export function buildHttpParams(
  obj: Record<string, string | number | boolean | null | undefined>
): HttpParams {
  let params = new HttpParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && v !== undefined && v !== '') {
      params = params.set(k, String(v));
    }
  }
  return params;
}

export function formatIsoDate(val: Date | string | null | undefined): string {
  if (!val) return '';
  if (typeof val === 'string') return val.slice(0, 10);
  const y = val.getFullYear();
  const m = String(val.getMonth() + 1).padStart(2, '0');
  const d = String(val.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
