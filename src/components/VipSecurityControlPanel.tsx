import {
  BadgeCheck,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Siren,
  Users,
} from 'lucide-react';
import type { TrackId, VipSecurityProtocol } from '../game/types';

export interface VipSecurityControlActions {
  triggerVipSecurity: () => void;
  clearVipPlatform: (platformId: TrackId) => void;
  verifyVipCredential: (credentialId: string, decision: 'verify' | 'reject') => void;
}

interface VipSecurityControlPanelProps {
  protocol: VipSecurityProtocol | null;
  actions: VipSecurityControlActions;
  compact?: boolean;
}

export function VipSecurityControlPanel({
  protocol,
  actions,
  compact = false,
}: VipSecurityControlPanelProps) {
  if (!protocol || !protocol.active) {
    return (
      <div
        data-testid="vip-security-control-panel"
        className="rounded-xl border border-[#f59e0b]/40 bg-[#13261d] p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-3"
      >
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-display font-bold text-[#fde68a]">
            <ShieldAlert className="w-4 h-4 text-[#f59e0b] shrink-0" />
            <span>Emergency VIP Security Protocol · ভিআইপি নিরাপত্তা ব্যবস্থা</span>
          </div>
          <p className="text-[11px] sm:text-xs text-[#d4c6a3]">
            Trigger a diplomatic convoy drill that shifts station passenger flow patterns, locks specific platforms for clearing, and opens Control Room credential verification.
          </p>
        </div>

        <button
          type="button"
          data-testid="trigger-vip-security-btn"
          onClick={actions.triggerVipSecurity}
          className="min-h-[38px] px-3.5 py-2 rounded-lg bg-[#b91c1c] hover:bg-[#991b1b] border border-[#fca5a5]/50 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 shadow-md"
        >
          <Siren className="w-4 h-4" />
          <span>Emergency VIP Security</span>
        </button>
      </div>
    );
  }

  const pendingCreds = protocol.credentials.filter((c) => c.status === 'pending').length;
  const remainingPlatforms = protocol.lockedPlatforms.filter(
    (p) => !protocol.clearedPlatforms.includes(p),
  ).length;

  return (
    <div
      data-testid="vip-security-control-panel"
      className="rounded-xl border-2 border-[#f59e0b]/75 bg-[#1b1f14] p-3.5 sm:p-4 space-y-3.5 shadow-xl"
    >
      {/* Active Protocol Header */}
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#f59e0b]/25 pb-2.5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-[#b91c1c] text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <Siren className="w-3 h-3" />
              EMERGENCY VIP SECURITY ACTIVE
            </span>
            <span className="font-display font-bold text-sm sm:text-base text-[#fde68a]">
              {protocol.codename}
            </span>
            <span className="text-xs text-[#f5c756]">{protocol.codenameBn}</span>
          </div>
          <div className="text-xs text-[#bae6fd] font-semibold">
            Flow Pattern: {protocol.flowPatternLabel}
          </div>
          {!compact && (
            <p className="text-[11px] text-[#dfd5bc]">{protocol.flowPatternDescription}</p>
          )}
        </div>

        <div className="text-right font-mono-tabular shrink-0">
          <div className="text-xs font-bold text-[#fca5a5]" data-testid="vip-timer-readout">
            Timer: {Math.max(0, Math.ceil(protocol.timeRemainingSec))}s
          </div>
          <div className="text-[11px] text-[#86efac]" data-testid="vip-evac-readout">
            Evac: {protocol.corridorEvacuationPct}% ({protocol.passengersOnLockedPlatforms} on zone)
          </div>
        </div>
      </div>

      {/* Step 1: Specific Platform Clearing */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-bold uppercase tracking-wider text-[#f5c756] flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>Step 1 · Clear Specific Platform Corridor ({remainingPlatforms} left)</span>
          </span>
          <span className="text-[11px] text-[#cbbd98]">
            Order platform clear sweep until civilians exit cordoned platforms
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {protocol.lockedPlatforms.map((platId) => {
            const isCleared = protocol.clearedPlatforms.includes(platId);
            const isSweeping = protocol.sweepOrderedPlatforms.includes(platId);
            const count = protocol.platformPassengerCounts[platId] ?? 0;

            return (
              <div
                key={platId}
                data-testid={`vip-platform-row-${platId}`}
                className={`rounded-lg border px-3 py-2 flex items-center justify-between gap-2 ${
                  isCleared
                    ? 'bg-[#103020] border-[#4ade80]/60'
                    : isSweeping
                      ? 'bg-[#33270d] border-[#f59e0b]/60'
                      : 'bg-[#2a1414] border-[#ef4444]/60'
                }`}
              >
                <div className="text-xs">
                  <div className="font-bold text-[#fbf4e2]">
                    Platform {platId} Security Cordon
                  </div>
                  <div className="font-mono-tabular text-[11px] text-[#dfd5bc]">
                    {isCleared
                      ? 'Perimeter Verified Clear (0 civilians)'
                      : isSweeping
                        ? `Sweeping active — ${count} civilian(s) exiting`
                        : `${count} civilian(s) currently on Platform ${platId}`}
                  </div>
                </div>

                {isCleared ? (
                  <span className="px-2.5 py-1 rounded bg-[#16a34a] text-white text-[11px] font-bold flex items-center gap-1 shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    CLEARED
                  </span>
                ) : (
                  <button
                    type="button"
                    data-testid={`vip-clear-platform-${platId}`}
                    onClick={() => actions.clearVipPlatform(platId)}
                    className="px-3 py-1.5 rounded-lg bg-[#e8b84b] hover:bg-[#f2c65e] text-[#14241b] text-xs font-bold cursor-pointer shrink-0"
                  >
                    {isSweeping ? `Re-Broadcast P${platId} Clear` : `Clear Platform P${platId}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step 2: Delegation Credential Verification */}
      <div className="space-y-2 pt-1 border-t border-[#f59e0b]/20">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-bold uppercase tracking-wider text-[#f5c756] flex items-center gap-1.5">
            <BadgeCheck className="w-3.5 h-3.5" />
            <span>Step 2 · Verify VIP Delegation Credentials ({pendingCreds} pending)</span>
          </span>
          <span className="font-mono-tabular text-[11px] text-[#7dd3fc]">
            Control Room Manifest Prefix: {protocol.expectedManifestPrefix}-XXX · Check Code vs Manifest!
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {protocol.credentials.map((cred) => {
            const isVerified = cred.status === 'verified';
            const isRejected = cred.status === 'rejected';
            const badgeMatches = cred.badgeCode === cred.expectedManifestCode;

            return (
              <div
                key={cred.id}
                data-testid={`vip-cred-card-${cred.id}`}
                className={`rounded-lg border p-2.5 space-y-2 text-xs ${
                  isVerified
                    ? 'bg-[#0e2a1b] border-[#22c55e]/60'
                    : isRejected
                      ? 'bg-[#2a1515] border-[#ef4444]/60'
                      : 'bg-[#0e2017] border-[#e8b84b]/35'
                }`}
              >
                <div>
                  <div className="font-bold text-[#fbf4e2] truncate">{cred.delegateName}</div>
                  <div className="text-[11px] text-[#f5c756] truncate">{cred.delegateNameBn}</div>
                  <div className="text-[10px] text-[#cbbd98] truncate">{cred.designation}</div>
                </div>

                <div className="rounded bg-[#09150e] px-2 py-1.5 font-mono-tabular text-[11px] space-y-0.5 border border-[#e8b84b]/15">
                  <div className="flex justify-between gap-1">
                    <span className="text-[#9cb4a4]">Presented:</span>
                    <span className={badgeMatches ? 'text-[#86efac] font-bold' : 'text-[#fca5a5] font-bold'}>
                      {cred.badgeCode}
                    </span>
                  </div>
                  <div className="flex justify-between gap-1">
                    <span className="text-[#9cb4a4]">Manifest:</span>
                    <span className="text-[#fde68a] font-bold">{cred.expectedManifestCode}</span>
                  </div>
                  <div className="flex justify-between gap-1 text-[10px]">
                    <span className="text-[#9cb4a4]">Coach:</span>
                    <span className="text-[#dfd5bc]">{cred.assignedCoach}</span>
                  </div>
                </div>

                {cred.status === 'pending' ? (
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      data-testid={`vip-cred-verify-${cred.id}`}
                      onClick={() => actions.verifyVipCredential(cred.id, 'verify')}
                      className="py-1.5 px-2 rounded bg-[#16a34a] hover:bg-[#15803d] text-white text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Verify</span>
                    </button>
                    <button
                      type="button"
                      data-testid={`vip-cred-reject-${cred.id}`}
                      onClick={() => actions.verifyVipCredential(cred.id, 'reject')}
                      className="py-1.5 px-2 rounded bg-[#991b1b] hover:bg-[#7f1d1d] text-[#fecaca] text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <ShieldX className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                ) : (
                  <div
                    className={`py-1 px-2 rounded text-center text-[11px] font-bold ${
                      isVerified ? 'bg-[#14532d] text-[#86efac]' : 'bg-[#450a0a] text-[#fca5a5]'
                    }`}
                  >
                    {isVerified ? 'VERIFIED AUTHENTIC' : 'INVALID PASS REJECTED'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
