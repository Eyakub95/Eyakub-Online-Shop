/* ছোট সহায়ক ফাংশন (তারিখ, সংখ্যা, নিরাপদ লেখা) */
export const $ = (id) => document.getElementById(id);
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
export const LOC = 'bn-BD';
export const bn = (n) => r2(n).toLocaleString(LOC, { maximumFractionDigits: 2 });
export const bnInt = (n) => Number(n).toLocaleString(LOC);
export const riyal = (n) => bn(n) + ' রিয়াল';
export const pad = (n) => String(n).padStart(2, '0');
export const ymd = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
export const toDate = (s) => new Date(s + 'T00:00:00');
export const todayStr = () => ymd(new Date());
export const addDays = (s, n) => { const d = toDate(s); d.setDate(d.getDate() + n); return ymd(d); };
export const dayDiff = (a, b) => { const x = a.split('-'), y = b.split('-'); return Math.round((Date.UTC(+x[0], +x[1] - 1, +x[2]) - Date.UTC(+y[0], +y[1] - 1, +y[2])) / 864e5); };
export const wd = (s) => toDate(s).toLocaleDateString(LOC, { weekday: 'long' });
export const longDate = (s) => toDate(s).toLocaleDateString(LOC, { day: 'numeric', month: 'long', year: 'numeric' });
export const dayNum = (s) => toDate(s).toLocaleDateString(LOC, { day: 'numeric' });
export const monShort = (s) => toDate(s).toLocaleDateString(LOC, { month: 'short' });
export const monthLabel = (k) => toDate(k + '-01').toLocaleDateString(LOC, { month: 'long', year: 'numeric' });
export const shiftMonth = (k, n) => { const p = k.split('-'), d = new Date(+p[0], +p[1] - 1 + n, 1); return d.getFullYear() + '-' + pad(d.getMonth() + 1); };
export const monthDays = (k) => { const p = k.split('-'), n = new Date(+p[0], +p[1], 0).getDate(), a = []; for (let i = 1; i <= n; i++) a.push(k + '-' + pad(i)); return a; };
export const clone = (o) => JSON.parse(JSON.stringify(o));
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const sid = (x) => String(x == null ? '' : x).replace(/[^\w-]/g, '_');

export const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
export const lsSet = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } };
export const lsDel = (k) => { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } };

let toastT;
export function toast(m) { const t = $('toast'); t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2800); }
export const val = (id) => { const e = $(id); return e ? e.value : ''; };
export const PHOTO_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+$/;
