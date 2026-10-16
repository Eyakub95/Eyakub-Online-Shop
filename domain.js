/* হিসাবের নিয়ম: কার পালা, কত রেট, কার কত পাওনা */
import { S } from './store.js';
import { dayDiff, todayStr, r2, monthDays } from './util.js';

export const mem = (id) => S.members.find((x) => x.id === id);
export const memberName = (id) => { const m = mem(id); return m ? m.name : 'অজানা সদস্য'; };
export const liveMembers = () => S.members.filter((m) => !m.removed);
export const actives = () => liveMembers().filter((m) => m.active !== false);
export const liveEntries = () => S.entries.filter((e) => !e.deleted);
export function cookOn(date) { const a = actives(); if (!a.length) return null; return a[((dayDiff(date, S.start) % a.length) + a.length) % a.length]; }
export const monthEntries = (k) => liveEntries().filter((e) => e.date.slice(0, 7) === k).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
export const sum = (l) => l.reduce((a, e) => a + (+e.total || 0), 0);
export function mealOf(date, m) { const d = S.meals[date]; if (d && d[m.id] != null) return +d[m.id] || 0; return (m.active !== false && !m.removed && date <= todayStr()) ? 1 : 0; }

export function report(k) {
  const ms = monthEntries(k), tot = sum(ms), days = monthDays(k), t = todayStr();
  const spent = {}, cnt = {}, meals = {}, eat = {};
  let totalMeals = 0, totalEat = 0;
  S.members.forEach((m) => { spent[m.id] = 0; cnt[m.id] = 0; meals[m.id] = 0; eat[m.id] = 0; });
  ms.forEach((e) => { spent[e.memberId] = (spent[e.memberId] || 0) + (+e.total || 0); cnt[e.memberId] = (cnt[e.memberId] || 0) + 1; });
  S.members.forEach((m) => { days.forEach((d) => { const n = mealOf(d, m); meals[m.id] += n; if (n > 0) eat[m.id]++; }); totalMeals += meals[m.id]; totalEat += eat[m.id]; });
  const rate = totalMeals > 0 ? tot / totalMeals : 0, elapsed = days.filter((d) => d <= t).length || days.length;
  const rows = S.members.filter((m) => (!m.removed && m.active !== false) || spent[m.id] > 0 || meals[m.id] > 0).map((m) => {
    const sp = spent[m.id] || 0, cost = r2(meals[m.id] * rate);
    return { id: m.id, name: m.name, spent: sp, buys: cnt[m.id] || 0, meals: meals[m.id], eatDays: eat[m.id], cost, bal: r2(sp - cost) };
  }).sort((x, y) => y.spent - x.spent);
  return { ms, tot, totalMeals, totalEat, rate, avgBuy: ms.length ? tot / ms.length : 0, perDay: tot / elapsed, rows };
}
