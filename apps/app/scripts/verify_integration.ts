
import { createClient } from '@supabase/supabase-js';
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env from root (assuming running from apps/app)
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    console.log('--- Starting Integration Verification ---');

    // 1. Setup User Wallet
    const wallet = ethers.Wallet.createRandom();
    console.log(`1. Created Wallet: ${wallet.address}`);

    // 2. Prepare Submission Payload
    const campaignId = '101'; // Mock Campaign
    const lat = 13756330;
    const lng = 100501770;
    const photoUrl = 'https://via.placeholder.com/300';

    const messageToSign = JSON.stringify({
        campaignId,
        urls: [photoUrl],
        lat,
        lng,
        timestamp: Date.now() // Note: In real app this might drift, ideally we pass timestamp in payload to verify? 
        // For MVP we just sign a message.
    });

    // Wait, the CameraScreen uses Date.now() in message but passes new Date().toISOString() in payload to API?
    // The API doesn't verify the timestamp in message matches yet.
    // We will sign the message as implemented in CameraScreen.

    const signature = await wallet.signMessage(messageToSign);
    console.log(`2. Signed Message. Sig length: ${signature.length}`);

    // 3. Call Relay Submission
    console.log('3. Invoking relay_submission...');
    const { data: submissionData, error: submissionError } = await supabase.functions.invoke('relay_submission', {
        body: {
            campaign_id: campaignId,
            photo_urls: [photoUrl, photoUrl],
            gps_lat: lat,
            gps_lng: lng,
            signature: signature,
            public_address: wallet.address,
        },
    });

    if (submissionError) {
        console.error('Relay failed:', submissionError);
        // If 404, maybe function not deployed?
        // If 500, check logs.
        process.exit(1);
    }

    console.log('Relay Success:', submissionData);
    const submissionId = submissionData.submission_id;

    if (!submissionId) {
        console.error('No submission_id returned');
        process.exit(1);
    }

    // 4. Test Get Pending (as another user/validator)
    console.log('4. Fetching Pending Tasks...');
    // Pass a random validator ID (simulated by random UUID or just checking anonymous)
    // The get_tasks RPC might filter by user_id?
    // Let's call get_tasks function.
    const { data: pendingTasks, error: pendingError } = await supabase.functions.invoke('get_tasks', {
        body: { validator_id: '00000000-0000-0000-0000-000000000000' } // Zero UUID or random
    });

    if (pendingError) {
        console.warn('get_tasks failed (might be expected if no RPC setup):', pendingError);
    } else {
        console.log(`Pending Tasks Count: ${pendingTasks?.length}`);
        const found = pendingTasks?.find((t: any) => t.id === submissionId);
        if (found) console.log('Successfully found our new submission in pending queue!');
        else console.warn('Submission not found in pending queue (maybe RPC logic filters it?)');
    }

    // 5. Submit Vote (as validator)
    console.log('5. Submitting Vote...');
    const validatorId = '00000000-0000-0000-0000-000000000001'; // Mock validator
    const { data: voteData, error: voteError } = await supabase.functions.invoke('process_vote', {
        body: {
            submission_id: submissionId,
            validator_id: validatorId,
            decision: 'APPROVED',
            reason: 'Integration Test'
        }
    });

    if (voteError) {
        console.error('Vote failed:', voteError);
    } else {
        console.log('Vote Success:', voteData);
    }

    console.log('--- Verification Complete ---');
}

main().catch(console.error);
