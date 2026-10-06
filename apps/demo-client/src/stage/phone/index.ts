/**
 * Phone UI kit for Operator / Watch / Examiner companion pages.
 *
 * Usage:
 *
 *   import { showClueSheet, showToast } from '../phone';
 *
 *   showClueSheet({ eyebrow: 'Drawer contents', title: 'Reception desk', body: data.contents,
 *                   onPin: () => log.push(data.contents) });
 *   showToast({ kind: 'success', message: 'Code accepted' });
 *
 * Both helpers lazily mount a single fixed layer on `document.body`, so pages
 * that re-render `#app.innerHTML` never lose the overlay. Call `mountPhoneUi`
 * yourself only if you want the layer inside a different root.
 *
 * No game logic and no network calls live here; pages own those.
 */

import './tokens.css';
import './phone.css';

export { mountPhoneUi, unmountPhoneUi } from './layer';
export type { PhoneUiLayer } from './layer';
export { showClueSheet, closeClueSheet } from './ClueSheet';
export type { ClueAccent, ClueSheetHandle, ClueSheetOptions } from './ClueSheet';
export { showToast, clearToasts } from './Toast';
export type { ToastHandle, ToastKind, ToastOptions } from './Toast';
