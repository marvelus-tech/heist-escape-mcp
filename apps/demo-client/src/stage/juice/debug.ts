/**
 * Console helpers for demoing the juice layer without a live Operator.
 *
 *   HeistJuice.demo()                       // scripted 10-beat sequence, ends on the authentic take
 *   HeistJuice.toast('success', 'Key acquired', 'by Raven')
 *   HeistJuice.examine('flower-arrangement', 'Something glints between the stems')
 *   HeistJuice.action({ player: 'Raven', action: 'take', target: 'gallery-a-key', result: 'Raven took the brass gallery key' })
 *   HeistJuice.celebrate('heist-complete', 'sunburst-diamond')
 */

import type { StageJuice } from './StageJuice';
import type { ActionLogEntry, JuiceTone } from './types';

declare global {
  interface Window {
    HeistJuice?: HeistJuiceDebug;
  }
}

export interface HeistJuiceDebug {
  toast(tone: JuiceTone, title: string, body?: string, meta?: string): void;
  examine(subject: string, text: string, player?: string): void;
  action(row: Partial<ActionLogEntry> & Pick<ActionLogEntry, 'result'>): void;
  celebrate(stage: 'vault-open' | 'heist-complete', subject?: string): void;
  demo(): Promise<void>;
  reset(): void;
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function installJuiceDebug(juice: StageJuice): () => void {
  let seq = 0;
  const row = (r: Partial<ActionLogEntry> & Pick<ActionLogEntry, 'result'>): ActionLogEntry => ({
    player: r.player ?? 'Demo',
    timestamp: r.timestamp ?? Date.now() + seq++,
    action: r.action,
    target: r.target,
    result: r.result
  });

  const api: HeistJuiceDebug = {
    toast: (tone, title, body, meta) => juice.toast(tone, title, body, meta),
    examine: (subject, text, player) => juice.showExamineCard(subject, text, player),
    action: (r) => juice.ingestAction(row(r)),
    celebrate: (stage, subject) => juice.celebrate(stage, subject),
    reset: () => juice.reset(),

    async demo() {
      juice.reset();
      api.action({
        player: 'Examiner',
        action: 'examine',
        target: 'flower-arrangement',
        result: 'Examined flower-arrangement'
      });
      await wait(3200);
      api.action({
        player: 'Examiner',
        action: 'take',
        target: 'gallery-a-key',
        result: 'Examiner took the brass gallery key'
      });
      await wait(3600);
      api.action({
        player: 'Examiner',
        action: 'unlock',
        target: 'archives-door',
        result: 'Examiner unlocked the archives door'
      });
      await wait(3600);
      api.action({ player: 'Raven', action: 'enter_code', target: 'vault-keypad', result: 'Incorrect code' });
      await wait(2800);
      api.action({
        player: 'Raven',
        action: 'enter_code',
        target: 'card-catalog-7734',
        result: 'Unlocked catalog drawer 7734'
      });
      await wait(4000);
      api.action({
        player: 'Raven',
        action: 'enter_code',
        target: 'vault-keypad',
        result: 'Raven entered correct vault code'
      });
      await wait(4200);
      // Rows below mirror what game-session.ts logs on the real twist path.
      api.action({
        player: 'Examiner',
        action: 'take',
        target: 'sunburst-diamond',
        result: 'Examiner lifted the sunburst-diamond from the pedestal. Objective apparently secured.'
      });
      await wait(3600);
      api.action({
        player: 'Examiner',
        action: 'take',
        target: 'sunburst-diamond-authentic',
        result: 'Examiner tried to take sunburst-diamond-authentic but it is still secured'
      });
      await wait(3000);
      api.action({
        player: 'Examiner',
        action: 'unlock',
        target: 'steel-shelves',
        result: 'Examiner opened the shelf 12 transit case with the curator keycard'
      });
      await wait(3600);
      api.action({
        player: 'Examiner',
        action: 'take',
        target: 'sunburst-diamond-authentic',
        result: 'Examiner secured the authentic Sunburst Diamond from the steel shelves. Heist complete.'
      });
    }
  };

  window.HeistJuice = api;
  return () => {
    if (window.HeistJuice === api) delete window.HeistJuice;
  };
}
