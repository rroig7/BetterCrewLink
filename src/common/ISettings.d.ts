import { GamePlatform } from './GamePlatform';

export interface ISettings {
	alwaysOnTop: boolean;
	language: string;
	microphone: string;
	speaker: string;
	pushToTalkMode: number;
	serverURL: string;
	pushToTalkShortcut: string;
	deafenShortcut: string;
	muteShortcut: string;
	impostorRadioShortcut: string;
	hideCode: boolean;
	natFix: boolean;
	compactOverlay: boolean;
	overlayPosition: string;
	enableOverlay: boolean;
	meetingOverlay: boolean;

	myLobbySettings: ILobbySettings;
	ghostVolumeAsImpostor: number;
	crewVolumeAsGhost: number;
	masterVolume: number;
	microphoneGain: number;
	microphoneGainEnabled: boolean;
	micSensitivity: number;
	micSensitivityEnabled: boolean;
	mobileHost: boolean;
	hardware_acceleration: boolean;
	echoCancellation: boolean;
	noiseSuppression: boolean;
	autoGainControl: boolean;
	oldSampleDebug: boolean;

	enableSpatialAudio: boolean;
	oldSampleDebug: boolean;
	playerConfigMap: playerConfigMap;
	obsOverlay: boolean;
	obsSecret: string | undefined;

	launchPlatform: GamePlatform | string;
	customPlatforms: GamePlatformMap;
}

export interface ILobbySettings {
	maxDistance: number;
	visionHearing: boolean;
	haunting: boolean;
	hearImpostorsInVents: boolean;
	impostersHearImpostersInvent: boolean;
	impostorRadioEnabled: boolean;
	impostorRadioPrivate: boolean;
	commsSabotage: boolean;
	deadOnly: boolean;
	meetingGhostOnly: boolean;
	ghostsCanTalkIngame: boolean;
	gracePeriod: number;
	hearThroughCameras: boolean;
	wallsBlockAudio: boolean;
	publicLobby_on: boolean;
	publicLobby_title: string;
	publicLobby_language: string;

	// Town of Us: Mira rules, applied only while the TOU-Mira bridge plugin is reporting.
	touMira_enabled: boolean;
	touMira_muteBlackmailedInMeetings: boolean;
	touMira_muteBlackmailedNextRound: boolean;
	touMira_muteJailedInMeetings: boolean;
	touMira_jailPersistsAfterJailorDeath: boolean;
	touMira_deafenJailedInMeetings: boolean;
	touMira_mutePuppeteerControlled: boolean;
	touMira_puppeteerHearFromVictim: boolean;
	touMira_muteParasiteControlled: boolean;
	touMira_parasiteHearFromVictim: boolean;
	touMira_muteSwooped: boolean;
	touMira_muteGlitchHacked: boolean;
	touMira_muffleBlinded: boolean;
	touMira_muffleHysteria: boolean;
	/** One of `TouMiraMediumVoice`. */
	touMira_mediumGhostVoice: number;
}

export interface SocketConfig {
	volume: number;
	isMuted: boolean;
}

export interface playerConfigMap {
	[socketId: number]: SocketConfig;
}
