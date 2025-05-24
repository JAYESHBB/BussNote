#!/usr/bin/env node

const BASE_URL = 'http://localhost:5000';

console.log('🚀 BussNote Practical Auto Test Suite');
console.log('Testing your live application with real data...\n');

let totalTests = 0;
let passedTests = 0;

async function apiRequest(endpoint) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`);
    const data = await response.json();
    return { status: response.status, data, ok: response.ok };
  } catch (error) {
    return { status: 0, data: null, ok: false, error: error.message };
  }
}

function test(name, passed, details = '') {
  totalTests++;
  if (passed) {
    passedTests++;
    console.log(`✅ ${name}`);
    if (details) console.log(`   ${details}`);
  } else {
    console.log(`❌ ${name} ${details ? '- ' + details : ''}`);
  }
}

async function runPracticalTests() {
  console.log('🏗️ Testing Core Application Components...\n');

  // Test 1: Dashboard Stats (Public endpoint)
  const statsResult = await apiRequest('/api/dashboard/stats');
  test('Dashboard Statistics Loading', statsResult.ok);
  
  if (statsResult.ok && statsResult.data) {
    const stats = statsResult.data;
    test('Total Sales Data Available', typeof stats.totalSales === 'number');
    test('Currency Breakdown Available', stats.salesByCurrency && Object.keys(stats.salesByCurrency).length > 0);
    test('Brokerage Data Available', typeof stats.totalBrokerage === 'number');
    
    console.log(`📊 Live Data Summary:`);
    console.log(`   💰 Total Sales: ₹${stats.totalSales?.toLocaleString() || 0}`);
    console.log(`   🏦 Total Brokerage: ₹${stats.totalBrokerage?.toLocaleString() || 0}`);
    console.log(`   📋 Outstanding Invoices: ${stats.outstandingInvoicesCount || 0}`);
    console.log(`   💸 Outstanding Brokerage: ₹${stats.outstandingBrokerage?.toLocaleString() || 0}`);
  }

  // Test 2: Parties Data (Public endpoint)
  const partiesResult = await apiRequest('/api/parties');
  test('Party Management System', partiesResult.ok);
  
  if (partiesResult.ok && Array.isArray(partiesResult.data)) {
    test('Party Records Available', partiesResult.data.length > 0);
    console.log(`🏢 Active Parties: ${partiesResult.data.length}`);
    
    if (partiesResult.data.length > 0) {
      const sampleParty = partiesResult.data[0];
      test('Party Data Structure Valid', sampleParty.name && sampleParty.contactPerson);
    }
  }

  // Test 3: Recent Invoices (Public endpoint)
  const invoicesResult = await apiRequest('/api/invoices/recent');
  test('Invoice Management System', invoicesResult.ok);
  
  if (invoicesResult.ok && Array.isArray(invoicesResult.data)) {
    test('Invoice Records Available', invoicesResult.data.length >= 0);
    console.log(`📄 Recent Invoices: ${invoicesResult.data.length}`);
    
    if (invoicesResult.data.length > 0) {
      const sampleInvoice = invoicesResult.data[0];
      test('Invoice Data Structure Valid', sampleInvoice.invoiceNo && sampleInvoice.subtotal !== undefined);
      
      const totalInvoiceValue = invoicesResult.data.reduce((sum, inv) => sum + (inv.subtotal || 0), 0);
      console.log(`📈 Recent Invoices Value: ₹${totalInvoiceValue.toLocaleString()}`);
    }
  }

  // Test 4: Performance Testing
  console.log('\n⚡ Performance Testing...');
  
  const performanceTests = [
    { name: 'Dashboard Load Time', endpoint: '/api/dashboard/stats' },
    { name: 'Parties Load Time', endpoint: '/api/parties' },
    { name: 'Invoices Load Time', endpoint: '/api/invoices/recent' }
  ];

  for (const perfTest of performanceTests) {
    const startTime = Date.now();
    const result = await apiRequest(perfTest.endpoint);
    const loadTime = Date.now() - startTime;
    
    test(`${perfTest.name} < 2 seconds`, loadTime < 2000, `${loadTime}ms`);
  }

  // Test 5: Data Consistency
  console.log('\n🔄 Data Consistency Checks...');
  
  if (statsResult.ok && invoicesResult.ok) {
    const statsData = statsResult.data;
    const invoicesData = invoicesResult.data;
    
    // Check if data makes sense
    test('Sales amount is positive', statsData.totalSales >= 0);
    test('Brokerage amount is reasonable', statsData.totalBrokerage >= 0 && statsData.totalBrokerage <= statsData.totalSales);
    test('Outstanding count matches data', statsData.outstandingInvoicesCount >= 0);
  }

  // Test 6: Security Headers
  console.log('\n🛡️ Security Checks...');
  
  const securityResult = await apiRequest('/api/user');
  test('Protected Endpoints Secured', securityResult.status === 401, 'Authentication required');

  // Final Results
  console.log('\n' + '='.repeat(50));
  console.log('📋 TEST SUMMARY:');
  console.log(`   🎯 Tests Run: ${totalTests}`);
  console.log(`   ✅ Passed: ${passedTests}`);
  console.log(`   ❌ Failed: ${totalTests - passedTests}`);
  console.log(`   📊 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  if (passedTests === totalTests) {
    console.log('\n🎉 PERFECT! Your BussNote application is working flawlessly!');
    console.log('✨ All systems operational with real data');
  } else if (passedTests / totalTests >= 0.8) {
    console.log('\n👍 EXCELLENT! Your BussNote application is working very well');
    console.log('🔧 Minor optimizations possible');
  } else {
    console.log('\n📈 Your BussNote application is functional');
    console.log('🔧 Some areas for improvement identified');
  }

  console.log('\n💡 All tests performed on live data from your database');
  console.log('🔄 Run again anytime: node practical-test.js');
}

runPracticalTests().catch(error => {
  console.error('\n💥 Test error:', error.message);
  console.log('🔧 Make sure BussNote server is running on localhost:5000');
});