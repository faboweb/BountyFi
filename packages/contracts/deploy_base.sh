#!/bin/bash
set -e

# Load environment variables
if [ -f "../../.env" ]; then
  set -a
  source ../../.env
  set +a
fi

RPC_URL="https://sepolia.base.org"

echo "🚀 Deploying fresh set of contracts to Base Sepolia..."

# Function to extract address from forge create output
extract_address() {
    echo "$1" | grep "Deployed to:" | awk '{print $3}'
}

# 1. BountyToken
echo "Deploying BountyToken..."
TOKEN_OUT=$(forge create --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast src/BountyToken.sol:BountyToken)
TOKEN_ADDR=$(extract_address "$TOKEN_OUT")
echo "BountyToken: $TOKEN_ADDR"

# 2. Tickets
echo "Deploying Tickets..."
TICKETS_OUT=$(forge create --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast src/Tickets.sol:Tickets)
TICKETS_ADDR=$(extract_address "$TICKETS_OUT")
echo "Tickets: $TICKETS_ADDR"

# 3. TrustNetwork
echo "Deploying TrustNetwork..."
TRUST_OUT=$(forge create --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast src/TrustNetwork.sol:TrustNetwork --constructor-args $TICKETS_ADDR)
TRUST_ADDR=$(extract_address "$TRUST_OUT")
echo "TrustNetwork: $TRUST_ADDR"

# 4. BountyFi
echo "Deploying BountyFi..."
BOUNTYFI_OUT=$(forge create --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast src/BountyFi.sol:BountyFi --constructor-args $TOKEN_ADDR $TRUST_ADDR $TICKETS_ADDR)
BOUNTYFI_ADDR=$(extract_address "$BOUNTYFI_OUT")
echo "BountyFi: $BOUNTYFI_ADDR"

# 5. Roles Setup
echo "Setting up roles..."
cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY $TOKEN_ADDR "grantRole(bytes32,address)" $(cast keccak "MINTER_ROLE") $BOUNTYFI_ADDR
cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY $TICKETS_ADDR "grantRole(bytes32,address)" $(cast keccak "MINTER_ROLE") $BOUNTYFI_ADDR
cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY $TICKETS_ADDR "grantRole(bytes32,address)" $(cast keccak "MINTER_ROLE") $TRUST_ADDR
cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY $TRUST_ADDR "grantRole(bytes32,address)" $(cast keccak "RESOLVER_ROLE") $BOUNTYFI_ADDR

# Grant ORACLE_ROLE to oracle (ORACLE_PRIVATE_KEY or PRIVATE_KEY if same)
if [ -n "$ORACLE_PRIVATE_KEY" ]; then
    ORACLE_ADDR=$(cast wallet address --private-key $ORACLE_PRIVATE_KEY 2>/dev/null || true)
    [ -n "$ORACLE_ADDR" ] && cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY $BOUNTYFI_ADDR "grantRole(bytes32,address)" $(cast keccak "ORACLE_ROLE") $ORACLE_ADDR && echo "ORACLE_ROLE granted to $ORACLE_ADDR"
else
    cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY $BOUNTYFI_ADDR "grantRole(bytes32,address)" $(cast keccak "ORACLE_ROLE") $(cast wallet address --private-key $PRIVATE_KEY) && echo "ORACLE_ROLE granted to deployer"
fi

echo "✅ Fresh Deployment Complete!"
echo "BOUNTYFI_ADDRESS=$BOUNTYFI_ADDR"
echo "BOUNTY_TOKEN_ADDRESS=$TOKEN_ADDR"
echo "TICKETS_ADDRESS=$TICKETS_ADDR"
echo "TRUST_NETWORK_ADDRESS=$TRUST_ADDR"
