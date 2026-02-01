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
sleep 5

# 2. Tickets
echo "Deploying Tickets..."
TICKETS_OUT=$(forge create --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast src/Tickets.sol:Tickets)
TICKETS_ADDR=$(extract_address "$TICKETS_OUT")
echo "Tickets: $TICKETS_ADDR"
sleep 5

# 3. TrustNetwork
echo "Deploying TrustNetwork..."
TRUST_OUT=$(forge create --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast src/TrustNetwork.sol:TrustNetwork --constructor-args $TICKETS_ADDR)
TRUST_ADDR=$(extract_address "$TRUST_OUT")
echo "TrustNetwork: $TRUST_ADDR"
sleep 5

# 4. BountyFi
echo "Deploying BountyFi..."
BOUNTYFI_OUT=$(forge create --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast src/BountyFi.sol:BountyFi --constructor-args $TOKEN_ADDR $TRUST_ADDR $TICKETS_ADDR)
BOUNTYFI_ADDR=$(extract_address "$BOUNTYFI_OUT")
echo "BountyFi: $BOUNTYFI_ADDR"
sleep 5

# 5. SubmissionAnchor
echo "Deploying SubmissionAnchor..."
ANCHOR_OUT=$(forge create --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast src/SubmissionAnchor.sol:SubmissionAnchor)
ANCHOR_ADDR=$(extract_address "$ANCHOR_OUT")
echo "SubmissionAnchor: $ANCHOR_ADDR"
sleep 5

# 6. Lottery
echo "Deploying Lottery..."
VRF_COORD="0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE"
KEY_HASH="0x9e1344a1247c8a1785d0a4681a27152bffdb43666ae5bf7d14d24a5efd44bf71"
LOTTERY_OUT=$(forge create --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast src/Lottery.sol:Lottery --constructor-args $CHAINLINK_VRF_SUBSCRIPTION_ID $VRF_COORD $KEY_HASH)
LOTTERY_ADDR=$(extract_address "$LOTTERY_OUT")
echo "Lottery: $LOTTERY_ADDR"
sleep 5

# 7. Lootbox
echo "Deploying Lootbox..."
LOOTBOX_OUT=$(forge create --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast src/Lootbox.sol:Lootbox --constructor-args $TICKETS_ADDR $TRUST_ADDR $BOUNTYFI_ADDR $CHAINLINK_VRF_SUBSCRIPTION_ID $VRF_COORD $KEY_HASH)
LOOTBOX_ADDR=$(extract_address "$LOOTBOX_OUT")
echo "Lootbox: $LOOTBOX_ADDR"
sleep 5

# 8. Roles & Wiring
echo "Setting up roles and wiring..."
cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY $TOKEN_ADDR "grantRole(bytes32,address)" $(cast keccak "MINTER_ROLE") $BOUNTYFI_ADDR
sleep 2
cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY $TICKETS_ADDR "grantRole(bytes32,address)" $(cast keccak "MINTER_ROLE") $BOUNTYFI_ADDR
sleep 2
cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY $TICKETS_ADDR "grantRole(bytes32,address)" $(cast keccak "MINTER_ROLE") $TRUST_ADDR
sleep 2
cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY $TICKETS_ADDR "grantRole(bytes32,address)" $(cast keccak "BURNER_ROLE") $LOOTBOX_ADDR
sleep 2
cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY $TRUST_ADDR "grantRole(bytes32,address)" $(cast keccak "RESOLVER_ROLE") $BOUNTYFI_ADDR
sleep 2
cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY $TRUST_ADDR "setLootbox(address)" $LOOTBOX_ADDR
sleep 2

# Grant ORACLE_ROLE to oracle
ORACLE_ADDR=$(cast wallet address --private-key $PRIVATE_KEY)
cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY $BOUNTYFI_ADDR "grantRole(bytes32,address)" $(cast keccak "ORACLE_ROLE") $ORACLE_ADDR
echo "ORACLE_ROLE granted to $ORACLE_ADDR"

echo "✅ Fresh Deployment Complete!"
echo "-----------------------------------"
echo "BOUNTYFI_ADDRESS=$BOUNTYFI_ADDR"
echo "BOUNTY_TOKEN_ADDRESS=$TOKEN_ADDR"
echo "TICKETS_ADDRESS=$TICKETS_ADDR"
echo "TRUST_NETWORK_ADDRESS=$TRUST_ADDR"
echo "LOOTBOX_ADDRESS=$LOOTBOX_ADDR"
echo "SUBMISSION_ANCHOR_ADDRESS=$ANCHOR_ADDR"
echo "LOTTERY_ADDRESS=$LOTTERY_ADDR"

# Update root .env
echo "Updating root .env..."
sed -i '' "s/BOUNTYFI_ADDRESS=.*/BOUNTYFI_ADDRESS=$BOUNTYFI_ADDR/" ../../.env
sed -i '' "s/BOUNTY_TOKEN_ADDRESS=.*/BOUNTY_TOKEN_ADDRESS=$TOKEN_ADDR/" ../../.env
sed -i '' "s/TICKETS_ADDRESS=.*/TICKETS_ADDRESS=$TICKETS_ADDR/" ../../.env
sed -i '' "s/TRUST_NETWORK_ADDRESS=.*/TRUST_NETWORK_ADDRESS=$TRUST_ADDR/" ../../.env
sed -i '' "s/LOOTBOX_ADDRESS=.*/LOOTBOX_ADDRESS=$LOOTBOX_ADDR/" ../../.env
sed -i '' "s/SUBMISSION_ANCHOR_ADDRESS=.*/SUBMISSION_ANCHOR_ADDRESS=$ANCHOR_ADDR/" ../../.env
sed -i '' "s/LOTTERY_ADDRESS=.*/LOTTERY_ADDRESS=$LOTTERY_ADDR/" ../../.env
