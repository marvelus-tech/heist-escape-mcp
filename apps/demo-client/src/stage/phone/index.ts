/**
 * Phone kit: shared overlay primitives for phone role pages.
 *
 *   import { showClueSheet, showToast, mountPhoneKit } from '../phone';
 *
 * Nothing here touches `#app` innerHTML, so pages can re-render freely while a
 * sheet or toast is on screen.
 */

export { mountPhoneKit, unmountPhoneKit } from './mount';
export { showToast, clearToasts } from './Toast';
export type { PhoneToastRequest, PhoneToastTone } from './Toast';
export { showClueSheet, closeClueSheet } from './ClueSheet';
export type { ClueSheetRequest, ClueSheetHandle } from './ClueSheet';
