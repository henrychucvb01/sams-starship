import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
/** A drag only selects a pair for review. It never submits a room command. */
export function useCircuitDrag(
  enabled: boolean,
  onPair: (from: string, to: string) => void,
) {
  const board = useRef<HTMLDivElement>(null),
    pointer = useRef<{
      id: number;
      source: string;
      x: number;
      y: number;
      cx: number;
      cy: number;
      active: boolean;
    } | null>(null),
    frame = useRef<number | undefined>(undefined),
    suppress = useRef(false);
  const [path, setPath] = useState("");
  const [notice, setNotice] = useState("");
  const stop = () => {
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = undefined;
    pointer.current = null;
    setPath("");
  };
  useEffect(
    () => () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    },
    [],
  );
  useEffect(() => {
    if (!enabled) stop();
  }, [enabled]);
  function tick() {
    const p = pointer.current,
      root = board.current;
    if (!p?.active || !root) return;
    if (p.cy < 55) window.scrollBy(0, -12);
    else if (p.cy > innerHeight - 55) window.scrollBy(0, 12);
    const row = document
      .elementFromPoint(p.cx, p.cy)
      ?.closest<HTMLElement>(".rack-scroll");
    if (row) {
      const r = row.getBoundingClientRect();
      if (p.cx < r.left + 25) row.scrollLeft -= 8;
      else if (p.cx > r.right - 25) row.scrollLeft += 8;
    }
    const source = root
        .querySelector(`[data-slot="${CSS.escape(p.source)}"]`)
        ?.getBoundingClientRect(),
      r = root.getBoundingClientRect();
    if (source) {
      const x = source.left + source.width / 2 - r.left,
        y = source.top + source.height / 2 - r.top;
      setPath(
        `M${x} ${y} Q${(x + p.cx - r.left) / 2} ${Math.min(y, p.cy - r.top) - 30} ${p.cx - r.left} ${p.cy - r.top}`,
      );
    }
    frame.current = requestAnimationFrame(tick);
  }
  return {
    board,
    path,
    notice,
    clickAllowed: () => {
      if (suppress.current) {
        suppress.current = false;
        return false;
      }
      return true;
    },
    handlers: (id: string, isOwn: boolean) => ({
      onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => {
        if (
          !enabled ||
          !isOwn ||
          e.button !== 0 ||
          !e.isPrimary ||
          pointer.current
        )
          return;
        if (
          e.pointerType === "touch" &&
          !(e.target as Element).closest("[data-drag-grip]")
        )
          return;
        pointer.current = {
          id: e.pointerId,
          source: id,
          x: e.clientX,
          y: e.clientY,
          cx: e.clientX,
          cy: e.clientY,
          active: false,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
        suppress.current = false;
        setNotice("");
      },
      onPointerMove: (e: ReactPointerEvent<HTMLButtonElement>) => {
        const p = pointer.current;
        if (!p || p.id !== e.pointerId) return;
        p.cx = e.clientX;
        p.cy = e.clientY;
        if (!p.active && Math.hypot(p.cx - p.x, p.cy - p.y) < 8) return;
        p.active = true;
        if (!frame.current) frame.current = requestAnimationFrame(tick);
        e.preventDefault();
      },
      onPointerUp: (e: ReactPointerEvent<HTMLButtonElement>) => {
        const p = pointer.current;
        if (!p || p.id !== e.pointerId) return;
        const target = document
          .elementFromPoint(e.clientX, e.clientY)
          ?.closest<HTMLButtonElement>("button[data-slot]");
        stop();
        if (e.currentTarget.hasPointerCapture(e.pointerId))
          e.currentTarget.releasePointerCapture(e.pointerId);
        if (!p.active) return;
        suppress.current = true;
        if (
          target &&
          !target.disabled &&
          target.dataset.slot &&
          target.dataset.slot !== p.source &&
          board.current?.contains(target)
        )
          onPair(p.source, target.dataset.slot);
        else setNotice("Connection canceled. No action was sent.");
      },
      onPointerCancel: () => {
        stop();
        setNotice("Connection canceled. No action was sent.");
      },
      onLostPointerCapture: () => {
        if (pointer.current) stop();
      },
      onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => {
        if (e.key === "Escape") {
          stop();
          setNotice("Connection canceled. No action was sent.");
        }
      },
    }),
  };
}
