/**
 * Manual story for the phone UI kit. Not part of the production bundle: open
 * it through the Vite dev server at /src/stage/phone/story.html.
 */

import { showClueSheet, showToast } from './index';

const DRAWER_NOTE = [
  'An emergency procedures binder, a first aid kit, and a small notebook labeled "Keypad audit, routine, pre-gala" in Dr. Bright\'s hand.',
  'The first page reads: "Marks reissued for the gala and left in plain sight, dressed as ordinary paperwork. Reception keeps its mark in the loan bay. The gallery keeps its mark on the loan placard. The archives keep theirs on a loan folder. The corridor keeps its mark in the blueprint revision. Read them in the order a guest walks the building."',
  'Tucked into the back cover is a folded gala seating chart. Table 7 has been circled twice.'
].join('\n\n');

const EXAMINE_NOTE =
  'The arrangement holds more than beauty.\nLook beyond the petals.\nPrecision unlocks what others overlook.';

const log = document.getElementById('story-log') as HTMLElement;

function note(line: string): void {
  const item = document.createElement('li');
  item.textContent = line;
  log.prepend(item);
}

const actions: Record<string, () => void> = {
  drawer: () =>
    showClueSheet({
      eyebrow: 'Drawer contents',
      title: 'Reception desk drawer',
      body: DRAWER_NOTE,
      onPin: () => {
        note('Pinned drawer note to log');
        showToast({ kind: 'success', message: 'Pinned to Log' });
      },
      onClose: () => note('Drawer sheet closed')
    }),
  examine: () =>
    showClueSheet({
      eyebrow: 'Examine clue',
      accent: 'cyan',
      title: 'Flower arrangement',
      body: EXAMINE_NOTE,
      doneLabel: 'Got it'
    }),
  short: () =>
    showClueSheet({
      title: 'Nothing here',
      body: 'The drawer is empty.'
    }),
  success: () => showToast({ kind: 'success', title: 'Code accepted', message: 'Gallery A is now unlocked.' }),
  info: () => showToast({ kind: 'info', message: 'Watch is examining the loan placard.' }),
  error: () => showToast({ kind: 'error', title: 'Wrong code', message: 'The keypad flashes red. Two attempts left.' }),
  burst: () => {
    for (let i = 1; i <= 5; i++) {
      window.setTimeout(() => showToast({ kind: 'info', message: `Poll result ${i} of 5` }), i * 150);
    }
  }
};

document.querySelectorAll<HTMLButtonElement>('[data-story]').forEach((btn) => {
  btn.addEventListener('click', () => actions[btn.dataset.story ?? '']?.());
});
