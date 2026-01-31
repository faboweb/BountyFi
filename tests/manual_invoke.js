const { supabase, SUPABASE_URL: URL, SERVICE_KEY: KEY } = require('./utils/supabase');

console.log(`Connected to: ${URL}`);

console.log("Invoking verify_submission manually...");

async function invoke() {
  const payload = {
    record: {
      id: "89184712-573c-40fb-9f43-d90701cac793",
      campaign_id: "8c12b396-546e-4d9f-8ecb-6264c354da91",
      gps_lat: 40.7968, 
      gps_lng: -73.9580,
      photo_urls: ["http://example.com/photo1.jpg"],
      status: "PENDING"
    }
  };

  try {
      const response = await fetch(`${URL}/functions/v1/verify_submission`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${KEY}`
        },
        body: JSON.stringify(payload)
      });
      
      const text = await response.text();
      console.log("Status:", response.status);
      console.log("Response:", text);
  } catch (e) {
      console.error("Error:", e);
  }
}

invoke();
