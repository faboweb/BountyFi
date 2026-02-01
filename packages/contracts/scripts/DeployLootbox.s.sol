// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/Lootbox.sol";
import "../src/Tickets.sol";
import "../src/TrustNetwork.sol";

contract DeployLootbox is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address ticketsAddr = vm.envAddress("TICKETS_ADDRESS");
        address trustNetworkAddr = vm.envAddress("TRUST_NETWORK_ADDRESS");
        address bountyFi = vm.envAddress("BOUNTYFI_ADDRESS");
        uint256 subId = vm.envUint("CHAINLINK_VRF_SUBSCRIPTION_ID");

        // Base Sepolia VRF V2.5
        address vrfCoordinator = 0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE;
        bytes32 keyHash = 0x9e1344a1247c8a1785d0a4681a27152bffdb43666ae5bf7d14d24a5efd44bf71;

        vm.startBroadcast(deployerPrivateKey);
        Lootbox lootbox = new Lootbox(ticketsAddr, trustNetworkAddr, bountyFi, subId, vrfCoordinator, keyHash);
        TrustNetwork(trustNetworkAddr).setLootbox(address(lootbox));
        Tickets(ticketsAddr).grantRole(Tickets(ticketsAddr).BURNER_ROLE(), address(lootbox));
        vm.stopBroadcast();
    }
}
