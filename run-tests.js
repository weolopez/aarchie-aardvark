#!/usr/bin/env node
/**
 * Aardvark Test Runner
 * Runs all browser-based tests using Playwright
 */

import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Test files to run
const testFiles = [
  'components/agent/agent-core/tests/unit/llm-client.spec.html',
  'components/agent/session-manager/tests/unit/models.spec.html',
  'components/agent/session-manager/tests/unit/session-tree.spec.html',
  'components/agent/session-manager/tests/integration/session-operations.spec.html',
  'components/agent/context-builder/tests/unit/tool-analyzer.spec.html',
  'components/agent/context-builder/tests/unit/conversation-optimizer.spec.html',
  'components/agent/context-builder/tests/unit/prompt-builder.spec.html',
  'components/agent/context-builder/tests/unit/context-manager.spec.html',
  'components/agent/context-builder/tests/unit/context-builder.spec.html',
  'components/agent/context-builder/tests/integration/context-optimization.spec.html'
];

const results = [];

// Simple HTTP server to serve static files
function startServer(port) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let url = req.url === '/' ? 'www/tests/index.html' : req.url;
      if (url.startsWith('/')) url = url.slice(1);
      const filePath = path.join(__dirname, url);
      const ext = path.extname(filePath);
      const contentType = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.json': 'application/json',
        '.css': 'text/css'
      }[ext] || 'text/plain';

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      });
    });

    server.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
      resolve(server);
    });
  });
}

// Run a single test file
async function runTest(browser, testPath, baseUrl) {
  console.log(`\n📋 Running: ${testPath}`);
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Set API key in localStorage for LLM tests
  if (process.env.GEMINI_API_KEY) {
    await page.addInitScript((apiKey) => {
      localStorage.setItem('GEMINI_API_KEY', apiKey);
    }, process.env.GEMINI_API_KEY);
  }
  
  // Listen for console messages
  page.on('console', msg => {
    console.log(`  CONSOLE: ${msg.text()}`);
  });

  // Navigate to test page
  const url = `${baseUrl}/${testPath}`;
  await page.goto(url, { waitUntil: 'networkidle' });
  
   // Wait for tests to complete
   // Tests report completion via postMessage or we can check for the summary element
   await page.waitForFunction(() => {
     const badge = document.getElementById('status-badge');
     const resultsDiv = document.getElementById('test-results');
     // Check if tests have started running (more than just the initial message)
     const testElements = resultsDiv ? resultsDiv.querySelectorAll('.border-l-4').length : 0;
     return badge && (badge.textContent.includes('Passed') || badge.textContent.includes('Failed')) || testElements > 1;
   }, { timeout: 120000 }); // 2 minutes for live API calls
  
  // Extract results
  const testResult = await page.evaluate(() => {
    const totalEl = document.getElementById('total-count');
    const passEl = document.getElementById('pass-count');
    const failEl = document.getElementById('fail-count');
    const badge = document.getElementById('status-badge');
    
    return {
      total: totalEl ? parseInt(totalEl.textContent) : 0,
      passed: passEl ? parseInt(passEl.textContent) : 0,
      failed: failEl ? parseInt(failEl.textContent) : 0,
      status: badge ? badge.textContent : 'Unknown'
    };
  });
  
  await context.close();
  
  return {
    file: testPath,
    ...testResult
  };
}

// Main function
async function main() {
  const port = 8765;
  const server = await startServer(port);
  const baseUrl = `http://localhost:${port}`;
  
  console.log('🚀 Starting Aardvark Test Suite');
  console.log('='.repeat(60));
  
  const browser = await chromium.launch({ headless: true });
  
  try {
    for (const testFile of testFiles) {
      try {
        const result = await runTest(browser, testFile, baseUrl);
        results.push(result);
      } catch (error) {
        console.error(`  ✗ Error running ${testFile}: ${error.message}`);
        results.push({
          file: testFile,
          total: 0,
          passed: 0,
          failed: 1,
          status: 'Error: ' + error.message,
          error: true
        });
      }
    }
  } finally {
    await browser.close();
    server.close();
  }
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  
  let grandTotal = 0;
  let grandPassed = 0;
  let grandFailed = 0;
  
  for (const result of results) {
    const status = result.error ? '⚠️' : result.failed === 0 ? '✅' : '❌';
    console.log(`${status} ${result.file}`);
    console.log(`   Tests: ${result.total}, Passed: ${result.passed}, Failed: ${result.failed}`);
    
    grandTotal += result.total;
    grandPassed += result.passed;
    grandFailed += result.failed;
  }
  
  console.log('\n' + '-'.repeat(60));
  console.log(`Total Tests: ${grandTotal}`);
  console.log(`Passed: ${grandPassed} ✅`);
  console.log(`Failed: ${grandFailed} ${grandFailed > 0 ? '❌' : ''}`);
  console.log('='.repeat(60));
  
  // Exit with error code if any tests failed
  process.exit(grandFailed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
