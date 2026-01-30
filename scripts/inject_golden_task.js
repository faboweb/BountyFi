require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { ethers } = require('ethers');

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const privateKey = process.env.PRIVATE_KEY; // Relayer/Admin Key
  const rpcUrl = process.env.RPC_URL;
  const contractAddress = process.env.BOUNTYFI_ADDRESS;

  if (!supabaseUrl || !supabaseKey || !privateKey || !rpcUrl || !contractAddress) {
    console.error("Missing ENV variables");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(contractAddress, ["function submit(uint256, bytes32) external"], wallet);

  // 1. Define Golden Task Data
  const campaignId = 1; // Default or Arg
  const isGolden = true;
  const expectedOutcome = process.argv[2] || 'APPROVE'; // 'APPROVE' or 'REJECT'
  
  // Fake Data
  // If REJECT, use a wrong photo or location.
  // If APPROVE, use a valid one (but maybe from a "Golden Set").
  const photoUrls = ["https://example.com/golden-cat.jpg"];
  const lat = 40.7128;
  const lng = -74.0060;
  
  console.log(`Injecting Golden Task (${expectedOutcome})...`);

  // 2. Hash
  const abiCoder = new ethers.AbiCoder();
  const submissionHash = ethers.keccak256(abiCoder.encode(
       ["uint256", "string[]", "int256", "int256"], 
       [campaignId, photoUrls, lat, lng]
  ));

  // 3. Submit to Chain
  console.log("Submitting to Chain...");
  const tx = await contract.submit(campaignId, submissionHash);
  console.log("Tx Sent:", tx.hash);
  const receipt = await tx.wait();
  
  // Get ID
  const subLog = receipt.logs.find((l) => l.topics[0] === ethers.id("SubmissionCreated(uint256,uint256,address,bytes32)"));
  const parsedLog = contract.interface.parseLog(subLog);
  const onchainId = parsedLog.args[0].toString();
  console.log("On-Chain ID:", onchainId);

  // 4. Insert to DB
  console.log("Inserting into DB...");
  const { data, error } = await supabase
    .from('submissions')
    .insert({
        campaign_id: campaignId,
        photo_urls: photoUrls,
        gps_lat: lat,
        gps_lng: lng,
        submission_hash: submissionHash,
        status: 'PENDING', // Will come up in queue
        is_golden: true,
        expected_outcome: expectedOutcome,
        onchain_id: onchainId,
        signature: 'GOLDEN_TASK_NO_SIG' // Or sign with admin key if needed
    })
    .select()
    .single();

  if (error) {
    console.error("DB Error:", error);
  } else {
    console.log("Injected Golden Task:", data.id);
  }
}

main();
