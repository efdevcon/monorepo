'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { ethers } from 'ethers';
import { CheckCircle, XCircle, Shield, Fingerprint, Key, Copy, ExternalLink, Tag, Ticket, Gift, Calendar } from 'lucide-react';
import cn from 'classnames';

type TicketType = 'attendee' | 'addon' | 'swag' | 'event';

interface VerificationResult {
  valid: boolean;
  recoveredAddress: string | null;
  expectedAddress: string;
  error?: string;
}

const DEFAULT_TICKET_PARTNER = 'ens';
const DEFAULT_TICKET_EVENT_NAME = 'Devconnect ARG';

function normalizeTicketPartner(partner?: string | null): string {
  const normalized = (partner ?? DEFAULT_TICKET_PARTNER).trim().toLowerCase();
  return normalized || DEFAULT_TICKET_PARTNER;
}

function normalizeTicketEventName(eventName?: string | null): string {
  const normalized = (eventName ?? DEFAULT_TICKET_EVENT_NAME).trim();
  return normalized || DEFAULT_TICKET_EVENT_NAME;
}

const TICKET_TYPE_LABELS: Record<
  TicketType,
  { label: string; icon: typeof Ticket }
> = {
  attendee: {
    label: 'Attendee Ticket',
    icon: Ticket,
  },
  event: { label: 'Event Ticket', icon: Calendar },
  addon: { label: 'Add-on', icon: Tag },
  swag: { label: 'Swag Item', icon: Gift },
};

/**
 * Creates the message hash that was signed (must match backend)
 */
function createProofMessage(
  identifier: string,
  ticketType: TicketType,
  partner: string,
  eventName: string
): Uint8Array {
  const messageHash = ethers.keccak256(
    ethers.solidityPacked(
      ['bytes32', 'string', 'string', 'string'],
      [identifier, ticketType, partner, eventName]
    )
  );
  return ethers.getBytes(messageHash);
}

