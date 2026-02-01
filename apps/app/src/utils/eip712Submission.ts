/**
 * EIP-712 typed data for BountyFi submissions.
 * User signs submissionHash + recipient to bind the submission and prevent reward theft.
 * Relay verifies signature and submits opaque hash on-chain.
 */
import { ethers } from 'ethers';

/** Base Sepolia chainId - must match deployment */
export const BOUNTYFI_CHAIN_ID = 84532;

/**
 * Compute submission hash - MUST match relay_submission formula exactly.
 */
export function computeSubmissionHash(
  contractCampaignId: number,
  photoUrls: string[],
  gpsLat: number,
  gpsLng: number
): string {
  const abiCoder = new ethers.AbiCoder();
  return ethers.keccak256(
    abiCoder.encode(
      ['uint256', 'string[]', 'int256', 'int256'],
      [contractCampaignId, photoUrls, gpsLat, gpsLng]
    )
  );
}

export const EIP712_DOMAIN = {
  name: 'BountyFi',
  version: '1',
  chainId: BOUNTYFI_CHAIN_ID,
  verifyingContract: '0x0000000000000000000000000000000000000000' as const,
};

export const EIP712_TYPES = {
  BountyFiSubmission: [
    { name: 'submissionHash', type: 'bytes32' },
    { name: 'recipient', type: 'address' },
    { name: 'nonce', type: 'uint256' },
  ],
};

export type BountyFiSubmissionMessage = {
  submissionHash: string;
  recipient: string;
  nonce: string;
};

/**
 * Build the EIP-712 message for signing.
 * submissionHash must be computed with the same formula as relay.
 */
export function buildSubmissionMessage(
  submissionHash: string,
  recipient: string,
  nonce: bigint | number
): BountyFiSubmissionMessage {
  return {
    submissionHash,
    recipient,
    nonce: nonce.toString(),
  };
}
