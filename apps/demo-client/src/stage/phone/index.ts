/**
 * Phone kit for guest seats (Operator / Examiner / Watch).
 *
 * Rule of thumb: long text -> showClueSheet, short status -> showToast.
 * Never `alert()` / `confirm()` on a phone page.
 */

import './phone.css';

export { showClueSheet, closeClueSheet } from './sheet';
export type { ClueSheetOptions, ClueSheetAction, ClueSheetHandle, SheetTone } from './sheet';

export { showToast } from './toast';
export type { ToastOptions, ToastTone } from './toast';

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
