import { AmongUsState, GameState, Player } from '../../common/AmongUsState';
import { ILobbySettings } from '../../common/ISettings';
import { TouMiraMediumVoice, TouMiraPlayer, TouMiraSnapshot } from '../../common/TouMira';

// Rule semantics follow TOU-Mira's own Perfect Comms integration
// (TownOfUs/Integrations/PerfectCommsIntegration.cs) so both voice mods behave alike.

export type TouMiraMuteReason = 'blackmailed' | 'jailed' | 'puppeteer' | 'parasite' | 'swooped' | 'hacked';

export interface TouMiraListenerEffects {
	/** Extra places the listener hears from (Puppeteer/Parasite hearing through their victim). */
	origins: { x: number; y: number }[];
	/** `true` when `origins[0]` replaces the listener's own position instead of adding to it. */
	replace: boolean;
	muffled: boolean;
	/** The listener hears nobody (jailed, with the deafen rule on). */
	deafened: boolean;
}

/**
 * Overrides the normal speaker/listener calculation for one pair: `'mute'`, or the positions (and
 * dead state) to run the normal calculation with instead.
 */
export type TouMiraPairRoute = 'mute' | { me: Player; other: Player } | null;

const NO_LISTENER_EFFECTS: TouMiraListenerEffects = { origins: [], replace: false, muffled: false, deafened: false };

function activeSnapshot(state: AmongUsState, settings: ILobbySettings): TouMiraSnapshot | null {
	return settings.touMira_enabled && state.touMira ? state.touMira : null;
}

function findPlayer(snapshot: TouMiraSnapshot, id: number): TouMiraPlayer | undefined {
	return snapshot.players.find((player) => player.id === id);
}

function isDeliberation(state: AmongUsState, snapshot: TouMiraSnapshot): boolean {
	return state.gameState === GameState.DISCUSSION || snapshot.phase === 'meeting' || snapshot.phase === 'exile';
}

function isJailActive(settings: ILobbySettings, tou: TouMiraPlayer): boolean {
	return tou.jailed && (tou.jailorAlive || settings.touMira_jailPersistsAfterJailorDeath);
}

/** The Medium's spirit position, or null when `tou` isn't a Medium in spirit form. */
function mediumSpirit(tou: TouMiraPlayer | undefined): { x: number; y: number } | null {
	const spirit = tou?.mediumSpirit;
	return spirit ? { x: spirit[0], y: spirit[1] } : null;
}

function isTaskRound(state: AmongUsState, snapshot: TouMiraSnapshot): boolean {
	return state.gameState === GameState.TASKS && !isDeliberation(state, snapshot);
}

/** Why `speaker` must not be heard right now, or `null` when TOU-Mira doesn't restrict them. */
export function touMiraMuteReason(
	state: AmongUsState,
	settings: ILobbySettings,
	speaker: Player
): TouMiraMuteReason | null {
	const snapshot = activeSnapshot(state, settings);
	if (!snapshot || speaker.isDead) return null;
	const tou = findPlayer(snapshot, speaker.id);
	if (!tou || tou.dead) return null;

	const deliberation = isDeliberation(state, snapshot);
	const taskRound = isTaskRound(state, snapshot);

	if (deliberation && settings.touMira_muteBlackmailedInMeetings && tou.blackmailed) return 'blackmailed';
	if ((deliberation || taskRound) && settings.touMira_muteGlitchHacked && tou.hacked) return 'hacked';
	if ((deliberation || taskRound) && settings.touMira_muteSwooped && tou.swooped) return 'swooped';
	if (deliberation && settings.touMira_muteJailedInMeetings && isJailActive(settings, tou)) {
		return 'jailed';
	}

	if (!taskRound) return null;

	if (
		settings.touMira_muteBlackmailedInMeetings &&
		settings.touMira_muteBlackmailedNextRound &&
		tou.blackmailedNextRound
	) {
		return 'blackmailed';
	}
	if (settings.touMira_muteParasiteControlled && tou.parasiteControllerId >= 0) return 'parasite';
	if (settings.touMira_mutePuppeteerControlled && tou.puppeteerControllerId >= 0) return 'puppeteer';
	return null;
}

