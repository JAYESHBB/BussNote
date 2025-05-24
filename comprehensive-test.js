#!/usr/bin/env node

const BASE_URL = 'http://localhost:5000';

console.log('🎯 BussNote Comprehensive Auto Test Suite');
console.log('='.repeat(60));

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
let sessionCookie = '';

// Helper function for API requests
async function apiRequest(method, endpoint, data = null, useAuth = false) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (useAuth && sessionCookie) {
    headers['Cookie'] = sessionCookie;
  }

  const options = { method, headers };
  if (data) options.body = JSON.stringify(data);

  try {
    const response = await fetch(url, options);
    
    // Capture session cookie for authentication
    if (response.headers.get('set-cookie')) {
      sessionCookie = response.headers.get('set-cookie');
    }
    
    const result = await response.json();
    return { status: response.status, data: result, ok: response.ok };
  } catch (error) {
    return { status: 0, data: null, ok: false, error: error.message };
  }
}

function testResult(testName, passed, details = '') {
  totalTests++;
  if (passed) {
    passedTests++;
    console.log(`✅ ${testName}`);
  } else {
    failedTests++;
    console.log(`❌ ${testName} ${details ? '- ' + details : ''}`);
  }
}

// Test 1: Core Authentication System
async function testAuthentication() {
  console.log('\n🔐 Testing Authentication System...');
  
  // Test login with correct credentials
  const loginResult = await apiRequest('POST', '/api/login', {
    username: 'JAYESHBB',
    password: 'admin123'
  });
  
  testResult('Admin login successful', loginResult.ok, 
    loginResult.ok ? '' : `Status: ${loginResult.status}`);
  
  if (loginResult.ok) {
    // Test authenticated user endpoint
    const userResult = await apiRequest('GET', '/api/user', null, true);
    testResult('User session active', userResult.ok && userResult.data.fullName === 'Jayesh Bhadani');
  }
  
  return loginResult.ok;
}

// Test 2: Dashboard Data Integrity
async function testDashboard() {
  console.log('\n📊 Testing Dashboard Data Integrity...');
  
  const statsResult = await apiRequest('GET', '/api/dashboard/stats', null, true);
  testResult('Dashboard stats loaded', statsResult.ok);
  
  if (statsResult.ok && statsResult.data) {
    const stats = statsResult.data;
    testResult('Total sales is valid number', typeof stats.totalSales === 'number' && stats.totalSales >= 0);
    testResult('Sales by currency exists', stats.salesByCurrency && typeof stats.salesByCurrency === 'object');
    testResult('Outstanding invoices count exists', typeof stats.outstandingInvoicesCount === 'number');
    testResult('Total brokerage exists', typeof stats.totalBrokerage === 'number');
    
    console.log(`   📈 Total Sales: ${stats.totalSales.toLocaleString()}`);
    console.log(`   💰 Total Brokerage: ${stats.totalBrokerage.toLocaleString()}`);
    console.log(`   📋 Outstanding Invoices: ${stats.outstandingInvoicesCount}`);
  }
}

// Test 3: Party Management System
async function testPartyManagement() {
  console.log('\n🏢 Testing Party Management System...');
  
  const partiesResult = await apiRequest('GET', '/api/parties', null, true);
  testResult('Parties list loaded', partiesResult.ok);
  
  if (partiesResult.ok && Array.isArray(partiesResult.data)) {
    testResult('Parties data is array', true);
    testResult('Has party records', partiesResult.data.length > 0);
    
    if (partiesResult.data.length > 0) {
      const firstParty = partiesResult.data[0];
      testResult('Party has required fields', 
        firstParty.id && firstParty.name && firstParty.contactPerson);
      console.log(`   👤 First Party: ${firstParty.name} (${firstParty.contactPerson})`);
    }
  }
}

// Test 4: Invoice Management System
async function testInvoiceManagement() {
  console.log('\n📄 Testing Invoice Management System...');
  
  const invoicesResult = await apiRequest('GET', '/api/invoices/recent', null, true);
  testResult('Recent invoices loaded', invoicesResult.ok);
  
  if (invoicesResult.ok && Array.isArray(invoicesResult.data)) {
    testResult('Invoices data is array', true);
    testResult('Has invoice records', invoicesResult.data.length > 0);
    
    if (invoicesResult.data.length > 0) {
      const firstInvoice = invoicesResult.data[0];
      testResult('Invoice has required fields',
        firstInvoice.id && firstInvoice.invoiceNo && firstInvoice.subtotal !== undefined);
      console.log(`   📋 First Invoice: ${firstInvoice.invoiceNo} - ${firstInvoice.subtotal}`);
    }
  }
  
  // Test all invoices endpoint
  const allInvoicesResult = await apiRequest('GET', '/api/invoices', null, true);
  testResult('All invoices endpoint works', allInvoicesResult.ok);
}

