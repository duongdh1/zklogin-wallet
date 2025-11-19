#!/bin/bash

# Quick test script to verify Playwright setup

echo "🧪 Testing Playwright Setup..."
echo ""

# Check if chromium is installed
if [ -d "$HOME/.cache/ms-playwright/chromium-1194" ]; then
    echo "✓ Chromium installed"
else
    echo "✗ Chromium not found"
    echo "  Run: bunx playwright install chromium"
    exit 1
fi

# Test basic browser launch
echo ""
echo "🌐 Launching test browser..."

node -e "
const { chromium } = require('playwright');

(async () => {
  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('https://example.com');
    console.log('✓ Browser launched successfully');
    await browser.close();
  } catch (error) {
    console.error('✗ Browser launch failed:', error.message);
    process.exit(1);
  }
})();
"

echo ""
echo "✅ Playwright setup is working!"
echo ""
echo "Next steps:"
echo "  1. Start wallet app: cd apps/wallet && bun run dev"
echo "  2. Run collection: COGNITO_EMAIL='...' COGNITO_PASSWORD='...' bun run collect"
