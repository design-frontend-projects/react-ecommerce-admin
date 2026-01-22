
// Mock browser environment
const mockDocument = {
  cookie: '',
};

const mockWindow = {
  location: {
    protocol: 'http:',
  },
};

global.document = mockDocument as any;
global.window = mockWindow as any;

// Import the module AFTER mocking
import { setCookie, removeCookie } from '../src/lib/cookies';

async function runTests() {
  console.log('--- Testing Cookie Security ---');

  // Test 1: HTTP environment (Secure should NOT be present)
  console.log('\nTest 1: HTTP Environment');
  mockWindow.location.protocol = 'http:';
  mockDocument.cookie = '';
  setCookie('test_cookie', 'test_value');
  console.log(`Cookie set: "${mockDocument.cookie}"`);

  if (mockDocument.cookie.includes('SameSite=Lax')) {
    console.log('✅ SameSite=Lax present');
  } else {
    console.log('❌ SameSite=Lax MISSING');
  }

  if (mockDocument.cookie.includes('Secure')) {
    console.log('❌ Secure present (unexpected for HTTP)');
  } else {
    console.log('✅ Secure absent (correct for HTTP)');
  }

  // Test 2: HTTPS environment (Secure SHOULD be present)
  console.log('\nTest 2: HTTPS Environment');
  mockWindow.location.protocol = 'https:';
  mockDocument.cookie = '';
  setCookie('test_cookie_secure', 'test_value_secure');
  console.log(`Cookie set: "${mockDocument.cookie}"`);

  if (mockDocument.cookie.includes('SameSite=Lax')) {
    console.log('✅ SameSite=Lax present');
  } else {
    console.log('❌ SameSite=Lax MISSING');
  }

  if (mockDocument.cookie.includes('Secure')) {
    console.log('✅ Secure present');
  } else {
    console.log('❌ Secure MISSING');
  }

  // Test 3: Remove Cookie
  console.log('\nTest 3: Remove Cookie (HTTPS)');
  removeCookie('test_cookie_secure');
  console.log(`Remove Cookie set: "${mockDocument.cookie}"`);
   if (mockDocument.cookie.includes('SameSite=Lax')) {
    console.log('✅ SameSite=Lax present in removal');
  } else {
    console.log('❌ SameSite=Lax MISSING in removal');
  }
}

runTests().catch(console.error);
