// Chain Configuration - reads from environment variables
export const CHAIN_CONFIG = {
    RPC_URL: 'https://sepolia.base.org', // Default to Base Sepolia
    BOUNTYFI_ADDRESS: process.env.EXPO_PUBLIC_BOUNTYFI_ADDRESS || '0x29f866CDcB419DFE423eEbE74Dae83fc5CcD818f',
    BOUNTYTOKEN_ADDRESS: process.env.EXPO_PUBLIC_BOUNTY_TOKEN_ADDRESS || '0x3205E5eC7Ed927108999992521ddea312f34d460',
    LOOTBOX_ADDRESS: process.env.EXPO_PUBLIC_LOOTBOX_ADDRESS || '0x400de212c0647c26cf84a60ca360d2e93eeef49e',
};
