/* সব পর্দার HTML */
import { S, UI, CONFIGURED, ADMIN_EMAIL, AUTOLOCK, pendingCount, failedCount } from './state.js';
import { esc, bn, bnInt, riyal, wd, longDate, dayNum, monShort, monthLabel, toDate, todayStr, addDays, LOC, PHOTO_RE, lsGet, r2 } from './util.js';
import { mem, memberName, liveMembers, liveEntries, cookOn, monthEntries, sum, mealOf, report } from './domain.js';

const PAL = ['#2A8F5A', '#D9822B', '#3A7BD5', '#C2456B', '#7A5BD0', '#18948F', '#B8892B'];
export function av(id, sz) {
  const m = mem(id), nm = m ? m.name : '?', p = m && m.photo, st = '--s:' + (sz || 32) + 'px';
  if (p && PHOTO_RE.test(p)) return '<img class="av" style="' + st + '" src="' + p + '" alt="">';
  let h = 0; String(id).split('').forEach((c) => { h = (h * 31 + c.charCodeAt(0)) >>> 0; });
  return '<span class="av" style="' + st + ';background:' + PAL[h % PAL.length] + '" aria-hidden="true">' + esc(Array.from(nm.trim())[0] || '?') + '</span>';
}
export const nameChip = (id, sz) => '<span class="nm">' + av(id, sz || 28) + '<span>' + esc(memberName(id)) + '</span></span>';
export const balTxt = (b) => (b > 0.004 ? 'পাবেন ' + riyal(b) : b < -0.004 ? 'দেবেন ' + riyal(-b) : 'মিলে গেছে');
export const itemsText = (e) => (e.items || []).map((x) => x.n + (+x.p > 0 ? ' (' + bn(x.p) + ')' : '')).join('، ');
const pwField = (id, label, ac) => '<label class="f">' + label + '<div class="pwwrap"><input type="password" id="' + id + '" autocomplete="' + (ac || 'current-password') + '"><button type="button" class="eye" data-act="eye" data-for="' + id + '" aria-label="দেখান">👁</button></div></label>';
export { pwField };

/* ---------- লগইন / সেটআপ ---------- */
export function viewSetup() {
  return '<div class="authwrap"><div class="brandbox"><img src="logo.svg" alt="" width="110" height="110"><h1>বাজার হিসাব</h1><p>সেটআপ বাকি আছে</p></div>'
    + '<div class="card fgrid"><b>js/config.js ফাইলটা ভরতে হবে</b><div class="small muted">অ্যাপ এখনো Supabase-এর সাথে যুক্ত হয়নি। GitHub-এ <b>js/config.js</b> ফাইল খুলে তিনটা লেখা বসান:</div>'
    + '<ol class="steps small"><li><b>supabaseUrl</b> — Supabase → Project Settings → API → Project URL</li><li><b>supabaseAnonKey</b> — একই পাতার "anon public" key</li><li><b>adminEmail</b> — আপনার ইমেইল</li></ol>'
    + '<div class="small muted">পুরো ধাপগুলো README.md ফাইলে বাংলায় লেখা আছে। সেভ (Commit) করার ১-২ মিনিট পর পেজ রিফ্রেশ করুন।</div></div></div>';
}
export function viewLoginErr() { return '<div class="authwrap"><div class="card warn">অ্যাপ চালু করা যায়নি। ইন্টারনেট সংযোগ দেখে পেজ রিফ্রেশ করুন।</div></div>'; }
export function viewLogin() {
  let h = '<div class="authwrap"><div class="brandbox"><img src="logo.svg" alt="" width="120" height="120"><h1>বাজার হিসাব</h1><p>শুধু অ্যাডমিনের জন্য</p></div>';
  h += '<form class="card fgrid" id="loginf" autocomplete="on"><input type="email" id="em" value="' + esc(ADMIN_EMAIL) + '" autocomplete="username" hidden>' + pwField('pw1', 'অ্যাডমিন পাসওয়ার্ড');
  h += '<div class="err" id="aerr"></div><button class="btn primary block" type="submit">ঢুকুন</button><button class="linkbtn" type="button" data-act="forgot">পাসওয়ার্ড ভুলে গেছেন?</button></form></div>';
  return h;
}
export function viewRecovery() {
  return '<div class="authwrap"><div class="brandbox"><img src="logo.svg" alt="" width="100" height="100"><h1>নতুন পাসওয়ার্ড</h1><p>নতুন পাসওয়ার্ড বানিয়ে ঢুকুন</p></div>'
    + '<form class="card fgrid" id="recf">' + pwField('rp1', 'নতুন পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)', 'new-password') + '<div class="err" id="aerr"></div><button class="btn primary block" type="submit">সংরক্ষণ করুন</button></form></div>';
}
export function viewLoadError() {
  return '<div class="card warn fgrid"><b>তথ্য আনা যায়নি</b><div class="small">' + esc(UI.loadErr) + '</div><button class="btn primary" data-act="retry">আবার চেষ্টা করুন</button></div>';
}

