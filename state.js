/* views.js-এর জন্য এক জায়গা থেকে অবস্থা ও সেটিং */
import { todayStr } from './util.js';
export { S, CONFIGURED, ADMIN_EMAIL, AUTOLOCK, pendingCount, failedCount } from './store.js';
export const UI = { tab: 'home', month: todayStr().slice(0, 7), editId: null, q: '', fm: '', view: 'sheet', mdate: null, loadErr: '' };