/** How TOU-Mira changes what the local player (`me`) hears. */
export function touMiraListenerEffects(
	state: AmongUsState,
	settings: ILobbySettings,
	me: Player
): TouMiraListenerEffects {
	const snapshot = activeSnapshot(state, settings);
	if (!snapshot || me.isDead) return NO_LISTENER_EFFECTS;
	const myTou = findPlayer(snapshot, me.id);

	if (
		myTou &&
		!myTou.dead &&
		settings.touMira_deafenJailedInMeetings &&
		isDeliberation(state, snapshot) &&
		isJailActive(settings, myTou)
	) {
		return { ...NO_LISTENER_EFFECTS, deafened: true };
	}
	if (!isTaskRound(state, snapshot)) return NO_LISTENER_EFFECTS;

	const muffled =
		!!myTou &&
		((settings.touMira_muffleBlinded && myTou.blinded) || (settings.touMira_muffleHysteria && myTou.hysteria));

	const victimPosition = (controlled: (player: TouMiraPlayer) => boolean) => {
		const victim = snapshot.players.find(controlled);
		const player = victim && state.players.find((p) => p.id === victim.id);
		return player ? { x: player.x, y: player.y } : null;
	};

	// A Medium in spirit form listens from the spirit (living speakers; ghosts go through touMiraPairRoute).
	const spirit = settings.touMira_mediumGhostVoice !== TouMiraMediumVoice.None ? mediumSpirit(myTou) : null;
	if (spirit) return { origins: [spirit], replace: true, muffled, deafened: false };

	if (settings.touMira_puppeteerHearFromVictim) {
		const puppet = victimPosition((p) => p.puppeteerControllerId === me.id);
		if (puppet) return { origins: [puppet], replace: true, muffled, deafened: false };
	}
	if (settings.touMira_parasiteHearFromVictim) {
		const host = victimPosition((p) => p.parasiteControllerId === me.id);
		if (host) return { origins: [host], replace: false, muffled, deafened: false };
	}
	return muffled ? { ...NO_LISTENER_EFFECTS, muffled } : NO_LISTENER_EFFECTS;
}

/**
 * Medium ghost voice during the task round, following TOU-Mira's Perfect Comms rules. While a Medium
 * is in spirit form, living players can't hear them. Ghosts hear them at the spirit
 * (Medium -> Ghost), and the Medium hears the ghosts it mediated (Ghost -> Medium).
 */
export function touMiraPairRoute(
	state: AmongUsState,
	settings: ILobbySettings,
	me: Player,
	other: Player
): TouMiraPairRoute {
	const mode = settings.touMira_mediumGhostVoice;
	const snapshot = activeSnapshot(state, settings);
	if (!snapshot || mode === TouMiraMediumVoice.None || !isTaskRound(state, snapshot)) return null;
	const mediumToGhost = mode === TouMiraMediumVoice.MediumToGhost || mode === TouMiraMediumVoice.Both;
	const ghostToMedium = mode === TouMiraMediumVoice.GhostToMedium || mode === TouMiraMediumVoice.Both;

	const speakerSpirit = other.isDead ? null : mediumSpirit(findPlayer(snapshot, other.id));
	if (speakerSpirit) {
		if (!me.isDead || !mediumToGhost) return 'mute';
		return { me, other: { ...other, ...speakerSpirit } };
	}

	const listenerSpirit = me.isDead ? null : mediumSpirit(findPlayer(snapshot, me.id));
	if (listenerSpirit && other.isDead) {
		if (!ghostToMedium || findPlayer(snapshot, other.id)?.mediatedBy !== me.id) return 'mute';
		// Treat the Medium as a ghost at the spirit, so it hears the ghost the way ghosts hear each other.
		return { me: { ...me, ...listenerSpirit, isDead: true }, other };
	}
	return null;
}
