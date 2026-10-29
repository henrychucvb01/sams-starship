import {
  useEffect,
  useState,
  useSyncExternalStore,
  type RefObject,
} from "react";
import { RoomClient } from "./roomClient";
import { CrewPortrait } from "./CrewSelection";
import { MultiplayerBoard } from "./MultiplayerBoard";
import { ConfirmationDialog } from "../components/ConfirmationDialog";
import type { PlayerCount } from "./protocol";
export const multiplayerOrigin = () =>
  String(import.meta.env.VITE_MULTIPLAYER_URL ?? "").trim();
export function RoomScreen({
  playerCount,
  characters,
  headingRef,
  onBack,
}: {
  playerCount: number;
  characters?: string[];
  headingRef: RefObject<HTMLHeadingElement | null>;
  onBack: () => void;
}) {
  const [client] = useState(() => new RoomClient(multiplayerOrigin()));
  const s = useSyncExternalStore(client.subscribe, client.getSnapshot),
    room = s.room;
  const [name, setName] = useState("");
  const [code, setCode] = useState(
    () => new URLSearchParams(location.search).get("room")?.toUpperCase() ?? "",
  );
  const [copied, setCopied] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [forgetting, setForgetting] = useState(false);
  useEffect(() => {
    if (multiplayerOrigin()) client.activate();
    return client.deactivate;
  }, [client]);
  useEffect(() => {
    headingRef.current?.focus();
  }, [!!room, room?.status]);
  const send = (command: Parameters<typeof client.command>[0]) => {
    void client.command(command).catch(() => {});
  };
  const online = s.connection === "online",
    blocked = s.busy || s.pending || !online;
  const players = room?.players.filter((p) => !p.left) ?? [];
  const self = room?.players.find((p) => p.id === room.playerId);
  return (
    <section className="mp-page page">
      <button
        className="text-button back"
        onClick={() => (room ? setLeaving(true) : onBack())}
      >
        ← {room ? "Leave room" : "Back to crew selection"}
      </button>
      {room && (
        <button className="text-button" onClick={() => setForgetting(true)}>
          Join a different crew
        </button>
      )}
      <div className="mp-status">
        <span className="eyebrow">CIRCUIT RESCUE · HUMAN CREW</span>
        <span role="status">
          {!multiplayerOrigin()
            ? "Online rooms unavailable"
            : s.connection === "online"
              ? "● Connected"
              : s.connection === "connecting"
                ? "Connecting to your crew…"
                : s.connection === "expired"
                  ? "Room unavailable or expired"
                  : "Reconnecting · your seat stays yours"}
        </span>
      </div>
      {!room && (
        <>
          <h1 ref={headingRef} tabIndex={-1}>
            Your crew’s <em>launchpad.</em>
          </h1>
          <p>
            {playerCount} human players · each person plays on their own device
            · no AI
          </p>
          {!multiplayerOrigin() ? (
            <div className="mp-panel">
              <h2>Online rooms are not available yet</h2>
              <p>
                Solo + AI is ready to play. Come back here when online missions
                open.
              </p>
              <button className="primary" onClick={onBack}>
                Choose Solo + AI
              </button>
            </div>
          ) : (
            <>
              <label className="mp-field">
                Your display name
                <input
                  maxLength={24}
                  autoComplete="nickname"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Captain Comet"
                />
              </label>
              <div className="mp-entry-grid">
                <section className="mp-panel">
                  <h2>Create a room</h2>
                  <p>Invite {playerCount - 1} friends with your room code.</p>
                  <button
                    className="primary"
                    disabled={s.busy || !name.trim()}
                    onClick={() =>
                      void client.create(
                        name.trim(),
                        playerCount as PlayerCount,
                        characters,
                      )
                    }
                  >
                    Create {playerCount}-player room
                  </button>
                </section>
                <section className="mp-panel">
                  <h2>Join your friends</h2>
                  <label className="mp-field">
                    Room code
                    <input
                      aria-label="Room code"
                      maxLength={6}
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={false}
                      value={code}
                      onChange={(e) =>
                        setCode(
                          e.target.value
                            .toUpperCase()
                            .replace(/[^A-Z0-9]/g, ""),
                        )
                      }
                      placeholder="ABC123"
                    />
                  </label>
                  <button
                    className="secondary"
                    disabled={s.busy || !name.trim() || code.length !== 6}
                    onClick={() => void client.join(name.trim(), code)}
                  >
                    Join room
                  </button>
                </section>
              </div>
            </>
          )}
        </>
      )}
      {s.error && (
        <p className="mp-error" role="alert">
          {s.error}
        </p>
      )}
      {s.connection === "offline" && (
        <button
          className="secondary compact"
          onClick={() => void client.refresh()}
        >
          Reconnect now
        </button>
      )}
      {s.connection === "expired" && (
        <button className="secondary" onClick={client.forget}>
          Return to room entry
        </button>
      )}
      {s.pending && (
        <div className="mp-error" role="status">
          An action is awaiting confirmation from the ship.{" "}
          <button
            className="secondary compact"
            disabled={s.busy}
            onClick={() => void client.retry().catch(() => {})}
          >
            Retry pending action
          </button>
        </div>
      )}
      {room?.status === "lobby" && (
        <>
          <h1 ref={headingRef} tabIndex={-1}>
            All aboard!
          </h1>
          <section className="mp-panel">
            <span className="eyebrow">YOUR ROOM CODE</span>
            <p className="mp-room-code">{room.code}</p>
            <div className="mp-actions">
              <button
                className="secondary compact"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(room.code);
                    setCopied(true);
                  } catch {
                    setCopied(false);
                  }
                }}
              >
                {copied ? "Copied!" : "Copy room code"}
              </button>
            </div>
            <p>
              {players.length}/{room.playerCount} humans aboard. Everyone needs
              to be ready before launch.
            </p>
          </section>
          <div className="mp-lobby-crew">
            {Array.from({ length: room.playerCount }, (_, i) => {
              const p = players[i];
              return p ? (
                <article className="mp-seat" key={p.id}>
                  <CrewPortrait index={i} character={p.character} name={`${p.name} astronaut`} />
                  <strong>
                    {p.name}
                    {p.id === room.playerId ? " · You" : ""}
                  </strong>
                  <small>
                    {p.id === room.hostId ? "HOST · " : ""}
                    {p.connected ? "Connected" : "Reconnecting"}
                  </small>
                  <span>{p.ready ? "✓ Ready" : "Getting settled"}</span>
                </article>
              ) : (
                <article className="mp-seat empty" key={`empty-${i}`}>
                  <span>✦</span>
                  <strong>Seat {i + 1}</strong>
                  <small>Waiting for a friend</small>
                </article>
              );
            })}
          </div>
          <div className="mp-actions">
            <button
              className="primary"
              disabled={blocked}
              onClick={() => send({ type: "ready", ready: !self?.ready })}
            >
              {self?.ready ? "Not ready yet" : "I’m ready!"}
            </button>
            {room.playerId === room.hostId && (
              <button
                className="secondary"
                disabled={
                  blocked ||
                  players.length !== room.playerCount ||
                  !players.every((p) => p.ready && p.connected)
                }
                onClick={() => send({ type: "start" })}
              >
                Launch mission
              </button>
            )}
          </div>
          <p>
            {room.playerId === room.hostId
              ? "As host, you launch when every seat is filled and ready."
              : "Your host will launch when the whole crew is ready."}
          </p>
        </>
      )}
      {room?.game && (
        <MultiplayerBoard
          room={room}
          blocked={blocked}
          command={client.command}
          headingRef={headingRef}
        />
      )}
      {(leaving || forgetting) && room && (
        <ConfirmationDialog
          title={forgetting ? "Join a different crew?" : "Leave this room?"}
          eyebrow="CREW CONNECTION"
          description={
            forgetting
              ? "This browser will forget its saved seat. You will need a new seat to join again. An active mission seat stays reserved until the room expires."
              : room.status === "lobby"
                ? "Your lobby seat will become available to a friend."
                : "Your active mission seat stays reserved while the room exists. This browser can reconnect with its saved session. The mission clock keeps running."
          }
          busy={s.busy}
          confirmLabel={forgetting ? "Forget seat and continue" : "Leave room"}
          onCancel={() => {
            setLeaving(false);
            setForgetting(false);
          }}
          fallbackFocus={headingRef}
          onConfirm={async () => {
            client.deactivate();
            try {
              await client.command({ type: "leave" });
            } catch (error) {
              client.activate();
              throw error;
            }
            if (forgetting) {
              client.forget();
              setForgetting(false);
              return;
            }
            if (room.status === "lobby") client.forget();
            client.deactivate();
            setLeaving(false);
            onBack();
          }}
        />
      )}
    </section>
  );
}
