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
        console.error("   ❌ Function returned error:", data.error);
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

    if (submission.signature !== 'GOLDEN_TASK_AGENT') {
        console.error(`   ❌ Wrong signature: ${submission.signature}`);
    } else {
        console.log("   ✅ Submission signature Verified");
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
