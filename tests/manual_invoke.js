const { createClient } = require('@supabase/supabase-js');

const URL = 'http://127.0.0.1:54321';
// Correct key from status output
const KEY = 'eyJhbGciOiJFUzI1NiIsImtpZCI6ImI4MTI2OWYxLTIxZDgtNGYyZS1iNzE5LWMyMjQwYTg0MGQ5MCIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MjA4NDk1MDk4Nn0.uegu1QXkhG_V-rXpkkDAhXBnxRRsD4agRF0_e_igPVAY_K3hPwo-n8jM_6mzhmT6d7CjXqZQDbUjUG8u7yV-Ww';

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
