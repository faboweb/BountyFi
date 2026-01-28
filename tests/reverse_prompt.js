require('dotenv').config();

const REPLICATE_API_KEY = process.env.REPLICATE_API_KEY;

// lucataco/ollama-llama3.2-vision-11b
const VISION_MODEL_VERSION = "d4e81fc1472556464f1ee5cea4de177b2fe95a6eaadb5f63335df1ba654597af";

const IMAGES = [
    { name: "BEFORE", url: "https://cguqjaoeleifeaxktmwv.supabase.co/storage/v1/object/public/submission-photos/test/1769594829324_before.jpg" },
    { name: "AFTER", url: "https://cguqjaoeleifeaxktmwv.supabase.co/storage/v1/object/public/submission-photos/test/1769594829324_after.jpg" }
];

async function generateReversePrompt(imageUrl, type) {
    console.log(`🔍 Calibrating for ${type} image...`);
    
    const prompt = `Describe this image in 10 words or less. Focus on whether it is dirty/cluttered or clean/tidy. Example: "a cluttered desk with multiple empty coffee cups and trash"`;

    const response = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
            "Authorization": `Token ${REPLICATE_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            version: VISION_MODEL_VERSION,
            input: {
                image: imageUrl,
                prompt: prompt,
                max_new_tokens: 100
            }
        })
    });

    if (!response.ok) throw new Error(await response.text());
    let result = await response.json();

    while (result.status !== "succeeded" && result.status !== "failed") {
        await new Promise(r => setTimeout(r, 1000));
        const res = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
            headers: { "Authorization": `Token ${REPLICATE_API_KEY}` }
        });
        result = await res.json();
    }

    if (result.status === "failed") throw new Error(result.error || "Prediction failed");

    const output = result.output;
    if (!output) {
        console.error("DEBUG Raw Result:", JSON.stringify(result, null, 2));
        return "ERROR: No output from model";
    }

    return Array.isArray(output) ? output.join("").trim() : String(output).trim();
}

async function calibrate() {
    console.log("🛠️ Starting Reverse Prompting (Visual Calibration)...\n");
    
    const results = {};
    for (const img of IMAGES) {
        results[img.name] = await generateReversePrompt(img.url, img.name);
        console.log(`   Suggested Prompt: "${results[img.name]}"\n`);
    }

    console.log("✅ Calibration Complete.");
    console.log("\nSuggested CLIP Pair:");
    console.log(`DIRTY_PROMPT: "${results.BEFORE}"`);
    console.log(`CLEAN_PROMPT: "${results.AFTER}"`);
}

calibrate().catch(console.error);
