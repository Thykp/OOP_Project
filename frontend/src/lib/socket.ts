import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const baseURL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// STOMP/WebSocket client for slot updates
let client: Client | null = null;
let pendingSubs: Array<{
    destination: string;
    handler: (payload: any) => void;
    sub?: any;
}> = [];

// SSE clients for queue updates (per clinic)
const queueSseClients = new Map<string, EventSource>();

export function connectSocket() {
    if (client && client.active) return client;

    client = new Client({
        // use SockJS to hit the Spring STOMP endpoint
        webSocketFactory: () => new SockJS(`${baseURL}/ws`),
        reconnectDelay: 5000,
        debug: (_str: string) => {
            // console.debug('[STOMP]', str);
        },
    });

    client.onConnect = (_frame: any) => {
        console.log('WebSocket connected');
        // subscribe any pending subscriptions
        try {
            pendingSubs.forEach((p) => {
                try {
                    p.sub = client!.subscribe(p.destination, (message) => {
                        try {
                            const body = JSON.parse(message.body);
                            p.handler(body);
                        } catch (e) {
                            console.error('Failed to parse slot update', e);
                        }
                    });
                } catch (e) {
                    console.error('Failed to subscribe pending', e);
                }
            });
            // clear pending list but keep subs attached
            pendingSubs = pendingSubs.filter((p) => !!p.sub);
        } catch (e) {
            console.error('Error processing pending subscriptions', e);
        }
    };

    client.onStompError = (_frame: any) => {
        try {
            console.error('Broker reported error: ' + _frame.headers['message']);
        } catch (e) {
            console.error('Broker reported unknown STOMP error', e);
        }
    };

    client.activate();
    return client;
}

export function subscribeToSlots(handler: (payload: any) => void) {
    const destination = '/topic/slots';
    if (!client) connectSocket();

    // if already connected, subscribe immediately
    if (client && (client as any).connected) {
        try {
            const sub = client.subscribe(destination, (message) => {
                try {
                    const body = JSON.parse(message.body);
                    handler(body);
                } catch (e) {
                    console.error('Failed to parse slot update', e);
                }
            });
            return {
                unsubscribe: () => {
                    try { sub.unsubscribe(); } catch (e) { }
                },
            };
        } catch (e) {
            console.error('Failed to subscribe immediately', e);
            // fall through to queueing
        }
    }

    // not connected yet — queue subscription
    const pending: { destination: string; handler: (payload: any) => void; sub?: any } = { destination, handler, sub: undefined };
    pendingSubs.push(pending);

    return {
        unsubscribe: () => {
            // if sub already created, unsubscribe
            if (pending.sub) {
                try { pending.sub.unsubscribe(); } catch (e) { }
            } else {
                // remove from pending queue
                pendingSubs = pendingSubs.filter((p) => p !== pending);
            }
        },
    };
}

export function subscribeToAppointmentStatus(handler: (payload: any) => void) {
    const destination = '/topic/appointments/status';
    if (!client) connectSocket();

    if (client && (client as any).connected) {
        try {
            const sub = client.subscribe(destination, (message) => {
                try {
                    const body = JSON.parse(message.body);
                    handler(body);
                } catch (e) {
                    console.error('Failed to parse appointment status update', e);
                }
            });
            return {
                unsubscribe: () => {
                    try { sub.unsubscribe(); } catch (e) { }
                },
            };
        } catch (e) {
            console.error('Failed to subscribe immediately', e);
        }
    }

    const pending: { destination: string; handler: (payload: any) => void; sub?: any } = { destination, handler, sub: undefined };
    pendingSubs.push(pending);

    return {
        unsubscribe: () => {
            if (pending.sub) {
                try { pending.sub.unsubscribe(); } catch (e) { }
            } else {
                pendingSubs = pendingSubs.filter((p) => p !== pending);
            }
        },
    };
}

