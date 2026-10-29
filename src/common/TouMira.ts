import { ILobbySettings } from './ISettings';

/**
 * Wire format of the TOU-Mira bridge (`TouMiraBclBridge.dll`), a BepInEx plugin that runs next to
 * Town of Us: Mira and streams newline-delimited JSON snapshots over localhost TCP.
 * Bump `TOU_MIRA_PROTOCOL_VERSION` on both sides when the shape changes incompatibly.
 */
export const TOU_MIRA_PROTOCOL_VERSION = 1;
export const TOU_MIRA_BRIDGE_PORT = 47652;
/** The bridge re-sends its snapshot every second; anything older means the game side is gone. */
export const TOU_MIRA_STALE_MS = 3000;

export type TouMiraLobbySettingKey = Extract<keyof ILobbySettings, `touMira_${string}`>;

/** Medium ghost voice directions; values match TOU-Mira's Perfect Comms "Ghost Voice" option. */
export const TouMiraMediumVoice = { None: 0, MediumToGhost: 1, GhostToMedium: 2, Both: 3 } as const;

/**
 * Defaults mirror Town of Us: Mira's own Perfect Comms integration, except Medium ghost voice
 * (on, as requested for this build) and jail deafen (ours, off).
 */
export const touMiraLobbyDefaults: { [K in TouMiraLobbySettingKey]: ILobbySettings[K] } = {
	touMira_enabled: true,
	touMira_muteBlackmailedInMeetings: true,
	touMira_muteBlackmailedNextRound: false,
	touMira_muteJailedInMeetings: true,
	touMira_jailPersistsAfterJailorDeath: false,
	touMira_deafenJailedInMeetings: false,
	touMira_mutePuppeteerControlled: true,
	touMira_puppeteerHearFromVictim: true,
	touMira_muteParasiteControlled: true,
	touMira_parasiteHearFromVictim: true,
	touMira_muteSwooped: true,
	touMira_muteGlitchHacked: true,
	touMira_muffleBlinded: true,
	touMira_muffleHysteria: true,
	touMira_mediumGhostVoice: TouMiraMediumVoice.GhostToMedium,
};

export type TouMiraPhase = 'menu' | 'lobby' | 'tasks' | 'meeting' | 'exile';

export interface TouMiraPlayer {
	id: number;
	dead: boolean;
	blackmailed: boolean;
	/** Was blackmailed during the last meeting; only meaningful during the following task round. */
	blackmailedNextRound: boolean;
	jailed: boolean;
	jailorAlive: boolean;
	/** PlayerId of the Puppeteer controlling this player, or -1. */
	puppeteerControllerId: number;
	/** PlayerId of the Parasite controlling this player, or -1. */
	parasiteControllerId: number;
	swooped: boolean;
	hacked: boolean;
	/** Blinded by Eclipsal or flashed by Grenadier. */
	blinded: boolean;
	hysteria: boolean;
	/** The Medium's spirit (ghost form) position while active. Absent from bridges before 0.2. */
	mediumSpirit?: [number, number] | null;
	/** PlayerId of the Medium who mediated this (dead) player, or -1. Absent before bridge 0.2. */
	mediatedBy?: number;
}

export interface TouMiraSnapshot {
	v: number;
	phase: TouMiraPhase;
	localId: number;
	players: TouMiraPlayer[];
}