/* ---------- মূল পর্দা ---------- */
const monthBar = () => '<div class="month"><button data-act="pm" aria-label="আগের মাস">‹</button><div class="name">' + esc(monthLabel(UI.month)) + '</div><button data-act="nm" aria-label="পরের মাস">›</button></div>';
export function entryCard(e) {
  const items = e.items || [], rows = items.map((i) => '<tr><td>' + esc(i.n) + '</td><td class="num">' + (+i.p > 0 ? riyal(i.p) : '') + '</td></tr>').join('');
  const sm = items.slice(0, 3).map((i) => esc(i.n)).join('، ');
  return '<details class="card entry"><summary><div class="date"><b>' + dayNum(e.date) + '</b><span>' + monShort(e.date) + '</span></div>'
    + '<div class="mid"><h3>' + nameChip(e.memberId, 30) + '</h3><div class="small muted">' + wd(e.date) + (sm ? ' · ' + sm + (items.length > 3 ? '…' : '') : '') + '</div></div>'
    + '<div class="amt num">' + bn(e.total) + '<small>রিয়াল</small></div></summary><div class="detail">'
    + (e.menu ? '<div><b>রান্না:</b> ' + esc(e.menu) + '</div>' : '')
    + (rows ? '<table>' + rows + '<tr><td><b>মোট</b></td><td class="num"><b>' + riyal(e.total) + '</b></td></tr></table>' : '')
    + (e.note ? '<div><b>নোট:</b> ' + esc(e.note) + '</div>' : '')
    + '<div class="row"><button class="btn sm" data-act="edit" data-id="' + e.id + '">সম্পাদনা</button><button class="btn sm danger" data-act="trash" data-id="' + e.id + '">ট্র্যাশে পাঠান</button></div></div></details>';
}
export function vHome() {
  const t = todayStr(), c = cookOn(t), n = cookOn(addDays(t, 1)), ms = monthEntries(UI.month), tot = sum(ms), r = report(UI.month);
  let h = '';
  if (!liveMembers().length) h += '<div class="card notice"><b>শুরু করুন</b><div class="small">প্রথমে সদস্যদের নাম যোগ করুন, তারপর বাজার লিখতে পারবেন। পুরোনো অ্যাপের ব্যাকআপ থাকলে সেটিংস → ব্যাকআপ থেকে ফিরিয়ে আনুন।</div><div class="row"><button class="btn primary" data-act="settings">সদস্য যোগ করুন</button></div></div>';
  h += '<section class="card cook"><div class="lbl">আজ ' + wd(t) + ', ' + longDate(t) + '</div><div class="lbl">আজকের রান্না ও বাজার</div><div class="who">' + (c ? av(c.id, 46) + '<span>' + esc(c.name) + '</span>' : 'কোনো সদস্য নেই') + '</div>' + (n ? '<div class="next">আগামীকাল (' + wd(addDays(t, 1)) + '): <b>' + esc(n.name) + '</b></div>' : '') + '</section>';
  h += '<button class="btn primary block" data-tab="add">＋ নতুন বাজার লিখুন</button>';
  const lb = +lsGet('bh4-last-backup') || 0;
  if (liveEntries().length && Date.now() - lb > 14 * 864e5) h += '<div class="card notice"><b>নিজের কাছেও একটা কপি রাখুন</b><div class="small">তথ্য Supabase-এ নিরাপদ আছে ও GitHub-এ প্রতিদিন কপি হয়। তবু মাঝে মাঝে একটা ব্যাকআপ ফাইল নিজের ফোনে রাখা ভালো।</div><button class="btn sm accent" data-act="bkdl">ব্যাকআপ ফাইল নামান</button></div>';
  h += '<section class="card"><h2>এই মাসের হিসাব</h2>' + monthBar() + '<div class="stats" style="margin-top:12px"><div class="stat wide"><b class="num">' + riyal(tot) + '</b><span>মোট বাজার খরচ</span></div>'
    + '<div class="stat"><b class="num">' + riyal(r.rate) + '</b><span>প্রতি বেলা/দিনের রেট</span></div><div class="stat"><b class="num">' + bnInt(ms.length) + ' বার</b><span>বাজার হয়েছে</span></div></div></section>';
  h += '<section><h2>সাম্প্রতিক বাজার</h2>' + (ms.length ? ms.slice(0, 5).map(entryCard).join('<div class="gap"></div>') : '<div class="card empty">এই মাসে এখনো কোনো বাজার লেখা হয়নি।</div>') + '</section>';
  return h;
}
const sheetRows = (l) => l.slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
function sheetHtml(list) {
  if (!list.length) return '<div class="card empty">এই মাসে কিছু লেখা নেই।</div>';
  const rows = sheetRows(list);
  return '<div class="sheetwrap"><table class="sheet"><thead><tr><th>ক্রম</th><th>তারিখ</th><th>বার</th><th>নাম</th><th>বাজারের লিস্ট</th><th class="r">রিয়াল</th><th></th></tr></thead><tbody>'
    + rows.map((e, i) => '<tr><td class="c num">' + bnInt(i + 1) + '</td><td class="nw num">' + toDate(e.date).toLocaleDateString(LOC, { day: '2-digit', month: '2-digit', year: 'numeric' }) + '</td><td class="nw">' + wd(e.date) + '</td><td class="nw"><b>' + nameChip(e.memberId, 24) + '</b></td><td class="lst">' + (esc(itemsText(e)) || '<span class="muted">—</span>') + (e.note ? '<div class="hint">নোট: ' + esc(e.note) + '</div>' : '') + '</td><td class="r num"><b>' + bn(e.total) + '</b></td><td class="nw"><button class="btn sm" data-act="edit" data-id="' + e.id + '" aria-label="সম্পাদনা">✎</button></td></tr>').join('')
    + '</tbody><tfoot><tr><td colspan="5"><b>মোট</b></td><td class="r num"><b>' + bn(sum(rows)) + '</b></td><td></td></tr></tfoot></table></div>'
    + '<div class="row" style="margin-top:10px"><button class="btn sm" data-act="copysheet">Excel/শিটে বসানোর জন্য কপি</button></div>';
}
export function listBody() {
  const q = UI.q.trim().toLowerCase();
  const list = monthEntries(UI.month).filter((e) => {
    if (UI.fm && e.memberId !== UI.fm) return false; if (!q) return true;
    return ((e.note || '') + ' ' + (e.menu || '') + ' ' + memberName(e.memberId) + ' ' + (e.items || []).map((i) => i.n).join(' ')).toLowerCase().indexOf(q) > -1;
  });
  const h = '<div class="small muted" style="margin-bottom:10px">' + bnInt(list.length) + ' টি বাজার · মোট ' + riyal(sum(list)) + '</div>';
  if (UI.view === 'sheet') return h + sheetHtml(list);
  return h + (list.length ? list.map(entryCard).join('<div class="gap"></div>') : '<div class="card empty">কিছু পাওয়া যায়নি।</div>');
}
export function vList() {
  const opts = '<option value="">সব সদস্য</option>' + S.members.map((m) => '<option value="' + m.id + '"' + (UI.fm === m.id ? ' selected' : '') + '>' + esc(m.name) + '</option>').join('');
  return '<h2>বাজারের তালিকা</h2>' + monthBar()
    + '<div class="row"><button class="btn sm ' + (UI.view === 'sheet' ? 'primary' : '') + '" data-act="vw" data-v="sheet">শিট</button><button class="btn sm ' + (UI.view === 'cards' ? 'primary' : '') + '" data-act="vw" data-v="cards">কার্ড</button></div>'
    + '<div class="two"><input type="text" id="q" placeholder="জিনিস বা নাম খুঁজুন" value="' + esc(UI.q) + '" aria-label="খুঁজুন"><select id="fm" aria-label="সদস্য">' + opts + '</select></div><div id="listBody">' + listBody() + '</div>';
}
const itemRow = (n, p) => '<div class="item"><input type="text" class="in-n" placeholder="জিনিসের নাম" value="' + esc(n || '') + '" aria-label="জিনিসের নাম"><input type="number" class="in-p" inputmode="decimal" step="0.01" min="0" placeholder="দাম" value="' + esc(p == null ? '' : p) + '" aria-label="দাম"><button type="button" class="x" data-act="rmrow" aria-label="সরান">×</button></div>';
export { itemRow };
export function vAdd() {
  const e = UI.editId ? S.entries.find((x) => x.id === UI.editId) : null, d = e ? e.date : todayStr();
  const mid = e ? e.memberId : (cookOn(d) || {}).id;
  const opts = S.members.filter((m) => !m.removed || m.id === mid).map((m) => '<option value="' + m.id + '"' + (m.id === mid ? ' selected' : '') + '>' + esc(m.name) + (m.active === false ? ' (বন্ধ)' : '') + '</option>').join('');
  if (!opts) return '<h2>নতুন বাজার</h2><div class="card empty">আগে "সেটিংস" থেকে সদস্য যোগ করুন।<br><br><button class="btn primary" data-act="settings">সদস্য যোগ করুন</button></div>';
  const items = e && e.items && e.items.length ? e.items : [{ n: '', p: '' }, { n: '', p: '' }, { n: '', p: '' }];
  return '<h2>' + (e ? 'বাজার সম্পাদনা' : 'নতুন বাজার লিখুন') + '</h2><form id="f" class="card fgrid" autocomplete="off">'
    + '<label class="f">তারিখ<input type="date" id="f-date" value="' + d + '" required></label><div class="hint" id="f-wd" style="margin-top:-8px">বার: ' + wd(d) + '</div>'
    + '<label class="f">কে বাজার করেছেন<select id="f-mem">' + opts + '</select></label>'
    + '<label class="f">আজ কী রান্না হয়েছে (ঐচ্ছিক)<input type="text" id="f-menu" placeholder="যেমন: মুরগির ঝোল, ডাল, ভাত" value="' + esc(e ? e.menu : '') + '"></label>'
    + '<div><div class="small muted" style="margin-bottom:6px">জিনিসপত্রের তালিকা (নাম ও দাম)</div><div id="rows">' + items.map((i) => itemRow(i.n, i.p)).join('') + '</div><button type="button" class="btn sm" data-act="addrow">+ আরেকটি জিনিস</button></div>'
    + '<label class="f">মোট কত রিয়ালের বাজার<input type="number" id="f-total" inputmode="decimal" step="0.01" min="0" placeholder="০" value="' + (e ? esc(e.total) : '') + '" required></label><div class="hint" id="f-sum"></div>'
    + '<label class="f">নোট (ঐচ্ছিক)<textarea id="f-note" placeholder="যেমন: বাকি টাকা পরে দেওয়া হবে">' + esc(e ? e.note : '') + '</textarea></label>'
    + '<div class="row"><button class="btn primary grow" type="submit">' + (e ? 'পরিবর্তন সংরক্ষণ' : 'সংরক্ষণ করুন') + '</button>' + (e ? '<button class="btn" type="button" data-act="canceledit">বাতিল</button>' : '') + '</div>'
    + (e ? '<button class="btn danger" type="button" data-act="trash" data-id="' + e.id + '">ট্র্যাশে পাঠান</button>' : '') + '</form>';
}
export function vMeals() {
  const d = UI.mdate || todayStr(), r = report(UI.month), list = liveMembers().filter((m) => m.active !== false || (S.meals[d] && S.meals[d][m.id] != null));
  let h = '<h2>খাওয়ার হিসাব</h2><div class="card fgrid"><label class="f">তারিখ<input type="date" id="m-date" value="' + d + '"></label><div class="hint" style="margin-top:-8px">বার: ' + wd(d) + '</div>'
    + '<div class="small muted">কিছু না বদলালে সবাই দিনে ১ ধরা হয়। যে খায়নি তার ০ করুন, অতিথি বা দুইবেলা হলে বাড়ান।</div>'
    + (list.length ? list.map((m) => { const ov = S.meals[d] && S.meals[d][m.id] != null;
      return '<div class="meal"><div><b>' + nameChip(m.id, 32) + '</b>' + (ov ? ' <span class="tag">বদলানো</span>' : '') + '</div><div class="ctl"><button class="ic" data-act="mm" data-id="' + m.id + '" aria-label="কমান">−</button><b class="num">' + bnInt(mealOf(d, m)) + '</b><button class="ic" data-act="mp" data-id="' + m.id + '" aria-label="বাড়ান">+</button></div></div>'; }).join('') : '<div class="empty">কোনো সদস্য নেই</div>')
    + '<button class="btn sm" data-act="mreset">এই দিনের হিসাব আগের মতো (সবাই ১) করুন</button></div>';
  h += '<h2>' + esc(monthLabel(UI.month)) + '-এর খাওয়া</h2>' + monthBar()
    + '<div class="sheetwrap"><table class="sheet sm"><thead><tr><th>নাম</th><th class="r">বাজার</th><th class="r">দিন</th><th class="r">খাওয়া</th><th class="r">পাওনা/বাকি</th></tr></thead><tbody>'
    + r.rows.map((x) => { const b = x.bal, cls = b > 0.004 ? 'plus' : b < -0.004 ? 'minus' : ''; return '<tr><td><b>' + nameChip(x.id, 24) + '</b></td><td class="r num">' + bn(x.spent) + '</td><td class="r num">' + bnInt(x.eatDays) + '</td><td class="r num">' + bnInt(x.meals) + '</td><td class="r num bal ' + cls + '">' + (b > 0.004 ? '+' : b < -0.004 ? '−' : '') + bn(Math.abs(b)) + '</td></tr>'; }).join('')
    + '</tbody><tfoot><tr><td><b>মোট</b></td><td class="r num"><b>' + bn(r.tot) + '</b></td><td class="r num"><b>' + bnInt(r.totalEat) + '</b></td><td class="r num"><b>' + bnInt(r.totalMeals) + '</b></td><td></td></tr></tfoot></table></div>'
    + '<div class="hint"><span class="bal plus">+ সবুজ = পাবেন</span> · <span class="bal minus">− লাল = দেবেন</span></div>';
  return h;
}
export function vReport() {
  const r = report(UI.month), max = Math.max.apply(null, r.rows.map((x) => x.spent).concat([1]));
  let h = '<h2>মাসের রিপোর্ট</h2>' + monthBar();
  h += '<div class="card"><div class="stats"><div class="stat wide"><b class="num">' + riyal(r.tot) + '</b><span>মোট খরচ · ' + bnInt(r.ms.length) + ' বার বাজার</span></div>'
    + '<div class="stat"><b class="num">' + riyal(r.rate) + '</b><span>প্রতি বেলা/দিনের রেট</span></div><div class="stat"><b class="num">' + bnInt(r.totalMeals) + '</b><span>মোট খাওয়া (সবার যোগ)</span></div>'
    + '<div class="stat"><b class="num">' + riyal(r.avgBuy) + '</b><span>প্রতি বাজারে গড়</span></div><div class="stat"><b class="num">' + riyal(r.perDay) + '</b><span>দিনে গড় খরচ</span></div></div>'
    + '<div class="hint" style="margin-top:8px">রেট = মোট বাজার ÷ সবার মোট খাওয়া। কার খরচ = তার খাওয়া × রেট।</div></div>';
  h += '<div class="card"><h3 style="margin-bottom:12px">কার কত পড়ল</h3>' + (r.rows.length ? r.rows.map((x) => '<div class="bar"><div class="h"><span>' + nameChip(x.id, 30) + '</span><b class="num">' + riyal(x.cost) + '</b></div><div class="small muted">খেয়েছেন ' + bnInt(x.meals) + ' বেলা/দিন · বাজার ' + bnInt(x.buys) + ' বার, মোট ' + riyal(x.spent) + '</div>'
    + '<div class="t"><i style="width:' + Math.round(x.spent / max * 100) + '%"></i></div><div class="bal ' + (x.bal > 0.004 ? 'plus' : x.bal < -0.004 ? 'minus' : '') + '">' + balTxt(x.bal) + '</div></div>').join('') : '<div class="empty">কোনো তথ্য নেই</div>') + '</div>';
  return h + '<div class="row"><button class="btn primary grow" data-act="wa">WhatsApp-এ পাঠান</button><button class="btn grow" data-act="copysum">লেখা কপি করুন</button></div>';
}
export function summaryText() {
  const r = report(UI.month);
  return 'বাজার হিসাব — ' + monthLabel(UI.month) + '\nমোট বাজার: ' + riyal(r.tot) + ' (' + bnInt(r.ms.length) + ' বার, গড় ' + riyal(r.avgBuy) + ')\nমোট খাওয়া: ' + bnInt(r.totalMeals) + ' · রেট: ' + riyal(r.rate) + '\n\n'
    + r.rows.map((x) => x.name + ': খেয়েছেন ' + bnInt(x.meals) + ', পড়ল ' + riyal(x.cost) + ', বাজার করেছেন ' + riyal(x.spent) + ' — ' + balTxt(x.bal)).join('\n');
}
export function sheetTSV() {
  const rows = sheetRows(monthEntries(UI.month)); let t = ['ক্রম', 'তারিখ', 'বার', 'নাম', 'বাজারের লিস্ট', 'রিয়াল'].join('\t');
  rows.forEach((e, i) => { t += '\n' + [bnInt(i + 1), longDate(e.date), wd(e.date), memberName(e.memberId), itemsText(e).replace(/\t|\n/g, ' '), r2(e.total)].join('\t'); });
  return t + '\n\t\t\t\tমোট\t' + r2(sum(rows));
}

