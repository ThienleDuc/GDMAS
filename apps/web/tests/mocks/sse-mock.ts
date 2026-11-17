import type { SseEventFixture } from "./fixtures.ts";

export interface MockMessageEvent extends MessageEvent<string> {
  data: string;
  lastEventId: string;
  origin: string;
}

type EventListener = (event: Event | MessageEvent<string>) => void;

export class MockEventSource {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;

  readonly url: string;
  readonly withCredentials = false;
  readyState = MockEventSource.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  closed = false;

  private readonly listeners = new Map<string, Set<EventListener>>();

  constructor(url: string | URL) {
    this.url = String(url);
    MockEventSource.instances.push(this);
  }

  static instances: MockEventSource[] = [];

  addEventListener(type: string, listener: EventListener): void {
    const listeners = this.listeners.get(type) ?? new Set<EventListener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  dispatchEvent(event: Event): boolean {
    this.listeners.get(event.type)?.forEach((listener) => listener(event));
    return true;
  }

  open(): void {
    this.readyState = MockEventSource.OPEN;
    this.onopen?.(new Event("open"));
  }

  emit(event: SseEventFixture): void {
    const message = {
      data: JSON.stringify(event),
      lastEventId: event.id ?? "",
      origin: "http://localhost:8000",
      type: event.event,
    } as MockMessageEvent;
    this.listeners.get(event.event)?.forEach((listener) => listener(message));
    this.onmessage?.(message);
  }

  fail(): void {
    this.readyState = MockEventSource.CLOSED;
    this.onerror?.(new Event("error"));
  }

  close(): void {
    this.closed = true;
    this.readyState = MockEventSource.CLOSED;
  }
}

export function installEventSourceMock() {
  const originalEventSource = globalThis.EventSource;
  MockEventSource.instances = [];
  globalThis.EventSource = MockEventSource as unknown as typeof EventSource;

  return {
    instances: MockEventSource.instances,
    restore() {
      globalThis.EventSource = originalEventSource;
      MockEventSource.instances = [];
    },
  };
}
