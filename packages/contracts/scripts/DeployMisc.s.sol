// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/SubmissionAnchor.sol";
import "../src/Lottery.sol";

contract DeployMisc is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address bountyToken = vm.envAddress("BOUNTY_TOKEN_ADDRESS");
        uint256 subId = vm.envUint("CHAINLINK_VRF_SUBSCRIPTION_ID");
        address vrfCoordinator = 0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE;
        bytes32 keyHash = 0x9e1344a1247c8a1785d0a4681a27152bffdb43666ae5bf7d14d24a5efd44bf71;

        vm.startBroadcast(deployerPrivateKey);
        
        SubmissionAnchor anchor = new SubmissionAnchor();
        console.log("SubmissionAnchor deployed at:", address(anchor));

        Lottery lottery = new Lottery(subId, vrfCoordinator, keyHash);
        console.log("Lottery deployed at:", address(lottery));

        vm.stopBroadcast();
    }
}
