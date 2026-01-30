import { ethers } from 'ethers';
import { CHAIN_CONFIG } from '../config/chain';
import { authStorage } from '../auth/storage';

// Minimal ABIs
export const BOUNTYFI_ABI = [
    "function submit(uint256 _campaignId, string _photoUrl, bytes32 _photoHash, int256 _lat, int256 _lng) external",
    "function vote(uint256 _submissionId, bool _approve) external",
    "function submissions(uint256) view returns (uint256 campaignId, address submitter, string photoUrl, bytes32 photoHash, int256 lat, int256 lng, uint8 status, uint256 aiConfidence, uint256 approveVotes, uint256 rejectVotes, uint256 createdAt)",
    "event SubmissionCreated(uint256 indexed submissionId, uint256 indexed campaignId, address indexed submitter)"
];

export const BOUNTYTOKEN_ABI = [
    "function balanceOf(address account) view returns (uint256)",
    "function decimals() view returns (uint8)"
];

export const LOOTBOX_ABI = [
    "function openLootbox() external returns (uint256 requestId)",
    "event LootboxRequested(uint256 indexed requestId, address indexed user)"
];

export async function getProvider() {
    return new ethers.JsonRpcProvider(CHAIN_CONFIG.RPC_URL);
}

export async function getWallet() {
    const privateKey = await authStorage.getPrivateKey();
    if (!privateKey) throw new Error('No wallet found. Please log in.');
    const provider = await getProvider();
    return new ethers.Wallet(privateKey, provider);
}

export async function getBountyFiContract() {
    const wallet = await getWallet();
    return new ethers.Contract(CHAIN_CONFIG.BOUNTYFI_ADDRESS, BOUNTYFI_ABI, wallet);
}

export async function getBountyTokenContract() {
    const wallet = await getWallet();
    return new ethers.Contract(CHAIN_CONFIG.BOUNTYTOKEN_ADDRESS, BOUNTYTOKEN_ABI, wallet);
}

export async function getLootboxContract() {
    const wallet = await getWallet();
    return new ethers.Contract(CHAIN_CONFIG.LOOTBOX_ADDRESS, LOOTBOX_ABI, wallet);
}
