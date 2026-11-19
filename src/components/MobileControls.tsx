import { useRef, useState } from 'react';
import { ArrowUp, Hand } from 'lucide-react';
import type { TouchControlInput } from './GameCanvas';

interface MobileControlsProps {
  touchInputRef: React.MutableRefObject<TouchControlInput>;
  hasNearbyInteraction: boolean;
  nearbyActionLabel?: string;
}

export function MobileControls({
  touchInputRef,
  hasNearbyInteraction,
  nearbyActionLabel,
}: MobileControlsProps) {
  const padRef = useRef<HTMLDivElement | null>(null);
  const joyPointerId = useRef<number | null>(null);
  const camPointerId = useRef<number | null>(null);
  const camLastPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [knobOffset, setKnobOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const maxRadius = 40;

  const updateJoystick = (clientX: number, clientY: number) => {
    const el = padRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    const ratio = dist / maxRadius;
    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }
    setKnobOffset({ x: dx, y: dy });
    // Screen Y down is negative forward; screen X right is positive right
    touchInputRef.current.moveX = dx / maxRadius;
    touchInputRef.current.moveY = -dy / maxRadius;
    // Pushing joystick to outer rim engages natural sprint
    touchInputRef.current.sprintActive = ratio > 0.88;
  };

  const resetJoystick = () => {
    joyPointerId.current = null;
    setKnobOffset({ x: 0, y: 0 });
    touchInputRef.current.moveX = 0;
    touchInputRef.current.moveY = 0;
    touchInputRef.current.sprintActive = false;
  };

  return (
    <div
      className="fixed inset-0 z-10 pointer-events-none select-none"
      aria-label="Mobile touch controls"
    >
      {/* Right-Side Touch Camera Rotation Pad */}
      <div
        className="absolute top-32 right-0 bottom-28 w-1/2 pointer-events-auto touch-none"
        aria-label="Touch camera control area"
        onPointerDown={(e) => {
          if (camPointerId.current !== null) return;
          camPointerId.current = e.pointerId;
          camLastPos.current = { x: e.clientX, y: e.clientY };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (e.pointerId !== camPointerId.current) return;
          const dx = e.clientX - camLastPos.current.x;
          const dy = e.clientY - camLastPos.current.y;
          camLastPos.current = { x: e.clientX, y: e.clientY };
          touchInputRef.current.cameraDeltaX += dx * 1.25;
          touchInputRef.current.cameraDeltaY += dy * 1.1;
        }}
        onPointerUp={(e) => {
          if (e.pointerId === camPointerId.current) {
            camPointerId.current = null;
          }
        }}
        onPointerCancel={(e) => {
          if (e.pointerId === camPointerId.current) {
            camPointerId.current = null;
          }
        }}
      />

      {/* Bottom-Left Virtual Joystick */}
      <div className="absolute bottom-5 left-5 pointer-events-auto flex flex-col items-center gap-1.5">
        <div
          ref={padRef}
          data-testid="virtual-joystick"
          role="application"
          aria-label="Virtual movement joystick"
          className="relative w-28 h-28 rounded-full border-2 border-[#f4d17b]/70 bg-[#10261d]/75 shadow-lg touch-none flex items-center justify-center"
          onPointerDown={(e) => {
            e.stopPropagation();
            joyPointerId.current = e.pointerId;
            e.currentTarget.setPointerCapture(e.pointerId);
            updateJoystick(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (e.pointerId !== joyPointerId.current) return;
            updateJoystick(e.clientX, e.clientY);
          }}
          onPointerUp={(e) => {
            if (e.pointerId === joyPointerId.current) {
              resetJoystick();
            }
          }}
          onPointerCancel={(e) => {
            if (e.pointerId === joyPointerId.current) {
              resetJoystick();
            }
          }}
        >
          <div className="w-16 h-16 rounded-full border border-[#f4d17b]/25 pointer-events-none" />
          <div
            className="absolute w-12 h-12 rounded-full bg-[#e8b948] border-2 border-[#fff4d2] shadow-md pointer-events-none"
            style={{
              transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
            }}
          />
        </div>
        <span className="text-[11px] font-medium text-[#f9eed4] bg-[#10261d]/80 px-2 py-0.5 rounded">
          Move
        </span>
      </div>

      {/* Bottom-Right Jump & Interact Touch Buttons */}
      <div className="absolute bottom-5 right-5 pointer-events-auto flex items-end gap-3">
        <button
          type="button"
          data-testid="touch-interact-btn"
          aria-label={nearbyActionLabel ? `Interact: ${nearbyActionLabel}` : 'Interact'}
          onPointerDown={(e) => {
            e.stopPropagation();
            touchInputRef.current.interactRequested = true;
          }}
          className={`w-16 h-16 rounded-full border-2 flex flex-col items-center justify-center gap-0.5 shadow-lg active:scale-95 transition-transform touch-none ${
            hasNearbyInteraction
              ? 'bg-[#e8b948] text-[#17231c] border-[#fff4d2]'
              : 'bg-[#10261d]/80 text-[#f4e9d0] border-[#f4d17b]/60'
          }`}
        >
          <Hand className="w-5 h-5" />
          <span className="text-[11px] font-bold leading-none">Action</span>
        </button>

        <button
          type="button"
          data-testid="touch-jump-btn"
          aria-label="Jump"
          onPointerDown={(e) => {
            e.stopPropagation();
            touchInputRef.current.jumpRequested = true;
          }}
          className="w-16 h-16 rounded-full bg-[#184f39]/90 text-[#f9eed4] border-2 border-[#f4d17b]/70 flex flex-col items-center justify-center gap-0.5 shadow-lg active:scale-95 transition-transform touch-none"
        >
          <ArrowUp className="w-5 h-5" />
          <span className="text-[11px] font-bold leading-none">Jump</span>
        </button>
      </div>
    </div>
  );
}
