const { supabase, SUPABASE_URL } = require('./utils/supabase');
const { ethers } = require('ethers');

console.log(`Connected to: ${SUPABASE_URL}`);

async function runTests() {
    console.log('--- 🚀 Starting Relayer Integration Tests ---');

    // 1. Setup Mock User
    const wallet = ethers.Wallet.createRandom();
    console.log(`👤 Test Wallet: ${wallet.address}`);

    // Create a Supabase user for this wallet
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: `tester_${Date.now()}@bountyfi.test`,
        password: 'password123',
        email_confirm: true,
        user_metadata: { wallet_address: wallet.address.toLowerCase() }
    });

    if (authError) {
        console.error('❌ Failed to create test user:', authError.message);
        process.exit(1);
    }
    const userId = authData.user.id;
    console.log(`✅ Created Supabase User: ${userId}`);

    // Manually ensure the user exists in public.users table (if not handled by trigger)
    await supabase.from('users').upsert({
        id: userId,
        wallet_address: wallet.address.toLowerCase(),
        tickets: 0,
        diamonds: 0
    });

    // --- TEST 1: Realtime Subscription ---
    console.log('\n📡 Testing Realtime Updates...');
    let realtimeReceived = false;
    const channel = supabase
        .channel('public:users')
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${userId}` },
            (payload) => {
                console.log('✨ [Realtime] Received user update:', payload.new);
                realtimeReceived = true;
            }
        )
        .subscribe();

    // Fetch valid campaign UUID
    console.log('\n🔍 Fetching valid campaign...');
    const { data: campData, error: campError } = await supabase
        .from('campaigns')
        .select('id')
        .limit(1)
        .single();
    
    if (campError || !campData) {
        console.error('❌ Failed to fetch campaign for test:', campError?.message);
        process.exit(1);
    }
    const campaignId = campData.id;
    console.log(`✅ Using Campaign: ${campaignId}`);

    // --- TEST 2: Relay Submission (EIP-712) ---
    console.log('\n📝 Testing relay_submission (EIP-712)...');
    const { data: campWithOnchain } = await supabase
        .from('campaigns')
        .select('id, onchain_id')
        .eq('id', campaignId)
        .single();

    if (!campWithOnchain?.onchain_id) {
        console.log('   ⏭️  Skipped: campaign has no onchain_id');
    } else {
        const EIP712_DOMAIN = { name: 'BountyFi', version: '1', chainId: 84532, verifyingContract: '0x0000000000000000000000000000000000000000' };
        const EIP712_TYPES = {
            BountyFiSubmission: [
                { name: 'submissionHash', type: 'bytes32' },
                { name: 'recipient', type: 'address' },
                { name: 'nonce', type: 'uint256' },
            ],
        };
        const photoUrls = [`https://test.com/before_${Date.now()}.jpg`, `https://test.com/after_${Date.now()}.jpg`];
        const gpsLat = 137563;
        const gpsLng = 100501;
        const abiCoder = new ethers.AbiCoder();
        const submissionHash = ethers.keccak256(abiCoder.encode(
            ['uint256', 'string[]', 'int256', 'int256'],
            [campWithOnchain.onchain_id, photoUrls, gpsLat, gpsLng]
        ));
        const nonce = Date.now();
        const eip712_message = { submissionHash, recipient: wallet.address, nonce: nonce.toString() };
        const submissionSig = await wallet.signTypedData(EIP712_DOMAIN, EIP712_TYPES, eip712_message);

        const { data: subResult, error: subError } = await supabase.functions.invoke('relay_submission', {
            body: {
                campaign_id: campaignId,
                photo_urls: photoUrls,
                gps_lat: gpsLat,
                gps_lng: gpsLng,
                signature: submissionSig,
                public_address: wallet.address,
                eip712_message,
            },
        });

        if (subError) {
            console.error('❌ relay_submission failed:', subError);
            if (subError.context) {
                try {
                    const reader = subError.context.body.getReader();
                    const { value } = await reader.read();
                    console.error('   Error Body:', new TextDecoder().decode(value));
                } catch (e) {}
            }
        } else {
            console.log('✅ relay_submission Success:', subResult);
        }
    }

    // --- TEST 3: Relay Lootbox ---
    console.log('\n🎁 Testing relay_lootbox...');
    
    // First, give the user some tickets
    console.log('   Granting 20 tickets...');
    await supabase.from('users').update({ tickets: 20 }).eq('id', userId);
    
    // Wait a bit for DB propagation/realtime
    await new Promise(r => setTimeout(r, 2000));

    const lootboxMsg = JSON.stringify({ action: 'open_lootbox', timestamp: Date.now() });
    const lootboxSig = await wallet.signMessage(lootboxMsg);

    const { data: lootResult, error: lootError } = await supabase.functions.invoke('relay_lootbox', {
        body: {
            signature: lootboxSig,
            message: lootboxMsg
        }
    });

    if (lootError) {
        console.error('❌ relay_lootbox failed:', lootError);
        if (lootError.context) {
            try {
                const reader = lootError.context.body.getReader();
                const { value } = await reader.read();
                console.error('   Error Body:', new TextDecoder().decode(value));
            } catch (e) {}
        }
    } else {
        console.log('✅ relay_lootbox Success:', lootResult);
    }

    // --- VERIFICATION ---
    console.log('\n🏁 Final Verifications...');
    
    // Check if Realtime worked
    if (realtimeReceived) {
        console.log('✅ Realtime Subscription: WORKING');
    } else {
        console.warn('⚠️ Realtime Subscription: NOT RECEIVED (Check if Realtime is enabled in Supabase)');
    }

    // Check final balance
    const { data: finalUser } = await supabase.from('users').select('tickets').eq('id', userId).single();
    console.log(`💰 Final Ticket Balance: ${finalUser?.tickets}`);
    if (finalUser?.tickets === 10) {
        console.log('✅ Ticket Deduction: WORKING');
    } else {
        console.error('❌ Ticket Deduction: FAILED');
    }

    // Cleanup
    console.log('\n🧹 Cleaning up test user...');
    await supabase.auth.admin.deleteUser(userId);
    await supabase.removeChannel(channel);

    console.log('--- 🏁 Integration Tests Complete ---');
}

runTests().catch(console.error);