function VerifyContent() {
  const searchParams = useSearchParams();

  const identifier = searchParams.get('id');
  const proof = searchParams.get('proof');
  const signer = searchParams.get('signer');
  const ticketType = (searchParams.get('type') || 'attendee') as TicketType;
  const partner = normalizeTicketPartner(searchParams.get('partner'));
  const ticketName = searchParams.get('name');
  const eventName = normalizeTicketEventName(searchParams.get('event'));

  const [verificationResult, setVerificationResult] =
    useState<VerificationResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const typeInfo =
    TICKET_TYPE_LABELS[ticketType] || TICKET_TYPE_LABELS.attendee;
  const TypeIcon = typeInfo.icon;

  useEffect(() => {
    if (identifier && proof && signer) {
      verifyProof();
    }
  }, [identifier, proof, signer, ticketType]);

  const verifyProof = async () => {
    if (!identifier || !proof || !signer) return;

    setVerifying(true);
    try {
      // Recreate the message that was signed (identifier + ticketType + partner + eventName)
      const message = createProofMessage(
        identifier,
        ticketType,
        partner,
        eventName
      );

      // Verify the signature matches the combined message
      const recoveredAddress = ethers.verifyMessage(message, proof);

      const isValid = recoveredAddress.toLowerCase() === signer.toLowerCase();

      setVerificationResult({
        valid: isValid,
        recoveredAddress,
        expectedAddress: signer,
      });
    } catch (error) {
      setVerificationResult({
        valid: false,
        recoveredAddress: null,
        expectedAddress: signer,
        error: error instanceof Error ? error.message : 'Verification failed',
      });
    }
    setVerifying(false);
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const truncateHash = (hash: string, chars = 8) => {
    if (hash.length <= chars * 2 + 2) return hash;
    return `${hash.slice(0, chars + 2)}...${hash.slice(-chars)}`;
  };

  // No proof data provided
  if (!identifier || !proof || !signer) {
    return (
      <div className="h-[100dvh] min-h-[100dvh] bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-lg w-full">
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8 shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
                <Shield className="w-8 h-8 text-amber-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Ticket Verification
              </h1>
              <p className="text-slate-400 mb-6">
                No ticket proof data provided. Use a verification link from a
                valid ticket to verify authenticity.
              </p>
              <div className="bg-slate-900/50 rounded-xl p-4 w-full">
                <p className="text-sm text-slate-500 font-mono">
                  Required parameters: id, proof, signer
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] min-h-[100dvh] bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 py-8 overflow-auto">
      <div className="max-w-2xl mx-auto pb-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Devconnect Ticket Verification
          </h1>
          <p className="text-slate-400">
            Cryptographic proof of ticket authenticity
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden shadow-2xl">
          {/* Status Banner */}
          <div
            className={cn(
              'p-6 border-b border-slate-700/50',
              verificationResult?.valid
                ? 'bg-emerald-500/10'
                : verificationResult?.valid === false
                  ? 'bg-red-500/10'
                  : 'bg-slate-700/30'
            )}
          >
            <div className="flex items-center justify-center gap-3">
              {verifying ? (
                <>
                  <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-lg font-medium text-white">
                    Verifying...
                  </span>
                </>
              ) : verificationResult?.valid ? (
                <>
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                  <span className="text-lg font-medium text-emerald-400">
                    Valid Ticket Proof
                  </span>
                </>
              ) : verificationResult?.valid === false ? (
                <>
                  <XCircle className="w-8 h-8 text-red-400" />
                  <span className="text-lg font-medium text-red-400">
                    Invalid Proof
                  </span>
                </>
              ) : (
                <>
                  <Shield className="w-8 h-8 text-purple-400" />
                  <span className="text-lg font-medium text-white">
                    Ready to Verify
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Ticket Info */}
          <div className="p-6 border-b border-slate-700/50 bg-slate-900/30">
            <div className="flex flex-col gap-2">
              {eventName && (
                <p className="text-sm text-purple-400 font-medium uppercase tracking-wide mt-1">
                  {eventName}
                </p>
              )}
              {ticketName && (
                <p className="text-xl font-semibold text-white">{ticketName}</p>
              )}
            </div>
          </div>

          {/* Proof Details */}
          <div className="p-6 space-y-6">
            {/* Ticket Type */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                <Tag className="w-4 h-4" />
                <span>Ticket Type (Verified)</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'flex items-center gap-2 bg-slate-900/50 rounded-lg p-3 flex-1',
                    verificationResult?.valid === true
                      ? 'text-emerald-400'
                      : verificationResult?.valid === false
                        ? 'text-red-400'
                        : 'text-slate-300'
                  )}
                >
                  <TypeIcon className="w-5 h-5" />
                  <span className="font-medium">{typeInfo.label}</span>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                The ticket type is cryptographically bound to the proof and
                cannot be tampered with.
              </p>
            </div>

            {/* Partner */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                <Tag className="w-4 h-4" />
                <span>Partner (Verified)</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'flex items-center gap-2 bg-slate-900/50 rounded-lg p-3 flex-1',
                    verificationResult?.valid === true
                      ? 'text-emerald-400'
                      : verificationResult?.valid === false
                        ? 'text-red-400'
                        : 'text-slate-300'
                  )}
                >
                  <Tag className="w-5 h-5" />
                  <span className="font-medium">{partner}</span>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                The partner namespace is cryptographically bound to the proof
                and cannot be tampered with.
              </p>
            </div>

            {/* Event */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                <Calendar className="w-4 h-4" />
                <span>Event (Verified)</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'flex items-center gap-2 bg-slate-900/50 rounded-lg p-3 flex-1',
                    verificationResult?.valid === true
                      ? 'text-emerald-400'
                      : verificationResult?.valid === false
                        ? 'text-red-400'
                        : 'text-slate-300'
                  )}
                >
                  <Calendar className="w-5 h-5" />
                  <span className="font-medium">{eventName}</span>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                The event name is cryptographically bound to the proof and
                cannot be tampered with.
              </p>
            </div>

            {/* Identifier */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                <Fingerprint className="w-4 h-4" />
                <span>Ticket Identifier (Hash)</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-slate-900/50 rounded-lg p-3 text-sm font-mono text-slate-300 break-all">
                  {identifier}
                </code>
                <button
                  onClick={() => copyToClipboard(identifier, 'identifier')}
                  className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 transition-colors"
                >
                  <Copy
                    className={cn(
                      'w-4 h-4',
                      copied === 'identifier'
                        ? 'text-emerald-400'
                        : 'text-slate-400'
                    )}
                  />
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Unique identifier derived from the ticket. Cannot be reversed to
                reveal the original ticket code.
              </p>
            </div>

            {/* Signature */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                <Key className="w-4 h-4" />
                <span>Cryptographic Signature (Proof)</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-slate-900/50 rounded-lg p-3 text-sm font-mono text-slate-300 break-all">
                  {truncateHash(proof, 20)}
                </code>
                <button
                  onClick={() => copyToClipboard(proof, 'proof')}
                  className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 transition-colors"
                >
                  <Copy
                    className={cn(
                      'w-4 h-4',
                      copied === 'proof' ? 'text-emerald-400' : 'text-slate-400'
                    )}
                  />
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Signature proving this identifier was validated by the
                Devconnect authority.
              </p>
            </div>

            {/* Signer Address */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                <Shield className="w-4 h-4" />
                <span>Authority Signer Address</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-slate-900/50 rounded-lg p-3 text-sm font-mono text-slate-300">
                  {signer}
                </code>
                <a
                  href={`https://basescan.org/address/${signer}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 transition-colors"
                >
                  <ExternalLink className="w-4 h-4 text-slate-400" />
                </a>
              </div>
              <p className="text-xs text-slate-500">
                Official Devconnect signing authority. Verify this matches the
                expected address.
              </p>
            </div>

            {/* Verification Result Details */}
            {verificationResult && (
              <div
                className={cn(
                  'rounded-xl p-4 border',
                  verificationResult.valid
                    ? 'bg-emerald-500/5 border-emerald-500/20'
                    : 'bg-red-500/5 border-red-500/20'
                )}
              >
                <h3
                  className={cn(
                    'font-medium mb-2',
                    verificationResult.valid
                      ? 'text-emerald-400'
                      : 'text-red-400'
                  )}
                >
                  Verification Details
                </h3>
                {verificationResult.recoveredAddress && (
                  <p className="text-sm text-slate-400">
                    <span className="text-slate-500">Recovered signer:</span>{' '}
                    <code className="text-slate-300">
                      {truncateHash(verificationResult.recoveredAddress, 10)}
                    </code>
                  </p>
                )}
                {verificationResult.error && (
                  <p className="text-sm text-red-400">
                    Error: {verificationResult.error}
                  </p>
                )}
                {verificationResult.valid && (
                  <p className="text-sm text-emerald-400 mt-2">
                    ✓ The signature was created by the expected authority,
                    confirming this{' '}
                    <strong>{typeInfo.label.toLowerCase()}</strong> is
                    authentic.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-700/50 bg-slate-900/30">
            <div className="text-center text-sm text-slate-500">
              <p>
                This verification proves the ticket exists and was validated by
                Devconnect, without revealing the actual ticket code.
              </p>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-8 bg-slate-800/30 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            How Verification Works
          </h2>
          <div className="space-y-4 text-sm text-slate-400">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0 text-purple-400 text-xs font-bold">
                1
              </div>
              <p>
                The ticket holder&apos;s original ticket code is hashed to
                create a unique{' '}
                <strong className="text-slate-300">identifier</strong>. This
                cannot be reversed.
              </p>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0 text-purple-400 text-xs font-bold">
                2
              </div>
              <p>
                The identifier is combined with the{' '}
                <strong className="text-slate-300">ticket type</strong> and a{' '}
                <strong className="text-slate-300">partner</strong> namespace
                (defaults to{' '}
                <strong className="text-slate-300">devconnect</strong>) to
                create a composite message.
              </p>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0 text-purple-400 text-xs font-bold">
                3
              </div>
              <p>
                Devconnect signs this combined message with a private key,
                creating a cryptographic{' '}
                <strong className="text-slate-300">proof</strong> that binds the
                identifier, type, and partner together.
              </p>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0 text-purple-400 text-xs font-bold">
                4
              </div>
              <p>
                Anyone can verify the proof using the public{' '}
                <strong className="text-slate-300">signer address</strong>,
                confirming the ticket&apos;s authenticity for that specific type
                and partner without seeing the original code.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="h-[100dvh] min-h-[100dvh] bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}

