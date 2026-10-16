/* বাজার হিসাব v4 — শুধু অ্যাডমিনের অ্যাপ (Supabase + GitHub Pages) */
import * as ST from './store.js';
import { S, CONFIGURED, ADMIN_EMAIL, AUTOLOCK } from './store.js';
import { UI } from './state.js';
import * as V from './views.js';
import { mem, liveMembers, mealOf } from './domain.js';
import { $, esc, uid, r2, val, toast, lsGet, lsSet, todayStr, bnInt, riyal, DATE_RE, sid, PHOTO_RE, wd } from './util.js';

const LASTK = 'bh4-last-active', BKK = 'bh4-last-backup';
let AUTH = false, READY = false, RECOVERY = false, deferred = null, fails = 0, lockUntil = 0;

/* ---------- সংযোগ অবস্থা (হেডারের নিচের লেখা) ---------- */
function paintSync() {
  const el = $('sync'); if (!el) return;
  const online = navigator.onLine !== false, p = ST.pendingCount();
  let cls = '', txt = '';
  if (ST.sync.error) { cls = 'off'; txt = ST.sync.error; }
  else if (!online) { cls = 'off'; txt = 'অফলাইন — নেট এলে নিজেই জমা হবে'; }
  else if (p || ST.sync.flushing) { cls = 'wait'; txt = 'জমা হচ্ছে…'; }
  else txt = 'সব তথ্য Supabase-এ জমা আছে';
  el.innerHTML = '<span class="dot ' + cls + '"></span><span>' + esc(txt) + '</span>';
}

/* ---------- লগইন ---------- */
const badTry = () => { fails++; if (fails >= 5) { fails = 0; lockUntil = Date.now() + 30000; } };
const lockNote = () => { const s = Math.ceil((lockUntil - Date.now()) / 1000); return s > 0 ? 'অনেকবার ভুল হয়েছে। ' + bnInt(s) + ' সেকেন্ড পরে চেষ্টা করুন।' : ''; };
const touch = () => lsSet(LASTK, String(Date.now()));
const expired = () => { const t = +lsGet(LASTK) || 0; return t && Date.now() - t > AUTOLOCK; };

async function submitLogin(ev) {
  ev.preventDefault();
  const err = (m) => { $('aerr').textContent = m; };
  if (Date.now() < lockUntil) { err(lockNote()); return; }
  const p1 = val('pw1'); if (!p1) { err('পাসওয়ার্ড লিখুন'); return; }
  const btn = ev.target.querySelector('button[type=submit]'); btn.disabled = true; err(''); touch();
  const { error } = await ST.sb.auth.signInWithPassword({ email: ADMIN_EMAIL, password: p1 });
  if (!error) { fails = 0; return; }
  btn.disabled = false;
  const m = (error.message || '').toLowerCase();
  if (m.includes('fetch') || m.includes('network')) err('ইন্টারনেট নেই। নেট চালু করে আবার চেষ্টা করুন।');
  else if (error.status === 429 || m.includes('rate')) err('অনেকবার চেষ্টা হয়েছে। কিছুক্ষণ পরে চেষ্টা করুন।');
  else if (m.includes('invalid login') || m.includes('invalid credentials')) { badTry(); err(lockNote() || 'পাসওয়ার্ড ভুল'); }
  else if (m.includes('not confirmed')) err('এই ইউজারের ইমেইল নিশ্চিত করা হয়নি। Supabase-এ ইউজার বানানোর সময় "Auto Confirm User" টিক দিন।');
  else err('ঢোকা গেল না (' + error.message + ')');
}
async function submitRecovery(ev) {
  ev.preventDefault();
  const err = (m) => { $('aerr').textContent = m; }, pw = val('rp1');
  if (pw.length < 6) { err('পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে'); return; }
  const { error } = await ST.sb.auth.updateUser({ password: pw });
  if (error) { err('বদলানো যায়নি (' + error.message + ')'); return; }
  RECOVERY = false; history.replaceState(null, '', location.pathname); toast('পাসওয়ার্ড বদলেছে');
  const { data } = await ST.sb.auth.getSession();
  if (data.session) { if (!AUTH) enterApp(); else render(); } else render();
}
async function doChPw() {
  const cur = val('cp0'), nw = val('cp1'), er = (m) => { $('serr').textContent = m; };
  if (nw.length < 6) { er('নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে'); return; }
  const a = await ST.sb.auth.signInWithPassword({ email: ADMIN_EMAIL, password: cur });
  if (a.error) { er('বর্তমান পাসওয়ার্ড ভুল'); return; }
  const b = await ST.sb.auth.updateUser({ password: nw });
  if (b.error) { er('বদলানো যায়নি (' + b.error.message + ')'); return; }
  closeSheet(); toast('পাসওয়ার্ড বদলেছে');
}

