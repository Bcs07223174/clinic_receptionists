// This script will run an API call to check the doctor linkage
async function checkDoctorLinkage() {
    try {
        console.log("=== CHECKING DOCTOR LINKAGE VIA API ===");
        
        // First, let's simulate what happens when we call the appointments API
        const response = await fetch('http://localhost:3000/api/appointments?doctorId=test', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        console.log("Response status:", response.status);
        console.log("Response ok:", response.ok);
        
        const data = await response.text();
        console.log("Response data:", data);
        
    } catch (error) {
        console.error("Error checking doctor linkage:", error);
    }
}

// Check if we're running in Node.js environment
if (typeof window === 'undefined') {
    // Running in Node.js - use node-fetch or similar
    const { default: fetch } = await import('node-fetch');
    global.fetch = fetch;
    checkDoctorLinkage();
} else {
    // Running in browser
    checkDoctorLinkage();
}