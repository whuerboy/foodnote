import { useRef, useState, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
export function SwipeableRow({
  children,
  onDelete,
  label,
}: {
  children: ReactNode;
  onDelete: () => void;
  label: string;
}) {
  const start = useRef<{ x: number; y: number; base: number } | null>(null),
    blockClickUntil = useRef(0);
  const [open, setOpen] = useState(false),
    [offset, setOffset] = useState<number | null>(null);
  const begin = (x: number, y: number) => {
    start.current = { x, y, base: open ? -80 : 0 };
  };
  const move = (x: number, y: number) => {
    const s = start.current;
    if (!s) return;
    const dx = x - s.x,
      dy = y - s.y;
    if (Math.abs(dx) > 9 && Math.abs(dx) > Math.abs(dy) * 1.5)
      setOffset(Math.max(-80, Math.min(0, s.base + dx)));
  };
  const end = (x: number, y: number) => {
    const s = start.current;
    if (!s) return;
    const dx = x - s.x,
      dy = y - s.y;
    if (Math.abs(dx) > 20 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      setOpen(s.base + dx < -40);
      blockClickUntil.current = Date.now() + 450;
    }
    setOffset(null);
    start.current = null;
  };
  return (
    <div className="swipe" data-swipe="true">
      <button
        className="swipe-delete"
        aria-hidden={!open}
        tabIndex={open ? 0 : -1}
        aria-label={label}
        onClick={onDelete}
      >
        <Trash2 size={18} />
        删除
      </button>
      <div
        className={`swipe-front ${open ? "swiped" : ""} ${offset !== null ? "dragging" : ""}`}
        style={
          offset !== null ? { transform: `translateX(${offset}px)` } : undefined
        }
        onClickCapture={(e) => {
          if (Date.now() < blockClickUntil.current) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        onPointerDown={(e) => begin(e.clientX, e.clientY)}
        onPointerMove={(e) => move(e.clientX, e.clientY)}
        onPointerUp={(e) => end(e.clientX, e.clientY)}
        onPointerCancel={() => {
          start.current = null;
          setOffset(null);
        }}
        onTouchStart={(e) => begin(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => move(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={(e) =>
          end(e.changedTouches[0].clientX, e.changedTouches[0].clientY)
        }
      >
        {children}
        <button
          className="swipe-toggle"
          aria-label={`显示${label}`}
          onClick={() => setOpen(!open)}
        >
          ···
        </button>
      </div>
    </div>
  );
}
