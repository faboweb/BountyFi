#!/bin/bash

# Load environment variables
# Load environment variables
if [ -f ../../.env ]; then
  set -a
  source ../../.env
  set +a
fi

echo "VRF Subscription ID: $CHAINLINK_VRF_SUBSCRIPTION_ID"
if [ -z "$CHAINLINK_VRF_SUBSCRIPTION_ID" ]; then
    echo "❌ Error: CHAINLINK_VRF_SUBSCRIPTION_ID is not set."
    exit 1
fi

# Ensure PRIVATE_KEY is set
if [ -z "$PRIVATE_KEY" ]; then
  echo "❌ Error: PRIVATE_KEY not found in .env"
  exit 1
fi

RPC_URL="https://sepolia.base.org"

echo "🚀 Deploying to Base Sepolia..."

# Deploy Tickets.sol
echo "Minting Tickets contract..."
/Users/fabo/.foundry/bin/forge create --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  src/Tickets.sol:Tickets \
  --broadcast

# Deploy SubmissionAnchor.sol
echo "Minting SubmissionAnchor contract..."
/Users/fabo/.foundry/bin/forge create --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  src/SubmissionAnchor.sol:SubmissionAnchor \
  --broadcast

# Deploy Lottery.sol
# Base Sepolia VRF Coordinator: 0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE
# Key Hash: 0x9e1344a1247c8a1785d0a4681a27152bffdb43666ae5bf7d14d24a5efd44bf71
echo "Minting Lottery contract..."
/Users/fabo/.foundry/bin/forge create --rpc-url $RPC_URL --private-key $PRIVATE_KEY src/Lottery.sol:Lottery --broadcast --constructor-args $CHAINLINK_VRF_SUBSCRIPTION_ID 0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE 0x9e1344a1247c8a1785d0a4681a27152bffdb43666ae5bf7d14d24a5efd44bf71

echo "✅ Deployment Complete!"
