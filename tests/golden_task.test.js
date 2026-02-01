const { supabase, SUPABASE_URL } = require('./utils/supabase');

console.log(`Connected to: ${SUPABASE_URL}`);

async function runTest() {
    console.log("🧪 Starting Golden Task Injection Test...");

    // 1. Invoke inject_golden_task
    console.log("   Invoking inject_golden_task...");
    const { data, error } = await supabase.functions.invoke('inject_golden_task', {
        body: {}
    });

    if (error) {
        console.error("   ❌ Function invocation failed:", error);
        return;
    }

    if (!data.success) {
        const err = data.error || '';
        if (err.includes('No campaign') || err.includes('Missing') || err.includes('Chain') || err.includes('null')) {
            console.log("   ⏭️  Skipped: inject_golden_task requires chain + synced campaign.", err.slice(0, 60));
        } else {
            console.error("   ❌ Function returned error:", data.error);
        }
        return;
    }

    const taskId = data.task.id;
    console.log(`   ✅ Injection success. Task ID: ${taskId}`);

    // 2. Verify 'submissions' table
    const { data: submission, error: subError } = await supabase
        .from('submissions')
        .select('*')
        .eq('id', taskId)
        .single();
    
    if (subError) {
        console.error("   ❌ Failed to fetch submission:", subError);
        return;
    }

    // Signature must be opaque (hex, sig-length) so validators cannot guess golden vs regular
    const sig = String(submission.signature || '');
    const isOpaqueSig = /^0x[0-9a-fA-F]{128,132}$/.test(sig);
    if (isOpaqueSig) {
        console.log("   ✅ Submission signature is opaque (cannot guess golden)");
    } else {
        console.warn(`   ⚠️  Signature not opaque (got: ${sig.slice(0, 25)}...). Redeploy: supabase functions deploy inject_golden_task`);
    }

    // 3. Verify 'golden_tasks' table
    const { data: golden, error: goldenError } = await supabase
        .from('golden_tasks')
        .select('*')
        .eq('submission_id', taskId)
        .single();

    if (goldenError) {
        console.error("   ❌ Failed to fetch golden metadata:", goldenError);
    } else {
        console.log(`   ✅ Golden metadata found. Expected Outcome: ${golden.expected_outcome}`);
    }
}

runTest();
