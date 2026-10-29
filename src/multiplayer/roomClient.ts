import type {
  RoomView,
  RoomCredentials,
  RoomAdmission,
  RoomCommand,
  CommandRequest,
  PlayerCount,
} from "./protocol";
export type Connection = "connecting" | "online" | "offline" | "expired";
export type RoomSnapshot = {
  room: RoomView | null;
  connection: Connection;
  busy: boolean;
  error: string;
  pending: boolean;
};
class RoomError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
/** Authenticated room transport. Every snapshot is server-redacted; no client engine. */
export class RoomClient {
  private credentials: RoomCredentials | null = null;
  private pending: CommandRequest | null = null;
  private listeners = new Set<() => void>();
  private snapshot: RoomSnapshot = {
    room: null,
    connection: "connecting",
    busy: false,
    error: "",
    pending: false,
  };
  private timer: ReturnType<typeof setTimeout> | undefined;
  private stopped = true;
  private epoch = 0;
  private polls = new Set<AbortController>();
  private storageKey: string;
  constructor(private origin: string) {
    this.origin = origin.replace(/\/$/, "");
    this.storageKey = `starship-room-v1:${this.origin}`;
    try {
      const saved = JSON.parse(localStorage.getItem(this.storageKey) ?? "null");
      if (
        saved?.credentials?.token &&
        saved.credentials.code &&
        saved.credentials.playerId
      ) {
        this.credentials = saved.credentials;
        this.pending = saved.pending ?? null;
      }
    } catch {
      /* Storage is optional; current session works. */
    }
    this.snapshot = { ...this.snapshot, pending: !!this.pending };
  }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(patch: Partial<RoomSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((fn) => fn());
  }
  private save() {
    try {
      if (this.credentials)
        localStorage.setItem(
          this.storageKey,
          JSON.stringify({
            credentials: this.credentials,
            pending: this.pending,
          }),
        );
      else localStorage.removeItem(this.storageKey);
    } catch {
      /* Keep session in memory. */
    }
  }
  private accept(room: RoomView) {
    if (!this.snapshot.room || room.revision >= this.snapshot.room.revision)
      this.publish({
        room,
        connection: "online",
        error: this.pending ? this.snapshot.error : "",
      });
  }
  private async request<T>(
    path: string,
    method = "GET",
    body?: unknown,
  ): Promise<T> {
    const controller = new AbortController(),
      timeout = setTimeout(() => controller.abort(), 8000);
    if (method === "GET") this.polls.add(controller);
    try {
      const response = await fetch(this.origin + path, {
        method,
        headers: {
          ...(body ? { "Content-Type": "application/json" } : {}),
          ...(this.credentials
            ? { Authorization: `Bearer ${this.credentials.token}` }
            : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok)
        throw new RoomError(
          data.error?.message ?? "The room could not complete that request.",
          response.status,
        );
      return data as T;
    } catch (error) {
      if (error instanceof RoomError) throw error;
      throw new RoomError(
        "Connection lost. Reconnect to get the latest crew status.",
        0,
      );
    } finally {
      clearTimeout(timeout);
      this.polls.delete(controller);
    }
  }
  activate = () => {
    if (!this.stopped) return;
    this.stopped = false;
    if (this.credentials) void this.poll();
    else this.publish({ connection: "online" });
  };
  deactivate = () => {
    this.stopped = true;
    this.epoch++;
    clearTimeout(this.timer);
    for (const controller of this.polls) controller.abort();
    this.polls.clear();
  };
  private async poll() {
    if (this.stopped || !this.credentials) return;
    await this.refresh();
    if (!this.stopped && this.snapshot.connection !== "expired")
      this.timer = setTimeout(() => void this.poll(), 1000);
  }
  refresh = async () => {
    if (!this.credentials) return;
    const epoch = this.epoch;
    try {
      const room = await this.request<RoomView>(
        `/api/rooms/${this.credentials.code}`,
      );
      if (epoch === this.epoch) this.accept(room);
    } catch (error) {
      if (epoch !== this.epoch) return;
      const e = error as RoomError;
      this.publish({
        connection: [401, 404, 410].includes(e.status) ? "expired" : "offline",
        error: e.message,
      });
    }
  };
  private async admit(path: string, body: unknown) {
    if (this.snapshot.busy) return;
    this.publish({ busy: true, error: "" });
    try {
      const result = await this.request<RoomAdmission>(path, "POST", body);
      this.epoch++;
      this.credentials = result.credentials;
      this.pending = null;
      this.save();
      this.publish({ room: result.room, connection: "online", pending: false });
      if (!this.stopped) {
        clearTimeout(this.timer);
        this.timer = setTimeout(() => void this.poll(), 1000);
      }
    } catch (error) {
      this.publish({ error: (error as Error).message });
    } finally {
      this.publish({ busy: false });
    }
  }
  create = (name: string, playerCount: PlayerCount, characters?: string[]) =>
    this.admit("/api/rooms", {
      name,
      playerCount,
      characters,
      missionId: "lights",
      difficulty: "easy",
    });
  join = (name: string, code: string) =>
    this.admit(`/api/rooms/${encodeURIComponent(code.toUpperCase())}/join`, {
      name,
    });
  command = async (command: RoomCommand) => {
    if (this.snapshot.busy) throw new Error("An action is already being sent.");
    if (this.pending)
      throw new Error("Resolve the pending action before sending another.");
    if (!this.snapshot.room || !this.credentials)
      throw new Error("Reconnect to the room first.");
    if (this.snapshot.connection !== "online")
      throw new Error("Reconnect before sending an action.");
    this.pending = {
      revision: this.snapshot.room.revision,
      requestId: crypto.randomUUID(),
      command,
    };
    this.save();
    this.publish({ pending: true });
    return this.retry();
  };
  retry = async () => {
    if (!this.pending || !this.credentials || this.snapshot.busy) return;
    this.publish({ busy: true, error: "" });
    try {
      const room = await this.request<RoomView>(
        `/api/rooms/${this.credentials.code}/commands`,
        "POST",
        this.pending,
      );
      this.pending = null;
      this.save();
      this.accept(room);
      this.publish({ pending: false });
    } catch (error) {
      const e = error as RoomError;
      if (e.status) {
        this.pending = null;
        this.save();
        this.publish({ pending: false });
        await this.refresh();
      } else this.publish({ connection: "offline" });
      const message =
        e.status === 409
          ? "The crew’s state changed. Review the latest board and choose your action again."
          : e.message;
      this.publish({ error: message });
      throw new Error(message);
    } finally {
      this.publish({ busy: false });
    }
  };
  forget = () => {
    this.deactivate();
    this.credentials = null;
    this.pending = null;
    this.save();
    this.publish({
      room: null,
      connection: "online",
      error: "",
      pending: false,
    });
    this.stopped = false;
  };
}
export function hasSavedRoom(origin: string) {
  try {
    const saved = JSON.parse(
      localStorage.getItem(`starship-room-v1:${origin.replace(/\/$/, "")}`) ??
        "null",
    );
    return !!saved?.credentials?.token;
  } catch {
    return false;
  }
}
