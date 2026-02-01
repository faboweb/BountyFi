
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function triggerIndexer() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const campaignId = process.argv[2] || "0";

    console.log(`Triggering indexer for campaignId: ${campaignId}...`);

    const response = await supabase.functions.invoke('indexer', {
        body: { event: 'sync_campaign', campaignId }
    });

    if (response.error) {
        console.error('Invoke Error:', response.error);
        if (response.data) console.error('Error Data:', response.data);
    } else {
        console.log('Success:', response.data);
    }
}

triggerIndexer();
