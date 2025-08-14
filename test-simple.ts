// Simple test file to check module imports
console.log('Testing module imports...');

// Test Logger import
try {
  const loggerModule = require('./src/utils/Logger');
  console.log('✓ Logger import successful');
} catch (error) {
  console.log('✗ Logger import failed:', error.message);
}

// Test ContractAwareFuzzer import
try {
  const fuzzerModule = require('./src/fuzzing/ContractAwareFuzzer');
  console.log('✓ ContractAwareFuzzer import successful');
} catch (error) {
  console.log('✗ ContractAwareFuzzer import failed:', error.message);
}

// Test AuthOrchestrator import
try {
  const authModule = require('./src/auth/AuthOrchestrator');
  console.log('✓ AuthOrchestrator import successful');
} catch (error) {
  console.log('✗ AuthOrchestrator import failed:', error.message);
}

console.log('Module import test complete');
