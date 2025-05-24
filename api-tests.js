#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'http://localhost:5000';

console.log('🚀 BussNote API Auto Test Suite Starting...\n');

// Helper function to make API requests
async function apiRequest(method, endpoint, data = null, headers = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    const result = await response.json();
    return { status: response.status, data: result, ok: response.ok };
  } catch (error) {
    return { status: 0, data: null, ok: false, error: error.message };
  }
}

// Test results tracker
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function testResult(testName, passed, message = '') {
  totalTests++;
  if (passed) {
    passedTests++;
    console.log(`✅ ${testName}`);
  } else {
    failedTests++;
    console.log(`❌ ${testName} - ${message}`);
  }
}

// Authentication Tests
async function testAuthentication() {
  console.log('🔐 Testing Authentication...');
  
  // Test valid login
  const loginResult = await apiRequest('POST', '/api/login', {
    username: 'JAYESHBB',
    password: 'admin123'
  });
  
  testResult('Valid login', loginResult.ok && loginResult.status === 200, 
    loginResult.ok ? '' : `Status: ${loginResult.status}`);

  // Test invalid login
  const invalidLogin = await apiRequest('POST', '/api/login', {
    username: 'wronguser',
    password: 'wrongpass'
  });
  
  testResult('Invalid login rejection', !invalidLogin.ok && invalidLogin.status === 401,
    invalidLogin.ok ? 'Should have failed but succeeded' : '');

  return loginResult.data; // Return user data for subsequent tests
}

// API Endpoint Tests
async function testAPIEndpoints() {
  console.log('\n📡 Testing API Endpoints...');

  // Test dashboard stats
  const statsResult = await apiRequest('GET', '/api/dashboard/stats');
  testResult('Dashboard stats endpoint', statsResult.ok && statsResult.data,
    statsResult.ok ? '' : `Status: ${statsResult.status}`);

  // Test parties endpoint
  const partiesResult = await apiRequest('GET', '/api/parties');
  testResult('Parties list endpoint', partiesResult.ok && Array.isArray(partiesResult.data),
    partiesResult.ok ? '' : `Status: ${partiesResult.status}`);

  // Test invoices endpoint
  const invoicesResult = await apiRequest('GET', '/api/invoices/recent');
  testResult('Recent invoices endpoint', invoicesResult.ok && Array.isArray(invoicesResult.data),
    invoicesResult.ok ? '' : `Status: ${invoicesResult.status}`);

  // Test users endpoint
  const usersResult = await apiRequest('GET', '/api/users');
  testResult('Users list endpoint', usersResult.ok && Array.isArray(usersResult.data),
    usersResult.ok ? '' : `Status: ${usersResult.status}`);

  // Test roles endpoint
  const rolesResult = await apiRequest('GET', '/api/roles');
  testResult('Roles list endpoint', rolesResult.ok && Array.isArray(rolesResult.data),
    rolesResult.ok ? '' : `Status: ${rolesResult.status}`);

  return {
    stats: statsResult.data,
    parties: partiesResult.data,
    invoices: invoicesResult.data,
    users: usersResult.data,
    roles: rolesResult.data
  };
}

// Data Validation Tests
async function testDataValidation(apiData) {
  console.log('\n📊 Testing Data Validation...');

  // Test dashboard stats structure
  if (apiData.stats) {
    testResult('Dashboard has total sales', typeof apiData.stats.totalSales === 'number');
    testResult('Dashboard has sales by currency', apiData.stats.salesByCurrency && typeof apiData.stats.salesByCurrency === 'object');
    testResult('Dashboard has outstanding invoices count', typeof apiData.stats.outstandingInvoicesCount === 'number');
  }

  // Test parties data structure
  if (apiData.parties && apiData.parties.length > 0) {
    const firstParty = apiData.parties[0];
    testResult('Parties have required fields', 
      firstParty.id && firstParty.name && firstParty.contactPerson);
  }

  // Test users data structure
  if (apiData.users && apiData.users.length > 0) {
    const firstUser = apiData.users[0];
    testResult('Users have required fields',
      firstUser.id && firstUser.fullName && firstUser.username);
  }

  // Test roles data structure
  if (apiData.roles && apiData.roles.length > 0) {
    const firstRole = apiData.roles[0];
    testResult('Roles have required fields',
      firstRole.id && firstRole.name && firstRole.description);
  }
}

// Performance Tests
async function testPerformance() {
  console.log('\n⚡ Testing Performance...');

  const startTime = Date.now();
  await apiRequest('GET', '/api/dashboard/stats');
  const endTime = Date.now();
  const responseTime = endTime - startTime;

  testResult('Dashboard stats response time < 2s', responseTime < 2000,
    `Response time: ${responseTime}ms`);

  const startTime2 = Date.now();
  await apiRequest('GET', '/api/parties');
  const endTime2 = Date.now();
  const responseTime2 = endTime2 - startTime2;

  testResult('Parties list response time < 2s', responseTime2 < 2000,
    `Response time: ${responseTime2}ms`);
}

// Security Tests
async function testSecurity() {
  console.log('\n🛡️ Testing Security...');

  // Test protected endpoint without authentication
  const protectedResult = await apiRequest('GET', '/api/user');
  testResult('Protected endpoint requires auth', protectedResult.status === 401,
    protectedResult.status === 401 ? '' : `Expected 401, got ${protectedResult.status}`);

  // Test SQL injection protection (basic)
  const sqlInjectionTest = await apiRequest('POST', '/api/login', {
    username: "'; DROP TABLE users; --",
    password: 'test'
  });
  testResult('SQL injection protection', !sqlInjectionTest.ok,
    sqlInjectionTest.ok ? 'Potential SQL injection vulnerability' : '');
}

// Main test runner
async function runAllTests() {
  try {
    console.log('🎯 Starting BussNote Auto Test Suite');
    console.log('=' .repeat(50));

    const user = await testAuthentication();
    const apiData = await testAPIEndpoints();
    await testDataValidation(apiData);
    await testPerformance();
    await testSecurity();

    console.log('\n' + '='.repeat(50));
    console.log(`📋 Test Summary:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   ✅ Passed: ${passedTests}`);
    console.log(`   ❌ Failed: ${failedTests}`);
    console.log(`   📊 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    if (failedTests === 0) {
      console.log('\n🎉 All tests passed! Your BussNote app is working perfectly!');
    } else {
      console.log(`\n⚠️ ${failedTests} test(s) failed. Please check the issues above.`);
    }

  } catch (error) {
    console.error('\n💥 Test suite encountered an error:', error.message);
    console.log('\n🔧 Make sure your BussNote server is running on http://localhost:5000');
  }
}

// Handle command line arguments
const testType = process.argv[2] || 'all';

switch(testType.toLowerCase()) {
  case 'auth':
    testAuthentication();
    break;
  case 'api':
    testAPIEndpoints();
    break;
  case 'security':
    testSecurity();
    break;
  case 'performance':
    testPerformance();
    break;
  case 'all':
  default:
    runAllTests();
    break;
}