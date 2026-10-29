import { AmongUsState, GameState, Player } from '../../common/AmongUsState';
import { ILobbySettings } from '../../common/ISettings';
import { TouMiraPlayer, TouMiraSnapshot } from '../../common/TouMira';

// Rule semantics follow TOU-Mira's own Perfect Comms integration
// (TownOfUs/Integrations/PerfectCommsIntegration.cs) so both voice mods behave alike.

export type TouMiraMuteReason = 'blackmailed' | 'jailed' | 'puppeteer' | 'parasite' | 'swooped' | 'hacked';

export interface TouMiraListenerEffects {
	/** Extra places the listener hears from (Puppeteer/Parasite hearing through their victim). */
	origins: { x: number; y: number }[];
	/** `true` when `origins[0]` replaces the listener's own position instead of adding to it. */
	replace: boolean;
	muffled: boolean;
}

const NO_LISTENER_EFFECTS: TouMiraListenerEffects = { origins: [], replace: false, muffled: false };

function activeSnapshot(state: AmongUsState, settings: ILobbySettings): TouMiraSnapshot | null {
	return settings.touMira_enabled && state.touMira ? state.touMira : null;
}

function findPlayer(snapshot: TouMiraSnapshot, id: number): TouMiraPlayer | undefined {
	return snapshot.players.find((player) => player.id === id);
}

function isDeliberation(state: AmongUsState, snapshot: TouMiraSnapshot): boolean {
	return state.gameState === GameState.DISCUSSION || snapshot.phase === 'meeting' || snapshot.phase === 'exile';
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
	if (
		deliberation &&
		settings.touMira_muteJailedInMeetings &&
		tou.jailed &&
		(tou.jailorAlive || settings.touMira_jailPersistsAfterJailorDeath)
	) {
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

/** How TOU-Mira changes what the local player (`me`) hears during the task round. */
export function touMiraListenerEffects(
	state: AmongUsState,
	settings: ILobbySettings,
	me: Player
): TouMiraListenerEffects {
	const snapshot = activeSnapshot(state, settings);
	if (!snapshot || me.isDead || !isTaskRound(state, snapshot)) return NO_LISTENER_EFFECTS;
	const myTou = findPlayer(snapshot, me.id);

	const muffled =
		!!myTou &&
		((settings.touMira_muffleBlinded && myTou.blinded) || (settings.touMira_muffleHysteria && myTou.hysteria));

	const victimPosition = (controlled: (player: TouMiraPlayer) => boolean) => {
		const victim = snapshot.players.find(controlled);
		const player = victim && state.players.find((p) => p.id === victim.id);
		return player ? { x: player.x, y: player.y } : null;
	};

	if (settings.touMira_puppeteerHearFromVictim) {
		const puppet = victimPosition((p) => p.puppeteerControllerId === me.id);
		if (puppet) return { origins: [puppet], replace: true, muffled };
	}
	if (settings.touMira_parasiteHearFromVictim) {
		const host = victimPosition((p) => p.parasiteControllerId === me.id);
		if (host) return { origins: [host], replace: false, muffled };
	}
	return muffled ? { origins: [], replace: false, muffled } : NO_LISTENER_EFFECTS;
}
