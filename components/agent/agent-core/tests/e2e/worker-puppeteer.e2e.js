// E2E Puppeteer test for web worker LLM integration
import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
const HARNESS_URL = 'http://127.0.0.1:8080/www/components/web_worker/worker-e2e-harness.html';

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);

  console.log('Navigating to harness...');
  await page.goto(HARNESS_URL);

  // Fill API key and model
  await page.type('#apiKey', API_KEY);
  await page.type('#model', MODEL);
  await page.click('#initBtn');

  // Wait for worker ready message
  await page.waitForFunction(() => {
    return document.getElementById('log').textContent.includes('ready');
  }, { timeout: 10000 });
  console.log('Worker ready.');

  // Send a chat message
  await page.type('#userMsg', 'Hello from Puppeteer!');
  await page.click('#sendBtn');

  // Wait for a step message (streamed response)
  await page.waitForFunction(() => {
    return document.getElementById('log').textContent.includes('step');
  }, { timeout: 20000 });

  // Get and print the log
  const logContent = await page.$eval('#log', el => el.textContent);
  console.log('--- Worker Log ---\n' + logContent);

  await browser.close();
})();