export function subscribeToTreatmentNotes(handler: (payload: any) => void) {
    const destination = '/topic/appointments/treatment-notes';
    if (!client) connectSocket();

    if (client && (client as any).connected) {
        try {
            const sub = client.subscribe(destination, (message) => {
                try {
                    const body = JSON.parse(message.body);
                    handler(body);
                } catch (e) {
                    console.error('Failed to parse treatment note update', e);
                }
            });
            return {
                unsubscribe: () => {
                    try { sub.unsubscribe(); } catch (e) { }
                },
            };
        } catch (e) {
            console.error('Failed to subscribe immediately', e);
        }
    }

    const pending: { destination: string; handler: (payload: any) => void; sub?: any } = { destination, handler, sub: undefined };
    pendingSubs.push(pending);

    return {
        unsubscribe: () => {
            if (pending.sub) {
                try { pending.sub.unsubscribe(); } catch (e) { }
            } else {
                pendingSubs = pendingSubs.filter((p) => p !== pending);
            }
        },
    };
}

export function disconnectSocket() {
    if (client) {
        try { client.deactivate(); } catch (e) { }
        client = null;
    }
    // Close all SSE connections
    queueSseClients.forEach((eventSource) => {
        try { eventSource.close(); } catch (e) { }
    });
    queueSseClients.clear();
}

// ============================================================================
// Queue State Management (SSE + REST API)
// ============================================================================

export interface QueueStateResponse {
    clinicId: string;
    nowServing: number;
    totalWaiting: number;
    queueItems: Array<{
        appointmentId: string;
        patientId: string;
        patientName: string;
        email: string;
        phone: string;
        position: number;
        queueNumber: number;
        doctorId: string;
        doctorName: string;
        doctorSpeciality: string;
        createdAt: string;
    }>;
}

export interface QueueStateUpdate {
    type: "QUEUE_STATE_UPDATE";
    clinicId: string;
    timestamp: number;
    nowServing: number;
    totalWaiting: number;
    queueItems: Array<{
        appointmentId: string;
        patientId: string;
        patientName: string;
        email: string;
        phone: string;
        position: number;
        queueNumber: number;
        doctorId: string;
        doctorName: string;
        doctorSpeciality: string;
        createdAt: string;
    }>;
}

/**
 * Fetch initial queue state from REST API
 */
export async function fetchQueueState(clinicId: string): Promise<QueueStateResponse> {
    const res = await fetch(`${baseURL}/api/queue/state/${clinicId}`);
    if (!res.ok) {
        throw new Error(`Failed to fetch queue state: ${res.statusText}`);
    }
    return res.json();
}

/**
 * Subscribe to queue state updates via Server-Sent Events (SSE)
 * Returns a cleanup function to close the connection
 */
export function subscribeToQueueState(
    clinicId: string,
    onUpdate: (update: QueueStateUpdate) => void,
    onError?: (error: Event) => void
) {
    // Close existing connection for this clinic if any
    const existing = queueSseClients.get(clinicId);
    if (existing) {
        try {
            existing.close();
        } catch (e) {
            console.warn('[QueueSSE] Error closing existing connection:', e);
        }
    }

    const eventSource = new EventSource(`${baseURL}/api/stream/queues/${clinicId}`);
    queueSseClients.set(clinicId, eventSource);

    console.log('[QueueSSE] Connecting to SSE endpoint:', `${baseURL}/api/stream/queues/${clinicId}`);

    eventSource.onopen = () => {
        console.log('[QueueSSE] SSE connection opened for clinic:', clinicId);
    };

    eventSource.addEventListener('queue-event', (e) => {
        console.log('[QueueSSE] Received queue-event for clinic:', clinicId, 'data:', e.data);
        try {
            const data = JSON.parse(e.data);

            // Only handle QUEUE_STATE_UPDATE events
            if (data.type === 'QUEUE_STATE_UPDATE') {
                onUpdate(data as QueueStateUpdate);
            }
            // Ignore other event types (those are for Kafka/toast notifications)
        } catch (err) {
            console.error('[QueueSSE] Failed to parse queue state update:', err);
        }
    });

    eventSource.addEventListener('heartbeat', () => {
        // Connection alive - no action needed
        console.debug('[QueueSSE] Heartbeat received for clinic:', clinicId);
    });

    eventSource.onerror = (error) => {
        console.error('[QueueSSE] Connection error for clinic:', clinicId, error);
        if (onError) {
            onError(error);
        }
        // EventSource will automatically attempt to reconnect
    };

    return {
        close: () => {
            try {
                eventSource.close();
                queueSseClients.delete(clinicId);
            } catch (e) {
                console.warn('[QueueSSE] Error closing connection:', e);
            }
        },
        eventSource,
    };
}
