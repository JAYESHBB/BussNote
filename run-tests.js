#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Starting BussNote Auto Test Suite...\n');

// Function to run a command
function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function runTests() {
  try {
    console.log('📋 Test Categories Available:');
    console.log('1. 🔐 Authentication Tests');
    console.log('2. 📊 Dashboard Tests');
    console.log('3. 📄 Invoice Management Tests');
    console.log('4. 🏢 Party Management Tests');
    console.log('5. 👥 User Management Tests');
    console.log('6. 🛡️  Role Management Tests');
    console.log('7. 📈 Reports & Analytics Tests');
    console.log('8. 🎯 All Tests\n');

    // Get test type from command line argument
    const testType = process.argv[2] || 'all';
    
    console.log(`🔄 Running ${testType} tests...\n`);

    let testFiles = [];
    
    switch(testType.toLowerCase()) {
      case 'auth':
      case 'authentication':
        testFiles = ['tests/auth.spec.ts'];
        break;
      case 'dashboard':
        testFiles = ['tests/dashboard.spec.ts'];
        break;
      case 'invoice':
      case 'invoices':
        testFiles = ['tests/invoice.spec.ts'];
        break;
      case 'party':
      case 'parties':
        testFiles = ['tests/party.spec.ts'];
        break;
      case 'user':
      case 'users':
        testFiles = ['tests/user-management.spec.ts'];
        break;
      case 'role':
      case 'roles':
        testFiles = ['tests/role-management.spec.ts'];
        break;
      case 'reports':
      case 'analytics':
        testFiles = ['tests/reports.spec.ts'];
        break;
      case 'all':
      default:
        testFiles = [
          'tests/auth.spec.ts',
          'tests/dashboard.spec.ts',
          'tests/invoice.spec.ts',
          'tests/party.spec.ts',
          'tests/user-management.spec.ts',
          'tests/role-management.spec.ts',
          'tests/reports.spec.ts'
        ];
        break;
    }

    // Run Playwright tests
    const playwrightArgs = [
      'test',
      '--reporter=html',
      '--output=test-results',
      ...testFiles
    ];

    console.log('🎭 Starting Playwright browser automation...');
    await runCommand('npx', ['playwright', ...playwrightArgs]);
    
    console.log('\n✅ All tests completed successfully!');
    console.log('📊 Test report available at: test-results/index.html');
    console.log('\n🔍 To view detailed test report, run:');
    console.log('   npx playwright show-report');

  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Make sure the application is running (npm run dev)');
    console.log('2. Ensure database is properly seeded');
    console.log('3. Check if all dependencies are installed');
    process.exit(1);
  }
}

// Show usage if help is requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🧪 BussNote Auto Test Runner

Usage:
  node run-tests.js [test-type]

Test Types:
  auth       - Authentication tests only
  dashboard  - Dashboard functionality tests
  invoice    - Invoice management tests
  party      - Party management tests
  user       - User management tests
  role       - Role management tests
  reports    - Reports & analytics tests
  all        - Run all test suites (default)

Examples:
  node run-tests.js auth        # Run authentication tests
  node run-tests.js dashboard   # Run dashboard tests
  node run-tests.js all         # Run all tests

Additional Commands:
  node run-tests.js --debug     # Run tests in debug mode
  node run-tests.js --headed    # Run tests with browser visible
`);
  process.exit(0);
}

// Handle debug mode
if (process.argv.includes('--debug')) {
  console.log('🐛 Running tests in debug mode...');
  runCommand('npx', ['playwright', 'test', '--debug']).catch(console.error);
} else if (process.argv.includes('--headed')) {
  console.log('👀 Running tests with visible browser...');
  runCommand('npx', ['playwright', 'test', '--headed']).catch(console.error);
} else {
  runTests();
}