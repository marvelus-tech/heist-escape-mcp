/**
 * Pure classification helpers: live action-log rows and session state in,
 * normalized JuiceEvents out. No DOM, no network, so this is unit-testable.
 *
 * Detection is intentionally string-driven (what the Worker already logs)
 * rather than hardcoding puzzle answers. The only fixed vocabulary here is
 * generic heist language: "vault", "diamond", "unlocked", "incorrect".
 */

import type { ActionLogEntry, FinaleFlags, JuiceEvent, StageStateLike } from './types';

/**
 * Story vocabulary the finale logic keys off. Kept in one place so it is easy
 * to extend when Logic adds flags; these are detection tokens, not answers
 * shown to players.
 */
export const STORY = {
  /** Catalog card / Elena's note surfacing in the log. */
  reveal: /\b7734\b|\belena\b|catalog card|\breveal(ed|s)?\b/i,
  /** Fake prize signals. */
  replica: /\breplica\b|\bfake\b|\bcounterfeit\b|\bforg(ed|ery)\b|not authentic|inauthentic|\bdecoy\b/i,
  /** Verified prize signals ("authentic" alone, never "not authentic"). */
  authentic: /\bauthentic(ated|ity)?\b/i,
  /** Explicit finale wording Logic logs ("Heist complete.", puzzle id "heist-complete-authentic"). */
  complete: /heist[\s-]*complete/i,
  /** Attempt rows: something was tried and refused (still secured, no credential). */
  refused: /\btried\b|still secured|without a|\bdenied\b|\brefus/i
} as const;

export type StoryBeat = 'replica' | 'authentic' | 'reveal' | null;

/** Which story beat (if any) a row's target + result mention. Replica wins over authentic. */
export function detectStory(text: string): StoryBeat {
  if (STORY.replica.test(text)) return 'replica';
  if (STORY.authentic.test(text)) return 'authentic';
  if (STORY.reveal.test(text)) return 'reveal';
  return null;
}

/** Stable identity for dedupe across polls (the API has no row id). */
export function actionKey(a: ActionLogEntry): string {
  return `${a.timestamp}|${a.player}|${a.action ?? ''}|${a.result}`;
}

