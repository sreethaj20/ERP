type WSEventHandler = (data: any) => void;

const MAX_RETRIES = 5;
const BASE_RETRY_MS = 5000;

class WebSocketService {
    private socket: WebSocket | null = null;
    private handlers: Map<string, WSEventHandler[]> = new Map();
    private currentUserId: string | null = null;
    private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    private isConnected: boolean = false;
    private messageQueue: Array<{ event: string; data: any }> = [];
    private retryCount: number = 0;
    private pingInterval: ReturnType<typeof setTimeout> | null = null;

    constructor() {
        console.log('[WS] Service initialized. Waiting for connect() call...');
    }

    private getWsUrl(): string {
        const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
        if (envUrl && envUrl.includes('http')) {
            try {
                const urlObj = new URL(envUrl);
                const protocol = urlObj.protocol === 'https:' ? 'wss:' : 'ws:';
                return `${protocol}//${urlObj.host}/ws/${this.currentUserId}`;
            } catch (e) {
                console.error('[WS] Failed to parse API URL for WebSocket host:', e);
            }
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Using window.location.host allows the Vite proxy to handle the /ws path
        return `${protocol}//${window.location.host}/ws/${this.currentUserId}`;
    }

    public connect(userId: string): void {
        // Guard: never connect if the user is not authenticated
        const token = sessionStorage.getItem('token');
        const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
        if (!token || !isLoggedIn || !userId) {
            console.log('[WS] Skipping connect — user not authenticated');
            return;
        }

        if (this.socket || this.isConnected) {
            if (this.currentUserId === userId) return;
            this.disconnect();
        }

        if (this.retryCount >= MAX_RETRIES) {
            console.warn(`[WS] Max retries (${MAX_RETRIES}) reached. Refresh the page to retry.`);
            return;
        }

        this.currentUserId = userId;
        const url = this.getWsUrl();
        console.log(`[WS] Connecting to ${url}... (attempt ${this.retryCount + 1}/${MAX_RETRIES})`);

        try {
            this.socket = new WebSocket(url);

            this.socket.onopen = () => {
                this.isConnected = true;
                this.retryCount = 0;
                console.log(`[WS] ✅ Connected as user ${userId}`);
                this.emit('connection_change', { status: 'connected' });

                if (this.reconnectTimeout) {
                    clearTimeout(this.reconnectTimeout);
                    this.reconnectTimeout = null;
                }

                this.startHeartbeat();
                this.flushQueue();
            };

            this.socket.onmessage = (event: MessageEvent) => {
                try {
                    const message = JSON.parse(event.data as string);
                    if (message.event) {
                        this.emit(message.event, message.data);
                    } else {
                        this.emit('message', message);
                    }
                } catch (_e) {
                    this.emit('message', event.data);
                }
            };

            this.socket.onclose = (event: CloseEvent) => {
                this.isConnected = false;
                this.socket = null;
                this.stopHeartbeat();
                console.log(`[WS] ❌ Closed (Code: ${event.code}, Clean: ${event.wasClean})`);
                this.emit('connection_change', { status: 'disconnected' });

                const stillLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
                if (
                    this.currentUserId &&
                    !event.wasClean &&
                    stillLoggedIn &&
                    this.retryCount < MAX_RETRIES
                ) {
                    // Exponential backoff: 5s, 10s, 20s … capped at 30s
                    const delay = Math.min(BASE_RETRY_MS * Math.pow(2, this.retryCount), 30000);
                    this.retryCount++;
                    console.log(`[WS] Reconnecting in ${delay / 1000}s (attempt ${this.retryCount}/${MAX_RETRIES})...`);
                    this.reconnectTimeout = setTimeout(() => {
                        if (this.currentUserId) this.connect(this.currentUserId);
                    }, delay);
                }
            };

            this.socket.onerror = () => {
                // onerror fires before onclose — suppress repeat spam after first attempt
                if (this.retryCount < 1) {
                    console.warn('[WS] ⚠️ Connection failed — is the backend running on port 8000?');
                }
                // Retry is handled in onclose
            };
        } catch (err) {
            console.error('[WS] WebSocket creation error:', err);
        }
    }

    private startHeartbeat(): void {
        this.stopHeartbeat();
        this.pingInterval = setInterval(() => {
            if (this.isConnected) {
                this.send('ping', { t: Date.now() });
            }
        }, 25000); // 25s keep-alive
    }

    private stopHeartbeat(): void {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    public on(event: string, handler: WSEventHandler): void {
        if (!this.handlers.has(event)) {
            this.handlers.set(event, []);
        }
        this.handlers.get(event)!.push(handler);
    }

    public off(event: string, handler?: WSEventHandler): void {
        if (!handler) {
            this.handlers.delete(event);
            return;
        }
        const list = this.handlers.get(event);
        if (list) {
            this.handlers.set(event, list.filter(h => h !== handler));
        }
    }

    private emit(event: string, data: any): void {
        const handlers = this.handlers.get(event);
        if (handlers) {
            handlers.forEach(h => h(data));
        }
    }

    private flushQueue(): void {
        while (this.messageQueue.length > 0 && this.isConnected && this.socket) {
            const msg = this.messageQueue.shift()!;
            this.socket.send(JSON.stringify({ event: msg.event, data: msg.data }));
        }
    }

    public send(event: string, data: any): void {
        if (this.isConnected && this.socket) {
            this.socket.send(JSON.stringify({ event, data }));
        } else {
            this.messageQueue.push({ event, data });
        }
    }

    public disconnect(): void {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        if (this.socket) {
            // Only close if it's in a state that allows closing
            if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) {
                this.socket.close(1000, 'User disconnected');
            }
            this.socket = null;
        }
        this.isConnected = false;
        this.currentUserId = null;
        this.retryCount = 0;
        this.emit('connection_change', { status: 'disconnected' });
    }
}

const webSocketService = new WebSocketService();
export default webSocketService;
