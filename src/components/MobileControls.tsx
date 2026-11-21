import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Hand } from 'lucide-react';
import type { TouchControlInput } from './GameCanvas';

interface MobileControlsProps {
  touchInputRef: React.MutableRefObject<TouchControlInput>;
  hasNearbyInteraction: boolean;
  nearbyActionLabel?: string;
}

function detectLandscapeTouchViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth > window.innerHeight && window.innerHeight <= 600;
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
  const [isLandscape, setIsLandscape] = useState<boolean>(() => detectLandscapeTouchViewport());

  useEffect(() => {
    const onResize = () => setIsLandscape(detectLandscapeTouchViewport());
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  const maxRadius = isLandscape ? 28 : 34;

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

  const renderJoystick = (compact: boolean) => (
    <div
      data-testid="virtual-joystick"
      role="application"
      aria-label="Virtual movement joystick"
      className={`touch-none flex items-center justify-center rounded-2xl cursor-pointer ${
        compact ? 'p-2' : 'p-3'
      }`}
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
      <div
        ref={padRef}
        className={`relative rounded-full border-2 border-[#f4d17b]/70 bg-[#10261d]/75 shadow-lg pointer-events-none flex items-center justify-center ${
          compact ? 'w-20 h-20' : 'w-24 h-24'
        }`}
      >
        <div
          className={`rounded-full border border-[#f4d17b]/25 pointer-events-none ${
            compact ? 'w-12 h-12' : 'w-14 h-14'
          }`}
        />
        <div
          className={`absolute rounded-full bg-[#e8b948] border-2 border-[#fff4d2] shadow-md pointer-events-none ${
            compact ? 'w-9 h-9' : 'w-11 h-11'
          }`}
          style={{
            transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
          }}
        />
      </div>
    </div>
  );

  const renderActionButtons = (compact: boolean) => (
    <div className={`flex items-end ${compact ? 'gap-0.5' : 'gap-0.5'}`}>
      <button
        type="button"
        data-testid="touch-interact-btn"
        aria-label={nearbyActionLabel ? `Interact: ${nearbyActionLabel}` : 'Interact'}
        onPointerDown={(e) => {
          e.stopPropagation();
          touchInputRef.current.interactRequested = true;
        }}
        className={`group rounded-2xl touch-none flex items-center justify-center cursor-pointer ${
          compact ? 'p-2' : 'p-2.5'
        }`}
      >
        <span
          className={`rounded-full border-2 flex flex-col items-center justify-center gap-0.5 shadow-lg group-active:scale-95 transition-transform pointer-events-none ${
            compact ? 'w-13 h-13' : 'w-14 h-14'
          } ${
            hasNearbyInteraction
              ? 'bg-[#e8b948] text-[#17231c] border-[#fff4d2]'
              : 'bg-[#10261d]/80 text-[#f4e9d0] border-[#f4d17b]/60'
          }`}
        >
          <Hand className="w-4 h-4" />
          <span className="text-[10px] font-bold leading-none">Action</span>
        </span>
      </button>

      <button
        type="button"
        data-testid="touch-jump-btn"
        aria-label="Jump"
        onPointerDown={(e) => {
          e.stopPropagation();
          touchInputRef.current.jumpRequested = true;
        }}
        className={`group rounded-2xl touch-none flex items-center justify-center cursor-pointer ${
          compact ? 'p-2' : 'p-2.5'
        }`}
      >
        <span
          className={`rounded-full bg-[#184f39]/90 text-[#f9eed4] border-2 border-[#f4d17b]/70 flex flex-col items-center justify-center gap-0.5 shadow-lg group-active:scale-95 transition-transform pointer-events-none ${
            compact ? 'w-13 h-13' : 'w-14 h-14'
          }`}
        >
          <ArrowUp className="w-4 h-4" />
          <span className="text-[10px] font-bold leading-none">Jump</span>
        </span>
      </button>
    </div>
  );

  return (
    <div
      className="relative w-full h-full pointer-events-none select-none"
      aria-label="Mobile touch controls"
    >
      {/* Touch Camera Rotation Pad: spans open viewport area without overlapping controls */}
      <div
        className={`absolute pointer-events-auto touch-none ${
          isLandscape ? 'top-14 left-0 right-0 bottom-3' : 'top-20 right-0 bottom-28 w-1/2'
        }`}
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

      {isLandscape ? (
        /* Landscape Mode: single compact bottom-right anchor group with padded invisible hit-boxes */
        <div
          data-testid="mobile-controls-bottom-right-group"
          className="absolute bottom-1 right-1 pointer-events-auto flex items-end gap-0.5"
        >
          {renderActionButtons(true)}
          {renderJoystick(true)}
        </div>
      ) : (
        /* Portrait Mode: left thumb joystick & right thumb action/jump buttons with padded invisible hit-boxes */
        <>
          <div className="absolute bottom-1.5 left-1 pointer-events-auto flex flex-col items-center gap-0.5">
            {renderJoystick(false)}
            <span className="text-[10px] font-medium text-[#f9eed4] bg-[#10261d]/80 px-2 py-0.5 rounded pointer-events-none">
              Move
            </span>
          </div>

          <div className="absolute bottom-1.5 right-1 pointer-events-auto">
            {renderActionButtons(false)}
          </div>
        </>
      )}
    </div>
  );
}
