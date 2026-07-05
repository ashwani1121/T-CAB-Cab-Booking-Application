const fs           = require("fs");
const crypto       = require("crypto");
const axios        = require("axios");
const DEMO_API_URL = "https://tcab.cloud/"; 

// STEP 1: Generate RSA key pair (RUN ONCE)
function generateKeys(){
    const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
        modulusLength: 2048,
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs8", format: "pem" }
    });
    fs.writeFileSync("license_private.pem", privateKey);
    fs.writeFileSync("license_public.pem", publicKey);
    console.log("\n✅ Keys generated successfully!");
    console.log("📄 license_private.pem - KEEP THIS SECRET!");
    console.log("📄 license_public.pem - Give to clients\n");
}

// STEP 2: Generate signed license file
function generateLicense(payload){
    if(!fs.existsSync("license_private.pem")){
        console.error("❌ Private key not found! Run: node generateLicense.js keys");
        process.exit(1);
    }
    const privateKey = fs.readFileSync("license_private.pem", "utf8");
    const signer     = crypto.createSign("RSA-SHA256");
    signer.update(JSON.stringify(payload));
    signer.end();
    const signature  = signer.sign(privateKey, "base64");
    return { payload, signature };
}

// STEP 3: Fetch license from database and create file
async function generateLicenseFromDB(licenseId) {
    try{
        console.log(`\n🔍 Fetching license ${licenseId} from database...`);
        const response = await axios.get(`${DEMO_API_URL}/admin/licensing/by-license-id/${licenseId}`);
        if(!response.data.success){
            throw new Error("License not found in database");
        }
        const dbLicense = response.data.data;
        // Check if license is terminated
        if (dbLicense.status === 'terminated') {
            console.error("❌ Cannot generate - license is TERMINATED");
            process.exit(1);
        }
        console.log("✅ License found in database");
        // Create license payload
        const licenseData = {
            license_id: dbLicense.license_id,
            client_name: dbLicense.client_name,
            company_name: dbLicense.company_name,
            domain: dbLicense.domain,
            server_ip: dbLicense.server_ip || "",
            issued_on: new Date().toISOString().split('T')[0],
            expiry_on: dbLicense.plan === 'lifetime' ? null : dbLicense.expiry_on,
            plan: dbLicense.plan,
            status: dbLicense.status,
            features: ["RIDE", "DRIVER", "ADMIN", "PASSENGER", "BOOKING"]
        };
        // Generate signed license
        const license = generateLicense(licenseData);
        // Save to file
        const filename = `license_${dbLicense.license_id}.lic`;
        fs.writeFileSync(filename, JSON.stringify(license, null, 2));
        console.log("\n═══════════════════════════════════════");
        console.log("✅ LICENSE FILE GENERATED!");
        console.log("═══════════════════════════════════════");
        console.log(`📄 File: ${filename}`);
        console.log(`🏢 Client: ${licenseData.client_name}`);
        console.log(`🏭 Company: ${licenseData.company_name}`);
        console.log(`🌐 Domain: ${licenseData.domain}`);
        console.log(`📦 Plan: ${licenseData.plan}`);
        console.log(`📅 Expires: ${licenseData.expiry_on || 'Never (Lifetime)'}`);
        console.log(`🔧 Status: ${licenseData.status}`);
        console.log("═══════════════════════════════════════");
        console.log("\n📤 SEND TO CLIENT:");
        console.log(`   1. ${filename} (rename to license.lic)`);
        console.log(`   2. license_public.pem`);
        console.log(`   3. Your project code\n`);
    }catch(error){
        console.error("\n❌ Error:", error.message);
        if(error.response){
        console.error("API Error:", error.response.data);
        }
        process.exit(1);
    }
}

// ============================================
// COMMAND LINE INTERFACE
// ============================================
const command   = process.argv[2];
const licenseId = process.argv[3];
if(command === "keys"){
    generateKeys();
}else 
if(command === "generate" && licenseId){
    generateLicenseFromDB(licenseId);
}else{
    console.log(`
        ╔═══════════════════════════════════════════╗
        ║       LICENSE GENERATOR - DEMO SIDE       ║
        ╚═══════════════════════════════════════════╝
        USAGE:

        1️⃣  FIRST TIME SETUP (Run once):
            node generateLicense.js keys

        2️⃣  GENERATE LICENSE FOR CLIENT:
            node generateLicense.js generate LIC-IND-2025-0001

        EXAMPLES:

        # First time - generate keys
        node generateLicense.js keys

        # After creating license in dashboard
        node generateLicense.js generate LIC-IND-2025-0001
        
        # Another client
        node generateLicense.js generate LIC-IND-2025-0002
    `);
}