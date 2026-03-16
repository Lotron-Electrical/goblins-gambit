import { useEffect, useCallback, useRef } from "react";
import { useStore } from "../../store.js";
import { soundManager } from "../../audio/SoundManager.js";

export default function DragOverlay() {
  const draggingCard = useStore((s) => s.draggingCard);
  const dragPosition = useStore((s) => s.dragPosition);
  const storeRef = useRef(useStore.getState());

  // Keep a fresh ref to avoid stale closures
  useEffect(() => {
    return useStore.subscribe((s) => {
      storeRef.current = s;
    });
  }, []);

  useEffect(() => {
    if (!draggingCard) return;

    const onMove = (x, y) => {
      useStore.getState().setDragPosition({ x, y });
    };

    const onDrop = (x, y) => {
      const card = useStore.getState().draggingCard;
      if (!card) return;
      const el = document.elementFromPoint(x, y);
      const slotEl = el?.closest("[data-drop-slot]");
      if (slotEl) {
        const slotIndex = parseInt(slotEl.getAttribute("data-drop-slot"), 10);
        if (!isNaN(slotIndex)) {
          soundManager.play("card_play");
          useStore.getState().playCard(card.uid, { slotIndex });
        }
      }
      useStore.getState().clearDraggingCard();
    };

    const cancel = () => useStore.getState().clearDraggingCard();

    // Mouse events (desktop drag)
    const onMouseMove = (e) => {
      e.preventDefault();
      onMove(e.clientX, e.clientY);
    };
    const onMouseUp = (e) => onDrop(e.clientX, e.clientY);

    // Touch events (mobile drag)
    const onTouchMove = (e) => {
      e.preventDefault();
      onMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchEnd = (e) => {
      const t = e.changedTouches[0];
      onDrop(t.clientX, t.clientY);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);
    document.addEventListener("touchcancel", cancel);

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", cancel);
    };
  }, [draggingCard]);

  if (!draggingCard || !dragPosition) return null;

  return (
    <div
      className="fixed pointer-events-none z-[100]"
      style={{
        left: dragPosition.x - 50,
        top: dragPosition.y - 70,
        transition: "left 0.04s linear, top 0.04s linear",
      }}
    >
      {/* Glow trail behind the card */}
      <div
        className="absolute inset-0 rounded-lg animate-drag-glow"
        style={{ margin: "-4px" }}
      />
      <div
        className="w-[100px] h-[140px] rounded-lg border-2 border-[var(--color-gold)] bg-gray-900 overflow-hidden relative"
        style={{
          opacity: 0.9,
          transform: "rotate(-4deg) scale(1.05)",
          boxShadow: "0 0 24px rgba(212, 175, 55, 0.5), 0 8px 32px rgba(0, 0, 0, 0.5)",
        }}
      >
        {draggingCard.image && (
          <img
            src={`/cards/${draggingCard.image}`}
            alt={draggingCard.name}
            className="w-full h-[155%] object-cover object-top"
            draggable={false}
          />
        )}
        {/* Bottom gradient for name readability */}
        <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t from-black/90 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 text-center py-1">
          <span className="text-[10px] text-white font-bold truncate block px-1 drop-shadow-md">
            {draggingCard.name}
          </span>
        </div>
      </div>
    </div>
  );
}
