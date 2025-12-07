const requiredKeys = [
    'DATABASE_URL',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
    'ODDS_API_KEY',
    'GOOGLE_API_KEY',
    'SOCCER_DATA_API_KEY'
];

const fs = require('fs');
const path = require('path');

// Try to read .env
try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        envContent.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                process.env[key.trim()] = value.trim().replace(/"/g, '');
            }
        });
    }
} catch (e) {
    // Ignore
}

console.log("🔍 Checking Environment Variables...");
let missing = [];

requiredKeys.forEach(key => {
    if (!process.env[key]) {
        missing.push(key);
    }
});

if (missing.length > 0) {
    console.error("❌ Missing Keys:");
    missing.forEach(key => console.error(`   - ${key}`));
    console.log("\nPlease add them to your .env file.");
    process.exit(1);
} else {
    console.log("✅ All systems go! You are ready to run.");
}