/* ---------- অ্যাপে ঢোকা / বের হওয়া ---------- */
function enterApp() {
  AUTH = true; touch(); document.body.classList.remove('noapp');
  READY = ST.loadCache(); UI.loadErr = ''; render();
  refresh();
}
async function refresh() {
  try { await ST.loadAll(); UI.loadErr = ''; }
  catch (e) { if (!READY) UI.loadErr = e && e.message ? e.message : String(e); else ST.sync.error = ''; }
  READY = READY || !UI.loadErr; paintSync();
  if (UI.tab !== 'add' || UI.loadErr) render();
}
function leaveApp() {
  AUTH = false; READY = false; ST.clearCacheIfSynced(); ST.resetState(); UI.tab = 'home'; UI.editId = null;
  document.body.classList.add('noapp'); render();
}
async function doLogout() { await ST.sb.auth.signOut(); leaveApp(); }

/* ---------- রেন্ডার ---------- */
function render() {
  const v = $('view'); paintSync();
  if (!CONFIGURED) { document.body.classList.add('noapp'); v.innerHTML = V.viewSetup(); return; }
  if (RECOVERY) { document.body.classList.add('noapp'); v.innerHTML = V.viewRecovery(); $('recf').addEventListener('submit', submitRecovery); return; }
  if (!AUTH) { document.body.classList.add('noapp'); v.innerHTML = V.viewLogin(); const f = $('loginf'); if (f) f.addEventListener('submit', submitLogin); return; }
  document.body.classList.remove('noapp');
  if (UI.loadErr) { v.innerHTML = V.viewLoadError(); $('nav').innerHTML = ''; return; }
  if (!READY) { v.innerHTML = '<div class="empty">তথ্য আনা হচ্ছে…</div>'; $('nav').innerHTML = ''; return; }
  $('nav').innerHTML = V.TABS.map((t) => '<button data-tab="' + t[0] + '"' + (UI.tab === t[0] ? ' aria-current="page"' : '') + (t[0] === 'add' ? ' class="add"' : '') + '><svg viewBox="0 0 24 24" aria-hidden="true">' + t[2] + '</svg>' + t[1] + '</button>').join('');
  const fn = { home: V.vHome, list: V.vList, add: V.vAdd, meals: V.vMeals, report: V.vReport, settings: V.vSettings }[UI.tab] || V.vHome;
  v.innerHTML = fn();
  if (UI.tab === 'add') updSum(false);
}
ST.setOnChange((quiet) => { if (quiet === true) paintSync(); else render(); });
const go = (tab) => { if (tab !== 'add') UI.editId = null; UI.tab = tab; render(); window.scrollTo(0, 0); };

/* ---------- বাজার লেখা ---------- */
function updSum(auto) {
  let s = 0; document.querySelectorAll('#rows .in-p').forEach((i) => { s += +i.value || 0; });
  const t = $('f-total'), h = $('f-sum'); if (!t || !h) return;
  if (auto && !t.dataset.manual && s > 0) t.value = r2(s);
  h.textContent = s > 0 ? 'জিনিসের দামের যোগফল: ' + riyal(s) : '';
}
const readItems = () => Array.from(document.querySelectorAll('#rows .item')).map((r) => ({ n: r.querySelector('.in-n').value.trim(), p: r.querySelector('.in-p').value.trim() })).filter((i) => i.n || i.p);
function saveEntryForm() {
  const date = val('f-date'), mid = val('f-mem'), total = +val('f-total');
  if (!date || !mid) { toast('তারিখ ও নাম দিন'); return; }
  if (!(total >= 0) || val('f-total') === '') { toast('মোট টাকা লিখুন'); return; }
  const old = UI.editId ? S.entries.find((x) => x.id === UI.editId) : null;
  const e = old ? Object.assign({}, old) : { id: uid() };
  Object.assign(e, { date, memberId: mid, menu: val('f-menu').trim(), items: readItems(), total: r2(total), note: val('f-note').trim(), deleted: false, deletedAt: null });
  UI.editId = null; UI.month = date.slice(0, 7); UI.tab = 'list';
  ST.saveEntry(e); toast(old ? 'পরিবর্তন সংরক্ষিত' : 'বাজার সংরক্ষিত হয়েছে'); window.scrollTo(0, 0);
}

