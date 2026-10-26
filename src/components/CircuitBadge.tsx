/** Small vector marks from the tracker reference; no gameplay meaning is inferred here. */
export function CircuitBadgeIcon({ kind }: { kind: "yellow" | "red" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      {kind === "yellow" ? (
        <g
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M7 19v-5c0-3 10-2 10-7M7 13V8M17 8v5" />
          <circle cx="7" cy="5.5" r="2" />
          <circle cx="17" cy="4" r="2" />
          <circle cx="17" cy="15.5" r="2" />
          <circle cx="7" cy="20" r="1.4" />
        </g>
      ) : (
        <path
          d="m13.5 2.5-8 11h6l-1 8 8-12h-6l1-7Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
