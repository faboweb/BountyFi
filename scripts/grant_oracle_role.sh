#!/bin/bash
# Grant ORACLE_ROLE to the oracle address. Run after deploy if oracle_ai submitAIScore reverts.
# Requires: .env with PRIVATE_KEY (admin), ORACLE_PRIVATE_KEY (or PRIVATE_KEY), BOUNTYFI_ADDRESS, RPC_URL
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
if [ -f "$ROOT_DIR/.env" ]; then
  set -a
  source "$ROOT_DIR/.env"
  set +a
fi
RPC_URL="${RPC_URL:-https://sepolia.base.org}"
ADMIN_KEY="${PRIVATE_KEY:?PRIVATE_KEY required in .env}"
ORACLE_KEY="${ORACLE_PRIVATE_KEY:-$PRIVATE_KEY}"
BOUNTYFI_ADDRESS="${BOUNTYFI_ADDRESS:?BOUNTYFI_ADDRESS required in .env}"

ORACLE_ADDR=$(cast wallet address --private-key "$ORACLE_KEY" 2>/dev/null) || ORACLE_ADDR=$(cd "$ROOT_DIR" && node -e "
  require('dotenv').config({ path: '.env' });
  const key = (process.env.ORACLE_PRIVATE_KEY || process.env.PRIVATE_KEY || '').trim().replace(/[\r\n]/g, '');
  const hex = key.replace(/^0x/, '');
  if (!hex || hex.length !== 64 || !/^[0-9a-fA-F]+$/.test(hex)) {
    console.error('Error: ORACLE_PRIVATE_KEY or PRIVATE_KEY must be 64-char hex in .env');
    process.exit(1);
  }
  console.log(new (require('ethers').Wallet)('0x' + hex).address);
")

echo "Granting ORACLE_ROLE to $ORACLE_ADDR on $BOUNTYFI_ADDRESS"
cast send --rpc-url "$RPC_URL" --private-key "$ADMIN_KEY" "$BOUNTYFI_ADDRESS" \
  "grantRole(bytes32,address)" $(cast keccak "ORACLE_ROLE") "$ORACLE_ADDR"
echo "✅ ORACLE_ROLE granted"
