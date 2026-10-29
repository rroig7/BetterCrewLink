import React from 'react';
import { TFunction } from 'i18next';
import Alert from '@mui/material/Alert';
import { AmongUsState } from '../../../common/AmongUsState';
import { ILobbySettings } from '../../../common/ISettings';
import { TouMiraLobbySettingKey, TouMiraMediumVoice } from '../../../common/TouMira';
import { defaultLobbySettings } from '../../voice/types';
import { SelectRow, SettingsSection, SwitchRow } from '../SettingsControls';

export interface TouMiraSectionProps {
	t: TFunction;
	gameState: AmongUsState;
	activeLobbySettings: ILobbySettings | null;
	myLobbySettings: ILobbySettings;
	canEditMine: boolean;
	editDisabledReason: string;
	update: (partial: Partial<ILobbySettings>) => void;
}

type ToggleKey = {
	[K in TouMiraLobbySettingKey]: ILobbySettings[K] extends boolean ? K : never;
}[TouMiraLobbySettingKey];

interface RuleRow {
	key: ToggleKey;
	/** Only editable while this other rule is on. */
	requires?: ToggleKey;
}

const mediumVoiceOptions = [
	{ value: TouMiraMediumVoice.None, key: 'none' },
	{ value: TouMiraMediumVoice.MediumToGhost, key: 'medium_to_ghost' },
	{ value: TouMiraMediumVoice.GhostToMedium, key: 'ghost_to_medium' },
	{ value: TouMiraMediumVoice.Both, key: 'both' },
];

const groups: { title: string; rows: RuleRow[] }[] = [
	{
		title: 'blackmailer',
		rows: [
			{ key: 'touMira_muteBlackmailedInMeetings' },
			{ key: 'touMira_muteBlackmailedNextRound', requires: 'touMira_muteBlackmailedInMeetings' },
		],
	},
	{
		title: 'jailor',
		rows: [
			{ key: 'touMira_muteJailedInMeetings' },
			{ key: 'touMira_jailPersistsAfterJailorDeath', requires: 'touMira_muteJailedInMeetings' },
			{ key: 'touMira_deafenJailedInMeetings' },
		],
	},
	{
		title: 'control',
		rows: [
			{ key: 'touMira_mutePuppeteerControlled' },
			{ key: 'touMira_puppeteerHearFromVictim' },
			{ key: 'touMira_muteParasiteControlled' },
			{ key: 'touMira_parasiteHearFromVictim' },
		],
	},
	{
		title: 'other',
		rows: [
			{ key: 'touMira_muteSwooped' },
			{ key: 'touMira_muteGlitchHacked' },
			{ key: 'touMira_muffleBlinded' },
			{ key: 'touMira_muffleHysteria' },
		],
	},
];

const noop = () => undefined;

const TouMiraSection: React.FC<TouMiraSectionProps> = function ({
	t,
	gameState,
	activeLobbySettings,
	myLobbySettings,
	canEditMine,
	editDisabledReason,
	update,
}) {
	const lobbyCode = gameState?.lobbyCode;
	const inOtherHostsLobby = activeLobbySettings !== null && !!lobbyCode && lobbyCode !== 'MENU' && !gameState?.isHost;
	const values = { ...defaultLobbySettings, ...(inOtherHostsLobby ? activeLobbySettings : myLobbySettings) };
	const disabled = inOtherHostsLobby || !canEditMine;
	const disabledReason = inOtherHostsLobby ? t('settings.toumira.host_controls') : editDisabledReason;
	const onUpdate = disabled ? noop : update;

	return (
		<>
			{gameState?.touMira ? (
				<Alert severity="success" sx={{ mb: 2 }}>
					{t('settings.toumira.bridge_connected')}
				</Alert>
			) : (
				<Alert severity="warning" sx={{ mb: 2 }}>
					{t('settings.toumira.bridge_missing')}
				</Alert>
			)}
			{inOtherHostsLobby && (
				<Alert severity="info" sx={{ mb: 2 }}>
					{t('settings.toumira.host_controls')}
				</Alert>
			)}

			<SettingsSection>
				<SwitchRow
					label={t('settings.toumira.touMira_enabled')}
					description={t('settings.toumira.touMira_enabled_description')}
					disabled={disabled}
					disabledReason={disabledReason}
					checked={values.touMira_enabled}
					onChange={(touMira_enabled) => onUpdate({ touMira_enabled })}
				/>
			</SettingsSection>

			{groups.map(({ title, rows }) => (
				<SettingsSection key={title} title={t(`settings.toumira.group_${title}`)}>
					{rows.map(({ key, requires }) => {
						const blocked = !values.touMira_enabled || (requires !== undefined && !values[requires]);
						return (
							<SwitchRow
								key={key}
								label={t(`settings.toumira.${key}`)}
								description={t(`settings.toumira.${key}_description`)}
								disabled={disabled || blocked}
								disabledReason={disabled ? disabledReason : t('settings.toumira.requires_parent')}
								checked={values[key]}
								onChange={(checked) => onUpdate({ [key]: checked })}
							/>
						);
					})}
				</SettingsSection>
			))}

			<SettingsSection title={t('settings.toumira.group_medium')}>
				<SelectRow
					label={t('settings.toumira.touMira_mediumGhostVoice')}
					description={t('settings.toumira.touMira_mediumGhostVoice_description')}
					disabled={disabled || !values.touMira_enabled}
					disabledReason={disabled ? disabledReason : t('settings.toumira.requires_parent')}
					value={String(values.touMira_mediumGhostVoice)}
					options={mediumVoiceOptions.map(({ value, key }) => ({
						value: String(value),
						label: t(`settings.toumira.medium_voice.${key}`),
					}))}
					onChange={(value) => onUpdate({ touMira_mediumGhostVoice: Number(value) })}
				/>
			</SettingsSection>
		</>
	);
};

export default TouMiraSection;
