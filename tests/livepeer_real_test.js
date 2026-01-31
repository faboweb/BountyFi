const { supabase, SUPABASE_URL: URL } = require('./utils/supabase');
const fs = require('fs');
const path = require('path');

console.log(`Connected to: ${URL}`);

async function runRealTest() {
  console.log("🚀 Testing Livepeer AI with Real Photos (Table Cleanup)...\n");

  // 1. Upload Photos to Supabase Storage
  console.log("📸 Uploading before/after photos to Supabase Storage...");
  
  const beforePath = path.join(__dirname, 'test_photos/before.jpg');
  const afterPath = path.join(__dirname, 'test_photos/after.jpg');
  
  const beforeFile = fs.readFileSync(beforePath);
  const afterFile = fs.readFileSync(afterPath);
  
  const timestamp = Date.now();
  
  const { data: beforeUpload, error: beforeError } = await supabase.storage
    .from('submission-photos')
    .upload(`test/${timestamp}_before.jpg`, beforeFile, {
      contentType: 'image/jpeg',
      upsert: true
    });
    
  if (beforeError) {
    console.error("❌ Before upload failed:", beforeError);
    return;
  }
  
  const { data: afterUpload, error: afterError } = await supabase.storage
    .from('submission-photos')
    .upload(`test/${timestamp}_after.jpg`, afterFile, {
      contentType: 'image/jpeg',
      upsert: true
    });
    
  if (afterError) {
    console.error("❌ After upload failed:", afterError);
    return;
  }
  
  // Get public URLs
  const { data: beforeUrl } = supabase.storage
    .from('submission-photos')
    .getPublicUrl(`test/${timestamp}_before.jpg`);
    
  const { data: afterUrl } = supabase.storage
    .from('submission-photos')
    .getPublicUrl(`test/${timestamp}_after.jpg`);
  
  console.log(`   Before: ${beforeUrl.publicUrl}`);
  console.log(`   After: ${afterUrl.publicUrl}\n`);
  
  // 2. Create Campaign
  console.log("🎯 Creating 'Table Cleanup' campaign...");
  const { data: campaign } = await supabase
    .from('campaigns')
    .insert({
      title: "Clean Up a Table",
      rules: "Remove all items from the table and wipe it clean. Submit before and after photos.",
      checkpoints: JSON.stringify([
        { lat: 40.7968, lng: -73.9580, radius: 10000, name: "Test Location" }
      ])
    })
    .select()
    .single();
  
  console.log(`   Campaign ID: ${campaign.id}\n`);
  
  // 3. Create test user
  const { data: authData } = await supabase.auth.admin.createUser({
    email: `cleanup_test_${timestamp}@example.com`,
    password: 'password123',
    email_confirm: true
  });
  
  // 4. Test Multi-Photo Comparison (Before & After in one submission)
  console.log("🧪 Test: Submitting 'BEFORE' & 'AFTER' photos together...");
  const { data: multiSub } = await supabase
    .from('submissions')
    .insert({
      campaign_id: campaign.id,
      user_id: authData.user.id,
      gps_lat: 40.7968,
      gps_lng: -73.9580,
      photo_urls: [beforeUrl.publicUrl, afterUrl.publicUrl],
      status: 'PENDING'
    })
    .select()
    .single();
  
  console.log(`   Submission ID: ${multiSub.id}`);
  console.log("   Waiting for Hybrid AI (Vision + LLM) to process both images...");
  
  // Poll for result
  let finalResult = null;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const { data: poll } = await supabase
      .from('submissions')
      .select('status, verification_trace')
      .eq('id', multiSub.id)
      .single();
    
    if (poll.status !== 'PENDING') {
      finalResult = poll;
      break;
    }
    process.stdout.write(".");
  }
  
  console.log(`\n\n   Final Status: ${finalResult.status}`);
  console.log("   --- Vision Captions ---");
  finalResult.verification_trace?.ai_vision?.vision_captions?.forEach(c => console.log(`   > ${c}`));
  console.log("\n   --- LLM Reasoning ---");
  console.log(`   ${finalResult.verification_trace?.ai_vision?.llm_reasoning || 'N/A'}`);
  console.log("\n   --- AI Decision ---");
  console.log(`   Decision: ${finalResult.verification_trace?.ai_vision?.decision}`);

}

runRealTest();
