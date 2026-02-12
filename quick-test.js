#!/usr/bin/env node
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function quickTest() {
  console.log('🚀 Starting quick test of new Web Worker tests...');

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
        res.end('Not found: ' + filePath);
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  });

  server.listen(8767, async () => {
    console.log('📡 Server running on port 8767');

    const browser = await chromium.launch({ headless: true });
    let passed = 0;
    let failed = 0;

    try {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Test agent spec
      console.log('\n📋 Testing: src/agent/tests/unit/agent.spec.html');
      await page.goto('http://localhost:8767/src/agent/tests/unit/agent.spec.html');
      await page.waitForFunction(() => {
        const badge = document.getElementById('status-badge');
        return badge && (badge.textContent.includes('Passed') || badge.textContent.includes('Failed'));
      }, { timeout: 15000 });

      const result1 = await page.evaluate(() => {
        const badge = document.getElementById('status-badge');
        const passEl = document.getElementById('pass-count');
        const failEl = document.getElementById('fail-count');
        return {
          status: badge ? badge.textContent : 'Unknown',
          passed: passEl ? parseInt(passEl.textContent) : 0,
          failed: failEl ? parseInt(failEl.textContent) : 0
        };
      });

      console.log(`   ✅ Passed: ${result1.passed}, ❌ Failed: ${result1.failed}`);
      passed += result1.passed;
      failed += result1.failed;

      // Test protocol spec
      console.log('\n📋 Testing: src/agent/tests/unit/protocol.spec.html');
      await page.goto('http://localhost:8767/src/agent/tests/unit/protocol.spec.html');
      await page.waitForFunction(() => {
        const badge = document.getElementById('status-badge');
        return badge && (badge.textContent.includes('Passed') || badge.textContent.includes('Failed'));
      }, { timeout: 15000 });

      const result2 = await page.evaluate(() => {
        const badge = document.getElementById('status-badge');
        const passEl = document.getElementById('pass-count');
        const failEl = document.getElementById('fail-count');
        return {
          status: badge ? badge.textContent : 'Unknown',
          passed: passEl ? parseInt(passEl.textContent) : 0,
          failed: failEl ? parseInt(failEl.textContent) : 0
        };
      });

      console.log(`   ✅ Passed: ${result2.passed}, ❌ Failed: ${result2.failed}`);
      passed += result2.passed;
      failed += result2.failed;

      await context.close();

      // Print summary
      console.log('\n' + '='.repeat(50));
      console.log('📊 QUICK TEST SUMMARY');
      console.log('='.repeat(50));
      console.log(`Total Tests: ${passed + failed}`);
      console.log(`Passed: ${passed} ✅`);
      console.log(`Failed: ${failed} ${failed > 0 ? '❌' : ''}`);
      console.log('='.repeat(50));

      if (failed === 0) {
        console.log('🎉 All automated tests have passed!');
      } else {
        console.log('⚠️  Some tests failed. Please review the errors above.');
        process.exit(1);
      }

    } catch (error) {
      console.error('❌ Test runner failed:', error);
      process.exit(1);
    } finally {
      await browser.close();
      server.close();
    }
  });
}

quickTest();
