// Simple login test to check error logs
async function testLoginAPI() {
  console.log('🧪 Testing login API with detailed logging...');
  
  try {
    const response = await fetch('http://localhost:3002/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'jane@example.com',  // Using the email from our DB test
        password: 'testpass'
      })
    });
    
    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const text = await response.text();
    console.log('📊 Response text length:', text.length);
    console.log('📊 Response first 200 chars:', text.substring(0, 200));
    
    if (response.headers.get('content-type')?.includes('application/json')) {
      try {
        const data = JSON.parse(text);
        console.log('✅ Parsed JSON response:', data);
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError.message);
      }
    } else {
      console.log('ℹ️ Non-JSON response received');
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

testLoginAPI();