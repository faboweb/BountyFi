#!/bin/bash
set -e

# Load environment variables
if [ -f "../../.env" ]; then
  set -a
  source ../../.env
  set +a
fi

RPC_URL="http://127.0.0.1:8545"
PRIVATE_KEY=${PRIVATE_KEY:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80} # Default Anvil PK

echo "🚀 Deploying to Anvil at $RPC_URL..."

# 1. BountyToken
echo "Deploying BountyToken..."
TOKEN_ADDR=$(forge create --rpc-url $RPC_URL --private-key $PRIVATE_KEY src/BountyToken.sol:BountyToken --json | jq -r '.deployedTo')
echo "BountyToken: $TOKEN_ADDR"

# 2. Tickets
echo "Deploying Tickets..."
TICKETS_ADDR=$(forge create --rpc-url $RPC_URL --private-key $PRIVATE_KEY src/Tickets.sol:Tickets --json | jq -r '.deployedTo')
echo "Tickets: $TICKETS_ADDR"

# 3. TrustNetwork
echo "Deploying TrustNetwork..."
TRUST_ADDR=$(forge create --rpc-url $RPC_URL --private-key $PRIVATE_KEY src/TrustNetwork.sol:TrustNetwork --constructor-args $TICKETS_ADDR --json | jq -r '.deployedTo')
echo "TrustNetwork: $TRUST_ADDR"

# 4. BountyFi
echo "Deploying BountyFi..."
BOUNTYFI_ADDR=$(forge create --rpc-url $RPC_URL --private-key $PRIVATE_KEY src/BountyFi.sol:BountyFi --constructor-args $TOKEN_ADDR $TRUST_ADDR $TICKETS_ADDR --json | jq -r '.deployedTo')
echo "BountyFi: $BOUNTYFI_ADDR"

# 5. Setup Roles (Crucial for the architecture)
echo "Setting up roles..."
cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY $TOKEN_ADDR "grantRole(bytes32,address)" $(cast keccak "MINTER_ROLE") $BOUNTYFI_ADDR
cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY $TICKETS_ADDR "grantRole(bytes32,address)" $(cast keccak "MINTER_ROLE") $BOUNTYFI_ADDR
cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY $TICKETS_ADDR "grantRole(bytes32,address)" $(cast keccak "MINTER_ROLE") $TRUST_ADDR
cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY $TRUST_ADDR "grantRole(bytes32,address)" $(cast keccak "RESOLVER_ROLE") $BOUNTYFI_ADDR

echo "✅ All contracts deployed and roles configured!"
echo ""
echo "BOUNTYFI_ADDRESS=$BOUNTYFI_ADDR"
echo "BOUNTY_TOKEN_ADDRESS=$TOKEN_ADDR"
echo "TICKETS_ADDRESS=$TICKETS_ADDR"
echo "TRUST_NETWORK_ADDRESS=$TRUST_ADDR"
