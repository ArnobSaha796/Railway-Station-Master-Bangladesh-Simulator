import { useEffect, useState } from 'react';
import type { NpcFloatingBubble } from '../game/types';

interface NpcBubblesOverlayProps {
  bubbles: NpcFloatingBubble[];
}

function bubbleColors(tone: NpcFloatingBubble['tone']): string {
  switch (tone) {
    case 'collision':
      return 'border-[#f97316] bg-[#3d170b]/95 text-[#ffedd5]';
    case 'incident':
      return 'border-[#ef4444] bg-[#450a0a]/95 text-[#fee2e2]';
    case 'crime':
      return 'border-[#f43f5e] bg-[#4c0519]/95 text-[#ffe4e6]';
    case 'police':
      return 'border-[#38bdf8] bg-[#0c2d48]/95 text-[#e0f2fe]';
    case 'question':
      return 'border-[#facc15] bg-[#143625]/95 text-[#fef9c3]';
    case 'vendor':
      return 'border-[#38bdf8] bg-[#0d2838]/92 text-[#e0f2fe]';
    default:
      return 'border-[#e8b84b]/60 bg-[#122b1f]/90 text-[#fbf4e2]';
  }
}

export function NpcBubblesOverlay({ bubbles }: NpcBubblesOverlayProps) {
  const [isCompact, setIsCompact] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1024 || window.innerHeight <= 540 : false,
  );

  useEffect(() => {
    const onResize = () => setIsCompact(window.innerWidth < 1024 || window.innerHeight <= 540);
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  if (bubbles.length === 0) return null;

  const visibleBubbles = isCompact ? bubbles.slice(0, 2) : bubbles;

  return (
    <div className="fixed inset-0 z-10 pointer-events-none overflow-hidden">
      {visibleBubbles.map((b) => {
        const rawLeft = Math.round(b.screenX * 1000) / 10;
        const rawTop = Math.round(b.screenY * 1000) / 10;
        const leftPct = isCompact ? Math.max(18, Math.min(82, rawLeft)) : rawLeft;
        const topPct = isCompact ? Math.max(24, Math.min(74, rawTop)) : rawTop;

        return (
          <div
            key={b.id}
            data-testid="npc-floating-bubble"
            data-tone={b.tone}
            className={`absolute -translate-x-1/2 -translate-y-full rounded-lg border shadow-lg text-center ${
              isCompact ? 'max-w-[170px] px-2 py-1' : 'max-w-[270px] px-2.5 py-1.5'
            } ${bubbleColors(b.tone)}`}
            style={{
              left: `${leftPct}%`,
              top: `${topPct}%`,
            }}
          >
            <div className={isCompact ? 'text-[10px] font-bold leading-tight' : 'text-xs font-bold leading-snug'}>
              {b.text}
            </div>
            {b.subText && (
              <div className="text-[10px] opacity-85 leading-tight mt-0.5">{b.subText}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