/* ---------- ব্যাকআপ ও ইমপোর্ট ---------- */
const backupObj = () => ({ app: 'bazar-hisab', v: 4, exportedAt: new Date().toISOString(), start: S.start, members: S.members, entries: S.entries, meals: S.meals });
function downloadBackup() {
  const blob = new Blob([JSON.stringify(backupObj())], { type: 'application/json' }), a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'bazar-hisab-backup-' + todayStr() + '.json'; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); lsSet(BKK, String(Date.now())); toast('ব্যাকআপ ফাইল নামছে');
}
function importData(o) {   // নতুন ও পুরোনো (Firebase) দুই ধরনের ব্যাকআপই নেয়; শুধু যোগ করে, কিছু মোছে না
  if (!o || !Array.isArray(o.members) || !Array.isArray(o.entries)) throw new Error('bad');
  const photos = o.photos || {};
  const members = o.members.filter((m) => m && m.id).map((m, i) => ST.memberFromBackup(m, i, photos));
  const entries = []; o.entries.forEach((e) => {
    if (!e || !e.id || !DATE_RE.test(e.date)) return;
    entries.push({ id: sid(e.id), date: e.date, memberId: sid(e.memberId), menu: e.menu || '', items: Array.isArray(e.items) ? e.items : [], total: r2(e.total), note: e.note || '', deleted: !!e.deleted, deletedAt: e.deleted ? new Date().toISOString() : null });
  });
  const meals = []; Object.keys(o.meals || {}).forEach((d) => { if (!DATE_RE.test(d)) return; Object.keys(o.meals[d] || {}).forEach((k) => { const n = o.meals[d][k]; if (n != null) meals.push({ date: d, memberId: sid(k), count: Math.max(0, Math.min(20, Math.round(+n || 0))) }); }); });
  ST.saveMembers(members); ST.saveEntries(entries); ST.saveMealBatch(meals);
  if (DATE_RE.test(o.start || '')) ST.saveStart(o.start);
  toast(bnInt(members.length) + ' সদস্য ও ' + bnInt(entries.length) + ' বাজার যোগ হয়েছে');
}
async function copyText(text, msg) {
  try { await navigator.clipboard.writeText(text); toast(msg || 'কপি হয়েছে'); }
  catch (e) { const t = document.createElement('textarea'); t.value = text; t.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); toast(msg || 'কপি হয়েছে'); } catch (x) { toast('কপি করা গেল না'); } t.remove(); }
}
function readPhoto(file, cb) {
  const fr = new FileReader(); fr.onerror = () => cb(null);
  fr.onload = () => { const im = new Image(); im.onerror = () => cb(null); im.onload = () => { const m = Math.min(im.width, im.height), c = document.createElement('canvas'); c.width = c.height = 200; c.getContext('2d').drawImage(im, (im.width - m) / 2, (im.height - m) / 2, m, m, 0, 0, 200, 200); cb(c.toDataURL('image/jpeg', 0.8)); }; im.src = fr.result; };
  fr.readAsDataURL(file);
}
function openSheet(html) { const s = $('sheet'); s.innerHTML = '<div class="box" role="dialog" aria-modal="true">' + html + '</div>'; s.hidden = false; }
function closeSheet() { const s = $('sheet'); s.hidden = true; s.innerHTML = ''; }

