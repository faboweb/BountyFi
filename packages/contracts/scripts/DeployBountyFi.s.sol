// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/BountyFi.sol";

contract DeployBountyFi is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address bountyToken = vm.envAddress("BOUNTY_TOKEN_ADDRESS");
        address trustNetwork = vm.envAddress("TRUST_NETWORK_ADDRESS");
        address tickets = vm.envAddress("TICKETS_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);
        
        BountyFi bountyFi = new BountyFi(bountyToken, trustNetwork, tickets);
        console.log("BountyFi deployed at:", address(bountyFi));

        vm.stopBroadcast();
    }
}