// Test 5: User Management System
async function testUserManagement() {
  console.log('\n👥 Testing User Management System...');
  
  const usersResult = await apiRequest('GET', '/api/users', null, true);
  testResult('Users list loaded', usersResult.ok);
  
  if (usersResult.ok && Array.isArray(usersResult.data)) {
    testResult('Users data is array', true);
    testResult('Has user records', usersResult.data.length > 0);
    
    if (usersResult.data.length > 0) {
      const adminUser = usersResult.data.find(u => u.role === 'admin');
      testResult('Admin user exists', adminUser && adminUser.fullName === 'Jayesh Bhadani');
      console.log(`   👑 Admin User: ${adminUser?.fullName} (${adminUser?.username})`);
      console.log(`   👤 Total Users: ${usersResult.data.length}`);
    }
  }
}

// Test 6: Role & Permission System
async function testRoleManagement() {
  console.log('\n🛡️ Testing Role & Permission System...');
  
  const rolesResult = await apiRequest('GET', '/api/roles', null, true);
  testResult('Roles list loaded', rolesResult.ok);
  
  if (rolesResult.ok && Array.isArray(rolesResult.data)) {
    testResult('Roles data is array', true);
    testResult('Has role records', rolesResult.data.length > 0);
    
    if (rolesResult.data.length > 0) {
      const adminRole = rolesResult.data.find(r => r.name === 'Administrator');
      testResult('Administrator role exists', adminRole !== undefined);
      
      const systemRoles = rolesResult.data.filter(r => r.isSystem);
      testResult('System roles exist', systemRoles.length >= 3);
      console.log(`   🏷️ Total Roles: ${rolesResult.data.length}`);
    }
  }
}

// Test 7: Activity & Reporting System
async function testReportsAndActivity() {
  console.log('\n📈 Testing Reports & Activity System...');
  
  const activitiesResult = await apiRequest('GET', '/api/activities', null, true);
  testResult('Activities loaded', activitiesResult.ok);
  
  if (activitiesResult.ok && Array.isArray(activitiesResult.data)) {
    testResult('Activities data is array', true);
    console.log(`   📝 Recent Activities: ${activitiesResult.data.length}`);
  }
}

// Test 8: Performance & Response Times
async function testPerformance() {
  console.log('\n⚡ Testing Performance...');
  
  const endpoints = [
    '/api/dashboard/stats',
    '/api/parties',
    '/api/invoices/recent',
    '/api/users'
  ];
  
  for (const endpoint of endpoints) {
    const startTime = Date.now();
    const result = await apiRequest('GET', endpoint, null, true);
    const responseTime = Date.now() - startTime;
    
    testResult(`${endpoint} response < 3s`, responseTime < 3000, 
      `${responseTime}ms`);
  }
}

// Test 9: Data Consistency
async function testDataConsistency() {
  console.log('\n🔄 Testing Data Consistency...');
  
  // Get stats and verify against actual data
  const [statsResult, partiesResult, invoicesResult] = await Promise.all([
    apiRequest('GET', '/api/dashboard/stats', null, true),
    apiRequest('GET', '/api/parties', null, true),
    apiRequest('GET', '/api/invoices', null, true)
  ]);
  
  if (statsResult.ok && partiesResult.ok && invoicesResult.ok) {
    testResult('All data endpoints accessible', true);
    
    // Check if outstanding invoices count matches
    if (invoicesResult.data && Array.isArray(invoicesResult.data)) {
      const outstandingInvoices = invoicesResult.data.filter(inv => !inv.isClosed);
      testResult('Outstanding invoices count consistent', 
        Math.abs(outstandingInvoices.length - statsResult.data.outstandingInvoicesCount) <= 1);
    }
  }
}

// Main test execution
async function runComprehensiveTest() {
  try {
    const authSuccess = await testAuthentication();
    
    if (authSuccess) {
      await testDashboard();
      await testPartyManagement();
      await testInvoiceManagement();
      await testUserManagement();
      await testRoleManagement();
      await testReportsAndActivity();
      await testPerformance();
      await testDataConsistency();
    } else {
      console.log('⚠️ Authentication failed - skipping authenticated tests');
    }

    // Final results
    console.log('\n' + '='.repeat(60));
    console.log('📋 COMPREHENSIVE TEST RESULTS:');
    console.log(`   🎯 Total Tests: ${totalTests}`);
    console.log(`   ✅ Passed: ${passedTests}`);
    console.log(`   ❌ Failed: ${failedTests}`);
    console.log(`   📊 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    if (failedTests === 0) {
      console.log('\n🎉 EXCELLENT! Your BussNote app passed all tests!');
      console.log('✨ All systems working perfectly with real data');
    } else if (passedTests / totalTests >= 0.8) {
      console.log('\n👍 GOOD! Your BussNote app is working well');
      console.log(`🔧 ${failedTests} minor issues to address`);
    } else {
      console.log('\n⚠️ Some systems need attention');
      console.log('🔧 Please check the failed tests above');
    }
    
    console.log('\n💡 All tests use real data from your database');
    console.log('🔄 Re-run anytime with: node comprehensive-test.js');

  } catch (error) {
    console.error('\n💥 Test suite error:', error.message);
    console.log('🔧 Ensure your BussNote server is running on localhost:5000');
  }
}

runComprehensiveTest();