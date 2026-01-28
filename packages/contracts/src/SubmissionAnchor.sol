// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SubmissionAnchor {
    mapping(bytes32 => bool) public anchored;
    address public verifier;

    event Anchored(bytes32 indexed submissionHash, uint256 timestamp);

    constructor() {
        verifier = msg.sender;
    }

    function anchor(bytes32 submissionHash) external {
        require(msg.sender == verifier, "Only verifier can anchor");
        require(!anchored[submissionHash], "Already anchored");
        
        anchored[submissionHash] = true;
        emit Anchored(submissionHash, block.timestamp);
    }
}
