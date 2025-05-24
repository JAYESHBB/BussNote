#!/usr/bin/env node

import { spawn } from 'child_process';

console.log('🎭 Setting up BussNote Auto Testing Environment...\n');

function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
  });
}

async function setup() {
  try {
    console.log('📦 Installing Playwright browsers...');
    await runCommand('npx', ['playwright', 'install']);
    
    console.log('\n✅ Setup completed successfully!');
    console.log('\n🚀 Ready to run automated tests!');
    console.log('\nAvailable commands:');
    console.log('  node run-tests.js all         # Run all tests');
    console.log('  node run-tests.js auth        # Test authentication');
    console.log('  node run-tests.js dashboard   # Test dashboard');
    console.log('  node run-tests.js invoice     # Test invoices');
    console.log('  node run-tests.js --help      # Show all options');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

setup();