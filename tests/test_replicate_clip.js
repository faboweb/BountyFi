// Node 23 has native fetch, no need for node-fetch
require('dotenv').config();

const REPLICATE_API_KEY = process.env.REPLICATE_API_KEY;
const BEFORE_PHOTO = "https://cguqjaoeleifeaxktmwv.supabase.co/storage/v1/object/public/submission-photos/test/1769594829324_before.jpg";
const AFTER_PHOTO = "https://cguqjaoeleifeaxktmwv.supabase.co/storage/v1/object/public/submission-photos/test/1769594829324_after.jpg";

const PROMPTS = "a messy cluttered table with snacks and trash|a neat clean empty table with only cables";

async function getSimilarity(imageUrl) {
    const response = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
            "Authorization": `Token ${REPLICATE_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            // Official openai/clip version
            version: "af1a99a6f7f34111d665b9366639639cd360c363a0986c123671c6670868f080",
            input: {
                image: imageUrl,
                text: PROMPTS
            }
        })
    });

    const prediction = await response.json();
    let result = prediction;

    // Poll for results
    while (result.status !== "succeeded" && result.status !== "failed") {
        await new Promise(r => setTimeout(r, 1000));
        const res = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
            headers: { "Authorization": `Token ${REPLICATE_API_KEY}` }
        });
        result = await res.json();
    }

    return result.output; // Array of [score1, score2]
}

async function runTest() {
    console.log("🚀 Testing Replicate CLIP Semantic Comparison...");
    
    console.log("📸 Analyzing BEFORE photo...");
    const beforeScores = await getSimilarity(BEFORE_PHOTO);
    console.log(`   Scores: Dirty: ${beforeScores[0].toFixed(4)}, Clean: ${beforeScores[1].toFixed(4)}`);

    console.log("📸 Analyzing AFTER photo...");
    const afterScores = await getSimilarity(AFTER_PHOTO);
    console.log(`   Scores: Dirty: ${afterScores[0].toFixed(4)}, Clean: ${afterScores[1].toFixed(4)}`);

    // Heuristics
    const beforeIsDirty = beforeScores[0] > beforeScores[1];
    const afterIsClean = afterScores[1] > afterScores[0];
    const cleanImprovement = afterScores[1] - beforeScores[1];

    console.log("\n📊 Evaluation:");
    console.log(`   - Before is dirty? ${beforeIsDirty ? "✅" : "❌"}`);
    console.log(`   - After is clean? ${afterIsClean ? "✅" : "❌"}`);
    console.log(`   - Cleanliness Delta: ${cleanImprovement.toFixed(4)}`);

    if (beforeIsDirty && afterIsClean && cleanImprovement > 0.05) {
        console.log("\n🎯 DECISION: AUTO_APPROVE");
    } else {
        console.log("\n⚠️ DECISION: NEEDS_HUMAN_REVIEW");
    }
}

runTest().catch(console.error);
