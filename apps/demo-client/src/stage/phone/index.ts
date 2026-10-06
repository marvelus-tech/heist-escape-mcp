/**
 * Phone UI kit for Operator / Watch / Examiner companion pages.
 *
 * Rule of thumb: long text -> showClueSheet, short status -> showToast.
 * Never `alert()` / `confirm()` on a phone page.
 *
 *   import { showClueSheet, showToast } from '../phone';
 *
 *   showClueSheet({ eyebrow: 'Drawer contents', title: 'Reception desk', body: data.contents,
 *                   onPin: () => log.push(data.contents) });
 *   showClueSheet({ tone: 'cyan', title: 'Get the full briefing', body: '...', code: toolCall,
 *                   actions: [{ label: 'Copy tool call', primary: true, onClick: copy }] });
 *   showToast({ kind: 'success', message: 'Code accepted' });
 *   showToast('Copied');
 *
 * Both helpers lazily mount a single fixed layer on `document.body`, so pages
 * that re-render `#app.innerHTML` never lose the overlay. Call `mountPhoneUi`
 * (alias `mountPhoneKit`) yourself only if you want the layer inside a
 * different root.
 *
 * This is the ONE phone kit: OP-A (#12) is the base; OP-B (#16) and OP-C (#14)
 * shipped their own copies, whose extra API (contents / tone / body aliases,
 * warning toasts, sheet actions + code block, copyToClipboard, escapeHtml,
 * page primitives in pages.css) was folded in here.
 *
 * No game logic and no network calls live here; pages own those.
 */

import './tokens.css';
import './phone.css';
import './pages.css';

export { mountPhoneUi, unmountPhoneUi, mountPhoneUi as mountPhoneKit, unmountPhoneUi as unmountPhoneKit } from './layer';
export type { PhoneUiLayer } from './layer';
export { showClueSheet, closeClueSheet } from './ClueSheet';
export type { ClueAccent, ClueSheetAction, ClueSheetHandle, ClueSheetOptions, SheetTone } from './ClueSheet';
export type { ClueSheetOptions as ClueSheetRequest } from './ClueSheet';
export { showToast, clearToasts } from './Toast';
export type { PhoneToastRequest, PhoneToastTone, ToastHandle, ToastKind, ToastOptions, ToastTone } from './Toast';
export { copyToClipboard } from './clipboard';

/** Escape server strings before they land in an innerHTML template. */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
