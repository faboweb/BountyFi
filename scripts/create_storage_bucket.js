require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://cguqjaoeleifeaxktmwv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY.trim()
);

async function createBucket() {
  console.log('Creating submission-photos bucket...');
  
  const { data, error } = await supabase.storage.createBucket('submission-photos', {
    public: true,
    fileSizeLimit: 10485760 // 10MB
  });
  
  if (error) {
    if (error.message.includes('already exists')) {
      console.log('✅ Bucket already exists');
    } else {
      console.error('❌ Error:', error);
    }
  } else {
    console.log('✅ Bucket created successfully');
  }
}

createBucket();
