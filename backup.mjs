// Supabase-এর সব তথ্য JSON ফাইলে নামায় (GitHub Action এটা প্রতিদিন চালায়)।
// ব্যবহার: node scripts/backup.mjs <আউটপুট-ফোল্ডার>
// দরকারি env: SUPABASE_URL, SUPABASE_SERVICE_KEY
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const URL_ = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const KEY = process.env.SUPABASE_SERVICE_KEY || '';
const out = process.argv[2] || 'backup-out';
if (!URL_ || !KEY) { console.error('SUPABASE_URL ও SUPABASE_SERVICE_KEY দরকার'); process.exit(1); }

async function fetchAll(table, order) {
  const rows = []; const size = 1000;
  for (let from = 0; ; from += size) {
    const res = await fetch(`${URL_}/rest/v1/${table}?select=*&order=${order}`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Range: `${from}-${from + size - 1}`, 'Range-Unit': 'items' }
    });
    if (!res.ok) throw new Error(`${table}: HTTP ${res.status} ${await res.text()}`);
    const part = await res.json();
    rows.push(...part);
    if (part.length < size) break;
  }
  return rows;
}

const tables = {
  members: 'ord.asc,id.asc',
  entries: 'date.asc,id.asc',
  meals: 'date.asc,member_id.asc',
  settings: 'key.asc',
  audit_log: 'id.asc'
};
const data = {};
for (const [t, o] of Object.entries(tables)) data[t] = await fetchAll(t, o);

// ছোট ডেটা হলে গিট-ডিফ ভালো দেখায়, তাই প্রতি টেবিল আলাদা ফাইল
mkdirSync(out, { recursive: true });
for (const [t, rows] of Object.entries(data)) writeFileSync(join(out, `${t}.json`), JSON.stringify(rows, null, 1) + '\n');

// অ্যাপে "ফিরিয়ে আনুন" দিয়ে সরাসরি ঢোকানোর মতো একটা ফাইলও
const meals = {};
for (const m of data.meals) if (m.count != null) (meals[m.date] ||= {})[m.member_id] = m.count;
const start = (data.settings.find((s) => s.key === 'start') || {}).value;
const app = {
  app: 'bazar-hisab', v: 4, exportedAt: new Date().toISOString(), start,
  members: data.members.map((m) => ({ id: m.id, name: m.name, phone: m.phone, photo: m.photo, active: m.active, removed: m.removed, order: m.ord })),
  entries: data.entries.map((e) => ({ id: e.id, date: e.date, memberId: e.member_id, menu: e.menu, items: e.items, total: Number(e.total), note: e.note, deleted: e.deleted })),
  meals
};
writeFileSync(join(out, 'bazar-hisab-backup.json'), JSON.stringify(app) + '\n');

console.log(`ঠিক আছে: সদস্য ${data.members.length}, বাজার ${data.entries.length}, খাওয়ার ঘর ${data.meals.length}, লগ ${data.audit_log.length}`);