/* ---------- ক্লিক / ইনপুট ---------- */
function stepMeal(id, delta) {
  const d = UI.mdate || todayStr(), m = mem(id); if (!m) return;
  ST.saveMealCount(d, id, Math.max(0, Math.min(20, mealOf(d, m) + delta)));
}
document.addEventListener('click', (ev) => {
  const t = ev.target.closest('[data-act],[data-tab]'); if (!t) return;
  if (t.dataset.tab) { go(t.dataset.tab); return; }
  const a = t.dataset.act, id = t.dataset.id;
  if (AUTH && a !== 'eye') touch();
  switch (a) {
    case 'eye': { const i = $(t.dataset.for); i.type = i.type === 'password' ? 'text' : 'password'; break; }
    case 'forgot':
      ST.sb.auth.resetPasswordForEmail(ADMIN_EMAIL, { redirectTo: location.origin + location.pathname }).then((r) => toast(r.error ? 'পাঠানো যায়নি। নেট আছে কিনা দেখুন' : 'পাসওয়ার্ড বদলের লিংক ' + ADMIN_EMAIL + ' ঠিকানায় পাঠানো হয়েছে')); break;
    case 'retry': UI.loadErr = ''; READY = false; render(); refresh(); break;
    case 'settings': go('settings'); break;
    case 'logout': doLogout(); break;
    case 'pm': UI.month = shiftM(-1); render(); break;
    case 'nm': UI.month = shiftM(1); render(); break;
    case 'vw': UI.view = t.dataset.v; render(); break;
    case 'edit': UI.editId = id; go('add'); break;
    case 'canceledit': UI.editId = null; go('list'); break;
    case 'trash': {
      if (!confirm('এই বাজারটা ট্র্যাশে পাঠাবেন? (সেটিংস থেকে ফেরত আনা যাবে)')) break;
      const e = S.entries.find((x) => x.id === id); if (!e) break;
      UI.editId = null; if (UI.tab === 'add') UI.tab = 'list';
      ST.saveEntry(Object.assign({}, e, { deleted: true, deletedAt: new Date().toISOString() })); toast('ট্র্যাশে পাঠানো হয়েছে'); break; }
    case 'restore': { const e = S.entries.find((x) => x.id === id); if (e) { ST.saveEntry(Object.assign({}, e, { deleted: false, deletedAt: null })); toast('ফেরত আনা হয়েছে'); } break; }
    case 'restorem': { const m = mem(id); if (m) { ST.saveMember(Object.assign({}, m, { removed: false })); toast('ফেরত আনা হয়েছে'); } break; }
    case 'addrow': $('rows').insertAdjacentHTML('beforeend', V.itemRow('', '')); break;
    case 'rmrow': t.closest('.item').remove(); updSum(true); break;
    case 'mm': stepMeal(id, -1); break;
    case 'mp': stepMeal(id, 1); break;
    case 'mreset': { const d = UI.mdate || todayStr(); if (confirm('এই দিনের খাওয়ার বদল সরিয়ে সবাইকে আগের মতো ১ ধরবেন?')) ST.saveMealBatch(Object.keys(S.meals[d] || {}).map((k) => ({ date: d, memberId: k, count: null }))); break; }
    case 'addm': {
      const nm = val('newm').trim(); if (!nm) { toast('নাম লিখুন'); break; }
      const mx = S.members.reduce((x, m) => Math.max(x, m.order || 0), 0);
      ST.saveMember({ id: uid(), name: nm, phone: '', photo: '', active: true, removed: false, order: mx + 1 }); toast('যোগ হয়েছে'); break; }
    case 'up': case 'dn': {
      const lm = liveMembers().slice(), ix = lm.findIndex((m) => m.id === id), jx = ix + (a === 'up' ? -1 : 1); if (jx < 0 || jx >= lm.length) break;
      const tmp = lm[ix]; lm[ix] = lm[jx]; lm[jx] = tmp;
      ST.saveMembers(lm.map((m, k) => Object.assign({}, m, { order: k + 1 }))); break; }
    case 'rmm': if (confirm('এই সদস্যকে সরাবেন? (তার আগের হিসাব থাকবে, ট্র্যাশ থেকে ফেরত আনা যাবে)')) { const m = mem(id); if (m) ST.saveMember(Object.assign({}, m, { removed: true, active: false })); } break;
    case 'wa': window.open('https://wa.me/?text=' + encodeURIComponent(V.summaryText()), '_blank'); break;
    case 'copysum': copyText(V.summaryText(), 'রিপোর্ট কপি হয়েছে'); break;
    case 'copysheet': copyText(V.sheetTSV(), 'কপি হয়েছে — Excel বা Google Sheets-এ বসান'); break;
    case 'bkdl': downloadBackup(); break;
    case 'bkcopy': lsSet(BKK, String(Date.now())); copyText(JSON.stringify(backupObj()), 'ব্যাকআপ কপি হয়েছে'); break;
    case 'bkload': try { importData(JSON.parse(val('bk'))); } catch (x) { toast('ব্যাকআপ লেখাটি সঠিক নয়'); } break;
    case 'faildump': copyText(ST.failedDump(), 'কপি হয়েছে'); break;
    case 'chpw': openSheet('<h2>পাসওয়ার্ড বদলান</h2>' + V.pwField('cp0', 'বর্তমান পাসওয়ার্ড') + V.pwField('cp1', 'নতুন পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)', 'new-password') + '<div class="err" id="serr"></div><div class="row"><button class="btn primary grow" data-act="chpwgo">সংরক্ষণ</button><button class="btn" data-act="closesheet">বাতিল</button></div>'); break;
    case 'chpwgo': doChPw(); break;
    case 'closesheet': closeSheet(); break;
  }
});
const shiftM = (n) => { const p = UI.month.split('-'), d = new Date(+p[0], +p[1] - 1 + n, 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
document.addEventListener('input', (ev) => {
  const t = ev.target;
  if (t.id === 'q') { UI.q = t.value; $('listBody').innerHTML = V.listBody(); }
  else if (t.id === 'fm') { UI.fm = t.value; $('listBody').innerHTML = V.listBody(); }
  else if (t.classList && t.classList.contains('in-p')) updSum(true);
  else if (t.id === 'f-total') { t.dataset.manual = '1'; updSum(false); }
  else if (t.id === 'f-date') $('f-wd').textContent = 'বার: ' + (t.value ? wd(t.value) : '');
});
document.addEventListener('change', (ev) => {
  const t = ev.target; if (AUTH) touch();
  const upd = (id, patch) => { const m = mem(id); if (m) ST.saveMember(Object.assign({}, m, patch)); };
  if (t.id === 'fm') { UI.fm = t.value; $('listBody').innerHTML = V.listBody(); }
  else if (t.id === 'm-date') { UI.mdate = t.value || todayStr(); render(); }
  else if (t.id === 'start') { if (DATE_RE.test(t.value)) ST.saveStart(t.value); }
  else if (t.dataset.mname) { const n = t.value.trim(); if (n) upd(t.dataset.mname, { name: n }); else render(); }
  else if (t.dataset.mphone !== undefined && t.dataset.mphone) upd(t.dataset.mphone, { phone: t.value.trim() });
  else if (t.dataset.active) upd(t.dataset.active, { active: t.checked });
  else if (t.dataset.photo) { const f = t.files && t.files[0]; if (!f) return; readPhoto(f, (d) => { if (d && PHOTO_RE.test(d)) upd(t.dataset.photo, { photo: d }); else toast('ছবিটা পড়া গেল না'); }); }
  else if (t.id === 'bkfile') { const fl = t.files && t.files[0]; if (!fl) return; const fr = new FileReader(); fr.onload = () => { try { importData(JSON.parse(fr.result)); } catch (x) { toast('ব্যাকআপ ফাইলটি সঠিক নয়'); } }; fr.readAsText(fl); }
});
document.addEventListener('submit', (ev) => { if (ev.target.id === 'f') { ev.preventDefault(); saveEntryForm(); } });
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; $('instbtn').hidden = false; });
$('instbtn').addEventListener('click', () => { if (deferred) { deferred.prompt(); deferred = null; $('instbtn').hidden = true; } });
window.addEventListener('online', () => { paintSync(); ST.flush(); });
window.addEventListener('offline', paintSync);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && AUTH) {
    if (expired()) { toast('নিরাপত্তার জন্য লক হয়েছে'); doLogout(); } else { touch(); refresh(); }
  } else if (document.visibilityState === 'hidden' && AUTH) touch();
});
if ('serviceWorker' in navigator && location.protocol !== 'file:') window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });

/* ---------- শুরু ---------- */
function boot() {
  if (!CONFIGURED) { render(); return; }
  document.body.classList.add('noapp'); $('view').innerHTML = '<div class="empty">লোড হচ্ছে…</div>';
  try { ST.initClient(); } catch (e) { $('view').innerHTML = V.viewLoginErr(); return; }
  ST.sb.auth.onAuthStateChange((event, session) => {
    setTimeout(() => {   // কলব্যাকের ভেতরে সরাসরি Supabase ডাকা নিষেধ, তাই পরে চালাই
      if (event === 'PASSWORD_RECOVERY') { RECOVERY = true; render(); return; }
      const ok = !!(session && session.user && String(session.user.email).toLowerCase() === ADMIN_EMAIL);
      if (session && !ok) { ST.sb.auth.signOut(); return; }
      if (!session) { if (AUTH || !READY) leaveApp(); else render(); return; }
      if (RECOVERY) return;
      if (!AUTH) { if (expired()) { ST.sb.auth.signOut(); return; } enterApp(); }
    }, 0);
  });
}
boot();
