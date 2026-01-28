const hre = require("hardhat");

async main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // 1. Deploy Tickets
  const Tickets = await hre.ethers.getContractFactory("Tickets");
  const tickets = await Tickets.deploy();
  await tickets.waitForDeployment();
  console.log("Tickets deployed to:", await tickets.getAddress());

  // 2. Deploy SubmissionAnchor
  const SubmissionAnchor = await hre.ethers.getContractFactory("SubmissionAnchor");
  const anchor = await SubmissionAnchor.deploy();
  await anchor.waitForDeployment();
  console.log("SubmissionAnchor deployed to:", await anchor.getAddress());

  // 3. Deploy Lottery (Base Sepolia VRF config Example)
  // VRF Coordinator: 0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625 (Sepolia)
  // Key Hash: 0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c
  // Subscription ID: [User needs to provide]
  
  /*
  const subscriptionId = "YOUR_SUBSCRIPTION_ID";
  const vrfCoordinator = "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625";
  const keyHash = "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c";

  const Lottery = await hre.ethers.getContractFactory("Lottery");
  const lottery = await Lottery.deploy(subscriptionId, vrfCoordinator, keyHash);
  await lottery.waitForDeployment();
  console.log("Lottery deployed to:", await lottery.getAddress());
  */
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
