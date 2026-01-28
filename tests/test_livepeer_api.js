require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function testLivepeer() {
  const apiKey = process.env.LIVEPEER_API_KEY;
  
  console.log(`API Key present: ${apiKey ? 'Yes' : 'No'}`);
  console.log(`API Key length: ${apiKey?.length || 0}\n`);
  
  if (!apiKey) {
    console.error('❌ LIVEPEER_API_KEY not found in .env');
    return;
  }
  
  // Read the test image
  const imagePath = path.join(__dirname, 'test_photos/before_small.jpg');
  const imageBuffer = fs.readFileSync(imagePath);
  const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
  
  console.log('🚀 Testing Livepeer AI Gateway...\n');
  console.log(`📸 Image: ${imagePath}`);
  console.log(`📏 Image size: ${imageBuffer.length} bytes\n`);
  
  // Prepare FormData
  const FormData = require('form-data');
  const formData = new FormData();
  // Ensure we pass the buffer directly and let form-data handle the rest
  formData.append('image', imageBuffer, { 
    filename: 'test.jpg', 
    contentType: 'image/jpeg',
    knownLength: imageBuffer.length 
  });
  formData.append('model_id', 'Salesforce/blip-image-captioning-large');
  formData.append('prompt', 'Describe this image in detail. What objects do you see?');
  
  console.log('📤 Sending request to Livepeer...\n');
  
  try {
    const response = await fetch('https://dream-gateway.livepeer.cloud/image-to-text', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        ...formData.getHeaders()
      },
      body: formData.getBuffer() // Use getBuffer() for form-data package in Node
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    const responseText = await response.text();
    console.log(`\nRaw Response:\n${responseText}\n`);
    
    if (response.ok) {
      try {
        const data = JSON.parse(responseText);
        console.log('✅ Parsed JSON:');
        console.log(JSON.stringify(data, null, 2));
      } catch (e) {
        console.log('⚠️  Response is not JSON');
      }
    } else {
      console.error('❌ Request failed');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testLivepeer();
