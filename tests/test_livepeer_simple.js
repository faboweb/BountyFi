require('dotenv').config();

async function testLivepeerDirect() {
  const apiKey = process.env.LIVEPEER_API_KEY;
  
  console.log('🧪 Testing Livepeer API with Public URL...\n');
  
  // Use publicimage URL
  const testImageUrl = 'https://cguqjaoeleifeaxktmwv.supabase.co/storage/v1/object/public/submission-photos/test/1769593749949_before.jpg';
  
  console.log(`Image URL: ${testImageUrl}\n`);
  
  // Test using URL instead of file upload
  try {
    const response = await fetch('https://dream-gateway.livepeer.cloud/image-to-text', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model_id: 'Salesforce/blip-image-captioning-large',
        prompt: 'Describe this image in detail'
      })
    });
    
    console.log(`Status: ${response.status}`);
    const text = await response.text();
    console.log(`\nResponse:\n${text}\n`);
    
    if (response.ok) {
      try {
        const data = JSON.parse(text);
        console.log('Parsed:', JSON.stringify(data, null, 2));
      } catch (e) {
        console.log('Not JSON');
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testLivepeerDirect();