/* ---------- সেটিংস ---------- */
const avEdit = (id, sz) => '<label class="avedit" title="ছবি বদলান">' + av(id, sz) + '<span class="cam">📷</span><input type="file" accept="image/*" data-photo="' + id + '" hidden></label>';
export function vSettings() {
  const lm = liveMembers(), trashE = S.entries.filter((e) => e.deleted), trashM = S.members.filter((m) => m.removed);
  const rows = lm.map((m, i) => '<div class="mrow">' + avEdit(m.id, 46) + '<div style="display:grid;gap:6px;min-width:0"><input type="text" data-mname="' + m.id + '" value="' + esc(m.name) + '" aria-label="নাম"><input type="tel" data-mphone="' + m.id + '" value="' + esc(m.phone || '') + '" placeholder="মোবাইল নাম্বার (ঐচ্ছিক)" aria-label="মোবাইল"></div>'
    + '<div class="ops"><label class="sw"><input type="checkbox" data-active="' + m.id + '"' + (m.active !== false ? ' checked' : '') + '>পালায় আছেন</label><button class="ic" data-act="up" data-id="' + m.id + '"' + (i === 0 ? ' disabled' : '') + ' aria-label="উপরে">↑</button><button class="ic" data-act="dn" data-id="' + m.id + '"' + (i === lm.length - 1 ? ' disabled' : '') + ' aria-label="নিচে">↓</button><button class="ic" data-act="rmm" data-id="' + m.id + '" style="color:var(--bad)" aria-label="সরান">×</button></div></div>').join('');
  const c = cookOn(todayStr()), pend = pendingCount(), fail = failedCount();
  let h = '<h2>সেটিংস</h2>';
  h += '<div class="card safe small"><b>আপনার তথ্য নিরাপদ</b><br>তথ্য Supabase ডেটাবেসে থাকে, আর ডেটাবেস নিজেই কিছু মুছতে দেয় না। "মুছুন" চাপলে জিনিসটা নিচের <b>ট্র্যাশে</b> যায়, সেখান থেকে ফেরত আনা যায়। প্রতিটি বদলের আগের রূপ ডেটাবেসের লগে জমা থাকে, আর GitHub-এ প্রতিদিন কপি হয়।'
    + (pend ? '<br><br>⏳ ' + bnInt(pend) + 'টি লেখা নেট এলে জমা হবে।' : '') + '</div>';
  if (fail) h += '<div class="card warn small"><b>' + bnInt(fail) + 'টি লেখা ডেটাবেস নেয়নি</b><br>ফোনে সংরক্ষিত আছে, হারায়নি। <button class="linkbtn" data-act="faildump">বিস্তারিত কপি করুন</button></div>';
  h += '<div class="card"><h3 style="margin-bottom:6px">সদস্য ও রান্নার পালা</h3><div class="small muted">তালিকার ক্রম অনুযায়ী প্রতিদিন একজনের পালা। নাম বদলালে নিজে থেকেই সংরক্ষণ হয়।</div>' + (rows || '<div class="empty">এখনো কোনো সদস্য নেই</div>')
    + '<div class="row" style="margin-top:12px"><input class="grow" type="text" id="newm" placeholder="নতুন সদস্যের নাম"><button class="btn primary" data-act="addm">যোগ করুন</button></div></div>';
  h += '<div class="card fgrid"><h3>পালা শুরুর তারিখ</h3><label class="f">তালিকার প্রথম জন যেদিন রান্না করেছেন বা করবেন<input type="date" id="start" value="' + S.start + '"></label><div class="small">আজকের পালা: <b>' + (c ? esc(c.name) : '—') + '</b></div></div>';
  h += '<div class="card fgrid"><h3>ব্যাকআপ ও পুরোনো তথ্য আনা</h3><div class="small muted">ব্যাকআপ ফাইলে সব সদস্য, বাজার, খাওয়া ও ট্র্যাশের তথ্য থাকে। Google Drive বা WhatsApp-এ নিজের কাছে রাখতে পারেন।</div>'
    + '<div class="row"><button class="btn sm primary" data-act="bkdl">ব্যাকআপ ফাইল নামান</button><button class="btn sm" data-act="bkcopy">লেখা হিসেবে কপি</button></div>'
    + '<div class="small muted">ফিরিয়ে আনতে বা <b>পুরোনো (Firebase) অ্যাপের ব্যাকআপ</b> আনতে: ফাইল বেছে নিন বা লেখা বসান। (আগের তথ্য মুছবে না, শুধু যোগ হবে)</div>'
    + '<div class="row"><label class="btn sm" style="cursor:pointer">ফাইল বেছে নিন<input type="file" id="bkfile" accept=".json,.txt,application/json,text/plain" hidden></label></div>'
    + '<textarea id="bk" rows="3" placeholder="ব্যাকআপ লেখা এখানে বসান"></textarea><button class="btn sm" data-act="bkload">লেখা থেকে ফিরিয়ে আনুন</button></div>';
  h += '<div class="card fgrid"><h3>ট্র্যাশ (' + bnInt(trashE.length + trashM.length) + ')</h3>'
    + (trashE.length || trashM.length ? trashE.slice().sort((a, b) => (b.date < a.date ? -1 : 1)).map((e) => '<div class="row between"><div class="small">' + esc(longDate(e.date)) + ' · ' + esc(memberName(e.memberId)) + ' · <b>' + riyal(e.total) + '</b></div><button class="btn sm" data-act="restore" data-id="' + e.id + '">ফেরত আনুন</button></div>').join('')
      + trashM.map((m) => '<div class="row between"><div class="small">সদস্য: <b>' + esc(m.name) + '</b></div><button class="btn sm" data-act="restorem" data-id="' + m.id + '">ফেরত আনুন</button></div>').join('') : '<div class="small muted">ট্র্যাশ খালি।</div>') + '</div>';
  h += '<div class="card fgrid"><h3>অ্যাডমিন পাসওয়ার্ড</h3><button class="btn sm" data-act="chpw">পাসওয়ার্ড বদলান</button><button class="btn sm danger" data-act="logout">লগআউট</button>'
    + '<div class="hint">অ্যাপ ' + bnInt(Math.round(AUTOLOCK / 60000)) + ' মিনিটের বেশি বন্ধ থাকলে নিজে থেকে লক হয়ে আবার পাসওয়ার্ড চাইবে।</div></div>';
  return h;
}
export const TABS = [
  ['home', 'হোম', '<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>'],
  ['list', 'তালিকা', '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>'],
  ['add', 'নতুন', '<path d="M12 5v14M5 12h14"/>'],
  ['meals', 'খাওয়া', '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M16 21V3c-2 1-3.5 3.5-3.5 7 0 2 1 3 3.5 3"/>'],
  ['report', 'রিপোর্ট', '<path d="M5 20V10M12 20V4M19 20v-7"/>']
];
