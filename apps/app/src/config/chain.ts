// Chain Configuration - reads from environment variables
export const CHAIN_CONFIG = {
    RPC_URL: 'https://sepolia.base.org', // Default to Base Sepolia
    BOUNTYFI_ADDRESS: process.env.EXPO_PUBLIC_BOUNTYFI_ADDRESS || '0xD8204FED124c34e259F61677e86802267D86f19F',
    BOUNTYTOKEN_ADDRESS: process.env.EXPO_PUBLIC_BOUNTY_TOKEN_ADDRESS || '0x597271e2e00250B2417319c134A34a9d2D855FBb',
    LOOTBOX_ADDRESS: process.env.EXPO_PUBLIC_LOOTBOX_ADDRESS || '0x2Fdbb5bd8E9E81ea6658401766420DF744A75DA6',
    EXPLORER_URL: 'https://sepolia.basescan.org',
};
