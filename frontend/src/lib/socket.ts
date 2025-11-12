import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

let client: Client | null = null;
let pendingSubs: Array<{
  destination: string;
  handler: (payload: any) => void;
  sub?: any;
}> = [];

export function connectSocket() {
  if (client && client.active) return client;

  client = new Client({
    // use SockJS to hit the Spring STOMP endpoint
    webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
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
          try { sub.unsubscribe(); } catch (e) {}
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
        try { pending.sub.unsubscribe(); } catch (e) {}
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
          try { sub.unsubscribe(); } catch (e) {}
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
        try { pending.sub.unsubscribe(); } catch (e) {}
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
          try { sub.unsubscribe(); } catch (e) {}
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
        try { pending.sub.unsubscribe(); } catch (e) {}
      } else {
        pendingSubs = pendingSubs.filter((p) => p !== pending);
      }
    },
  };
}

export function disconnectSocket() {
  if (client) {
    try { client.deactivate(); } catch (e) {}
    client = null;
  }
}
