import net from 'net';
import { TOU_MIRA_BRIDGE_PORT, TOU_MIRA_PROTOCOL_VERSION, TOU_MIRA_STALE_MS, TouMiraSnapshot } from '../common/TouMira';

const RECONNECT_DELAY_MS = 2000;
const MAX_BUFFERED_CHARS = 1 << 20;

/**
 * Keeps a localhost connection to the TOU-Mira bridge plugin and holds its latest snapshot.
 * The bridge is optional: when the game or plugin isn't running this quietly retries.
 */
class TouMiraBridgeClient {
	private socket: net.Socket | null = null;
	private reconnectTimer: NodeJS.Timeout | null = null;
	private buffer = '';
	private latest: TouMiraSnapshot | null = null;
	private receivedAt = 0;
	private running = false;

	start(): void {
		if (this.running) return;
		this.running = true;
		this.connect();
	}

	stop(): void {
		this.running = false;
		if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
		this.reconnectTimer = null;
		this.socket?.destroy();
		this.socket = null;
		this.latest = null;
	}

	snapshot(): TouMiraSnapshot | null {
		if (!this.latest || Date.now() - this.receivedAt > TOU_MIRA_STALE_MS) return null;
		return this.latest;
	}

	private connect(): void {
		const socket = net.createConnection({ host: '127.0.0.1', port: TOU_MIRA_BRIDGE_PORT });
		socket.setEncoding('utf8');
		socket.on('data', (chunk: string) => this.onData(chunk));
		socket.on('error', () => {
			/* 'close' follows and schedules the retry */
		});
		socket.on('close', () => {
			if (this.socket === socket) this.socket = null;
			this.buffer = '';
			this.scheduleReconnect();
		});
		this.socket = socket;
	}

	private scheduleReconnect(): void {
		if (!this.running || this.reconnectTimer) return;
		this.reconnectTimer = setTimeout(() => {
			this.reconnectTimer = null;
			if (this.running) this.connect();
		}, RECONNECT_DELAY_MS);
	}

	private onData(chunk: string): void {
		this.buffer += chunk;
		if (this.buffer.length > MAX_BUFFERED_CHARS) {
			this.socket?.destroy();
			return;
		}

		let newline: number;
		while ((newline = this.buffer.indexOf('\n')) >= 0) {
			const line = this.buffer.slice(0, newline).trim();
			this.buffer = this.buffer.slice(newline + 1);
			if (!line) continue;
			try {
				const message = JSON.parse(line) as TouMiraSnapshot;
				if (message?.v !== TOU_MIRA_PROTOCOL_VERSION || !Array.isArray(message.players)) continue;
				this.latest = message;
				this.receivedAt = Date.now();
			} catch {
				/* ignore a malformed line; the next snapshot replaces it */
			}
		}
	}
}

export const touMiraBridge = new TouMiraBridgeClient();
