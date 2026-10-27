import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
/** Hover, keyboard focus and tap all expose the same public explanation. */
export function InfoPopover({
  label,
  children,
  icon,
  className = "",
}: {
  label: string;
  children: ReactNode;
  icon: ReactNode;
  className?: string;
}) {
  const id = useId();
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const keepOpen = () => {
    clearTimeout(leaveTimer.current);
    setOpen(true);
  };
  const leave = () => {
    leaveTimer.current = setTimeout(() => {
      if (document.activeElement !== anchor.current) setOpen(false);
    }, 150);
  };
  const anchor = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 16, top: 16 });
  useLayoutEffect(() => {
    if (!open) return;
    function positionPanel() {
      const r = anchor.current?.getBoundingClientRect(),
        p = panel.current?.getBoundingClientRect();
      if (!r || !p) return;
      setPosition({
        left: Math.max(12, Math.min(r.left, innerWidth - p.width - 12)),
        top:
          r.bottom + p.height + 12 < innerHeight
            ? r.bottom + 8
            : Math.max(12, r.top - p.height - 8),
      });
    }
    positionPanel();
    window.addEventListener("resize", positionPanel);
    window.addEventListener("scroll", positionPanel, true);
    return () => {
      window.removeEventListener("resize", positionPanel);
      window.removeEventListener("scroll", positionPanel, true);
    };
  }, [open]);
  useEffect(() => () => clearTimeout(leaveTimer.current), []);
  useEffect(() => {
    if (!open) return;
    function outside(e: PointerEvent) {
      if (
        !anchor.current?.contains(e.target as Node) &&
        !panel.current?.contains(e.target as Node)
      )
        setOpen(false);
    }
    function escape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return (
    <>
      <button
        ref={anchor}
        type="button"
        className={`info-trigger ${className}`}
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onPointerEnter={(e) => {
          if (e.pointerType !== "touch") keepOpen();
        }}
        onPointerLeave={leave}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen(true)}
      >
        {icon}
      </button>
      {open &&
        createPortal(
          <div
            ref={panel}
            id={id}
            role="tooltip"
            className="crew-tooltip"
            style={position}
            onPointerEnter={keepOpen}
            onPointerLeave={leave}
          >
            {children}
          </div>,
          document.body,
        )}
    </>
  );
}