/** "gallery-a-key" -> "Gallery A Key" */
export function humanize(raw: string | undefined): string {
  if (!raw) return '';
  return raw
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const isDiamond = (s: string) => /diamond/i.test(s);
const isVault = (s: string) => /\bvault\b/i.test(s);

/**
 * Map one action-log row to a JuiceEvent, or null when it should stay silent
 * (surveys, hints, failed lookups). Prefers the structured `action` column and
 * falls back to result-string heuristics for older rows.
 */
export function classifyAction(a: ActionLogEntry): JuiceEvent | null {
  const result = a.result ?? '';
  const lower = result.toLowerCase();
  const action = (a.action ?? inferAction(lower)).toLowerCase();
  const target = a.target ?? '';
  const player = a.player;
  const story = detectStory(`${target} ${result}`);

  // Rejected codes stay rejected even if the target mentions the catalog.
  const rejected =
    action === 'enter_code' &&
    /incorrect|denied|wrong|invalid|\blocked\b/.test(lower) &&
    !/unlocked|\bcorrect\b/.test(lower);
  if (rejected) {
    return { kind: 'code-rejected', tone: 'error', title: 'Code rejected', body: result, player, subject: target };
  }

  // Refused attempts ("tried to take sunburst-diamond-authentic but it is still
  // secured", "tried the shelf 12 reader without a curator credential") must
  // never read as a take or an unlock, or the authentic-diamond guard would
  // light the finale ribbon early.
  if ((action === 'take' || action === 'unlock') && STORY.refused.test(lower) && !/\bunlocked\b|\btook\b|\bsecured the\b/.test(lower)) {
    return {
      kind: 'code-rejected',
      tone: 'error',
      title: action === 'take' ? 'Still secured' : 'Access denied',
      body: result,
      player,
      subject: target
    };
  }

  // Story beats that cut across action types.
  if (story === 'reveal' && action !== 'joined_session') {
    return {
      kind: 'reveal',
      tone: 'info',
      title: /elena/i.test(`${target} ${result}`) ? "Elena's note revealed" : 'Catalog card revealed',
      body: result,
      player,
      subject: target
    };
  }
  if (story === 'replica' && action !== 'joined_session' && action !== 'look_around') {
    const subject = target || (action === 'take' ? takeSubject(result) : result.replace(/^examined\s+/i, ''));
    return {
      kind: 'replica-warning',
      tone: 'warning',
      title: action === 'take' ? 'Replica taken' : 'Replica detected',
      body: result,
      player,
      subject
    };
  }

  switch (action) {
    case 'examine': {
      if (/not found/.test(lower)) return null;
      const subject = target || result.replace(/^examined\s+/i, '');
      return {
        kind: 'examine',
        tone: 'info',
        title: 'Examine clue',
        body: result,
        player,
        subject
      };
    }

    case 'take': {
      const subject = target || takeSubject(result);
      if (isDiamond(subject) || isDiamond(lower)) {
        return prizeEvent(subject, result, player, story === 'authentic');
      }
      return {
        kind: 'item-acquired',
        tone: 'success',
        title: `${humanize(subject) || 'Item'} acquired`,
        body: result,
        player,
        subject
      };
    }

    case 'unlock': {
      const subject = target || result.replace(/^.*\bunlocked\b\s*(the\s+)?/i, '');
      if (isVault(subject) || isVault(lower)) {
        return { kind: 'vault-open', tone: 'success', title: 'Vault open', body: result, player, subject };
      }
      return {
        kind: 'door-unlocked',
        tone: 'success',
        title: `${humanize(subject) || 'Door'} unlocked`,
        body: result,
        player,
        subject
      };
    }

    case 'enter_code': {
      if (isVault(lower) || isVault(target)) {
        return { kind: 'vault-open', tone: 'success', title: 'Vault open', body: result, player, subject: target };
      }
      return { kind: 'code-accepted', tone: 'success', title: 'Code accepted', body: result, player, subject: target };
    }

    case 'open_drawer': {
      const subject = target || result.replace(/^.*\bopened\b\s*/i, '');
      return {
        kind: 'drawer-opened',
        tone: 'info',
        title: `${humanize(subject) || 'Drawer'} opened`,
        player,
        subject
      };
    }

    case 'move': {
      const subject = target || result.replace(/^.*\bmoved to\b\s*/i, '');
      return {
        kind: 'room-changed',
        tone: 'info',
        title: `Entering ${humanize(subject) || 'next room'}`,
        player,
        subject
      };
    }

    case 'joined_session': {
      return { kind: 'player-joined', tone: 'info', title: `${player} joined`, body: result, player };
    }

    default: {
      // Unknown action names Logic may add later (claim, authenticate, finale...).
      // Only react when the row clearly talks about the prize.
      if (STORY.complete.test(result) || isDiamond(`${target} ${result}`)) {
        const subject = isDiamond(target) ? target : 'diamond';
        return prizeEvent(subject, result, player, story === 'authentic' || STORY.complete.test(result));
      }
      return null;
    }
  }
}

/** "Raven took the brass gallery key" -> "brass gallery key" */
function takeSubject(result: string): string {
  return result.replace(/^.*\btook\b\s*(the\s+)?/i, '');
}

/**
 * Prize handling: the full finale only fires when the row is authenticated.
 * An unverified pedestal take gets a questioning toast and no ribbon.
 */
function prizeEvent(subject: string, result: string, player: string, authentic: boolean): JuiceEvent {
  const name = prizeName(subject);
  if (authentic) {
    return { kind: 'heist-complete', tone: 'success', title: `${name} secured`, body: result, player, subject };
  }
  return { kind: 'prize-taken', tone: 'success', title: `${name} secured?`, body: result, player, subject };
}

/** "authentic-sunburst-diamond" -> "Sunburst"; bare "diamond" -> "Diamond". */
export function prizeName(subject?: string): string {
  if (!subject) return 'Diamond';
  const words = humanize(subject).split(' ').filter(Boolean);
  const specific = words.filter((w) => !/^(diamond|authentic|the|replica|fake)$/i.test(w));
  return (specific.length ? specific : words).join(' ') || 'Diamond';
}

/** Best-effort action name for rows that lack the `action` column. */
function inferAction(lower: string): string {
  if (/^examined\b/.test(lower)) return 'examine';
  if (/\btook\b/.test(lower)) return 'take';
  if (/\bunlocked\b/.test(lower)) return 'unlock';
  if (/incorrect code|access denied|correct .*code|code\b/.test(lower)) return 'enter_code';
  if (/\bopened\b/.test(lower)) return 'open_drawer';
  if (/\bmoved to\b/.test(lower)) return 'move';
  if (/\bjoined\b/.test(lower)) return 'joined_session';
  return '';
}

/** Given the previous and current action lists, return only the unseen rows (oldest first). */
export function diffActions(seen: Set<string>, actions: ActionLogEntry[]): ActionLogEntry[] {
  const fresh: ActionLogEntry[] = [];
  for (const a of actions) {
    const key = actionKey(a);
    if (seen.has(key)) continue;
    seen.add(key);
    fresh.push(a);
  }
  return fresh;
}

export type ClimaxStage = 'none' | 'vault-open' | 'heist-complete';

/**
 * Read finale flags from whatever shape Logic ends up exposing. Every lookup
 * is optional; unknown shapes simply yield `{}`.
 */
export function readFinaleFlags(state: StageStateLike): FinaleFlags {
  const s = state as Record<string, unknown>;
  const nested = [state.finale, state.flags].filter(Boolean) as Record<string, unknown>[];
  const pick = (key: string): unknown => s[key] ?? nested.map((n) => n[key]).find((v) => v !== undefined);

  const flags: FinaleFlags = {};

  // Logic's get_state ships heistComplete as 'authentic' | 'replica' | false:
  // only the authentic stone counts as the win; the replica is the trap.
  const complete = pick('heistComplete') ?? pick('heist_complete') ?? pick('complete');
  if (typeof complete === 'boolean') flags.heistComplete = complete;
  if (complete === 'authentic') {
    flags.heistComplete = true;
    flags.authentic = true;
  } else if (complete === 'replica') {
    flags.heistComplete = false;
    flags.authentic = false;
  }

  const authentic = pick('authentic') ?? pick('diamondAuthentic') ?? pick('isAuthentic');
  if (typeof authentic === 'boolean') flags.authentic = authentic;

  const outcome = pick('outcome') ?? pick('ending') ?? pick('result');
  if (typeof outcome === 'string') {
    const beat = detectStory(outcome);
    if (beat === 'authentic') flags.authentic = true;
    if (beat === 'replica') flags.authentic = false;
    if (STORY.complete.test(outcome)) flags.heistComplete = true;
  }

  // Solved-puzzle names are the most likely first place a finale flag lands.
  const puzzles = state.solvedPuzzles ?? [];
  if (puzzles.some((p) => STORY.authentic.test(p) && !STORY.replica.test(p))) flags.authentic = true;
  if (puzzles.some((p) => STORY.complete.test(p))) flags.heistComplete = true;

  return flags;
}

/**
 * Derive the climax stage from session state alone. Used so a page reload
 * mid-heist still shows the ribbon without replaying toasts.
 *
 * The full finale requires an authenticity signal: either explicit flags, or
 * an inventory prize whose name says "authentic". A bare diamond in inventory
 * is only a pedestal take and stays at vault-open.
 */
export function detectClimax(state: StageStateLike): { stage: ClimaxStage; subject?: string } {
  const flags = readFinaleFlags(state);
  const prize = state.inventory?.find((i) => isDiamond(i.item));
  const prizeAuthentic = !!prize && detectStory(prize.item) === 'authentic';

  const authenticWin = flags.authentic === true && (flags.heistComplete !== false || !!prize);
  if (authenticWin || prizeAuthentic) {
    return { stage: 'heist-complete', subject: prize?.item ?? 'diamond' };
  }

  const vaultDoor = state.unlockedDoors?.find((d) => isVault(d));
  const vaultPuzzle = state.solvedPuzzles?.find((p) => isVault(p));
  if (vaultDoor || vaultPuzzle || prize) return { stage: 'vault-open', subject: vaultDoor ?? vaultPuzzle ?? prize?.item };

  return { stage: 'none' };
}

const CLIMAX_RANK: Record<ClimaxStage, number> = { none: 0, 'vault-open': 1, 'heist-complete': 2 };

export function isHigherClimax(next: ClimaxStage, current: ClimaxStage): boolean {
  return CLIMAX_RANK[next] > CLIMAX_RANK[current];
}
