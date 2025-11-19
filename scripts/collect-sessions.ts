/**
 * Automated session collection using Playwright
 * Automates OAuth login and extracts zkLogin session data
 */

import { chromium, type Browser, type Page } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuration
const WALLET_URL = 'https://zklogin-wallet-wallet.vercel.app/'
const NUM_SESSIONS = 3
const OUTPUT_FILE = path.join(__dirname, 'wallets.json')
const STARTING_PIN = 111111

// AWS Cognito credentials
const COGNITO_EMAIL = 'duongdh@twendeesoft.com'
const COGNITO_PASSWORD = 'Dohaiduong1803@'

interface WalletConfig {
  jwtToken: string
  ephemeralSecretKey: string
  randomness: string
  maxEpoch: number
  zkProof: any
  salt: string
}

// Wait helper
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Extract session data from browser
async function extractSessionData(page: Page, pin: string): Promise<WalletConfig | null> {
  try {
    // Wait a bit more for session to be fully populated
    await delay(5000) // Increased wait time for zkProof generation

    // Extract data from sessionStorage
    const sessionData = await page.evaluate((userPin: string) => {
      const salt = userPin
      
      return {
        jwtToken: sessionStorage.getItem('idToken'),
        ephemeralSecretKey: sessionStorage.getItem('ephemeralSecretKey'),
        randomness: sessionStorage.getItem('randomness'),
        maxEpoch: parseInt(sessionStorage.getItem('maxEpoch') || '0'),
        zkProof: JSON.parse(sessionStorage.getItem('zkProof') || '{}'),
        salt: salt
      }
    }, pin)

    // Validate required fields
    if (!sessionData.jwtToken || !sessionData.ephemeralSecretKey || !sessionData.randomness) {
      console.error(`❌ PIN ${pin}: Missing required session data`)
      return null
    }

    console.log(`✓ PIN ${pin}: Extracted successfully`)
    return sessionData
  } catch (error: any) {
    console.error(`❌ PIN ${pin}: Failed to extract - ${error.message}`)
    return null
  }
}

// Perform OAuth login and PIN entry
async function performLogin(page: Page, pin: string): Promise<boolean> {
  try {
    console.log('  → Navigating to wallet app...')
    await page.goto(WALLET_URL, { waitUntil: 'networkidle' })

    // Click "Sign in with Cognito" button
    console.log('  → Clicking "Sign in with Cognito"...')
    await page.click('button:has-text("Sign in with Cognito"), a:has-text("Sign in with Cognito")', { timeout: 10000 })

    // Wait for Cognito Hosted UI
    console.log('  → Waiting for Cognito login page...')
    await page.waitForURL('**/login?client_id=**', { timeout: 15000 })
    await delay(2000)

    // Check if already logged in (shows "Sign in as ..." option)
    const signInAsButton = await page.$('text=/Sign in as/i')
    if (signInAsButton) {
      console.log('  → Already logged in, clicking "Sign in as duongdh@twendeesoft.com"...')
      await signInAsButton.click()
    } else {
      // Step 1: Enter email
      console.log('  → Entering email...')
      const emailInput = await page.waitForSelector('input[type="email"], input[name="username"]', { timeout: 10000 })
      await emailInput.fill(COGNITO_EMAIL)
      
      // Click Next button
      console.log('  → Clicking Next...')
      const nextButton = await page.$('button:has-text("Next"), input[type="submit"]')
      if (nextButton) {
        await nextButton.click()
      } else {
        await page.keyboard.press('Enter')
      }
      
      // Step 2: Wait for password page
      await delay(2000)
      
      // Enter password
      console.log('  → Entering password...')
      const passwordInput = await page.waitForSelector('input[type="password"]', { timeout: 10000 })
      await passwordInput.fill(COGNITO_PASSWORD)
      
      // Submit login
      console.log('  → Submitting login...')
      await page.keyboard.press('Enter')
    }

    // Wait for redirect back to wallet (PIN page)
    console.log('  → Waiting for redirect to PIN page...')
    await page.waitForURL('**/login**', { timeout: 30000 })
    await delay(3000) // Wait for PIN page to fully load

    // Enter PIN (first time - create)
    console.log(`  → Entering PIN: ${pin} (first time)...`)
    await enterPin(page, pin)
    await delay(1000)

    // Enter PIN (second time - confirm)
    console.log(`  → Entering PIN: ${pin} (confirm)...`)
    await enterPin(page, pin)
    await delay(2000)

    // Wait for redirect to main app
    console.log('  → Waiting for main app...')
    // Wait for either root page or activity page
    await Promise.race([
      page.waitForURL('https://zklogin-wallet-wallet.vercel.app/', { timeout: 30000 }),
      page.waitForURL('**/activity', { timeout: 30000 })
    ])

    console.log('  ✓ Login and PIN setup successful')
    return true
  } catch (error: any) {
    console.error(`  ❌ Login failed: ${error.message}`)
    return false
  }
}

// Helper function to enter PIN
async function enterPin(page: Page, pin: string): Promise<void> {
  // Find PIN input fields (assuming 6 digit inputs)
  const pinDigits = pin.split('')
  
  for (let i = 0; i < pinDigits.length; i++) {
    // Try different possible selectors for PIN inputs
    const selectors = [
      `input[type="text"]:nth-of-type(${i + 1})`,
      `input[type="password"]:nth-of-type(${i + 1})`,
      `input[data-index="${i}"]`,
      `.pin-input:nth-of-type(${i + 1})`,
    ]
    
    let filled = false
    for (const selector of selectors) {
      try {
        const input = await page.$(selector)
        if (input) {
          await input.fill(pinDigits[i])
          filled = true
          break
        }
      } catch (e) {
        // Try next selector
      }
    }
    
    if (!filled) {
      // Fallback: type sequentially
      await page.keyboard.type(pinDigits[i])
    }
    
    await delay(100)
  }
}

// Logout
async function performLogout(page: Page): Promise<void> {
  try {
    // Clear session by clearing sessionStorage and cookies
    await page.evaluate(() => {
      sessionStorage.clear()
      localStorage.clear()
    })
    
    // Clear cookies
    const context = page.context()
    await context.clearCookies()
    
    // Navigate back to home
    await page.goto(WALLET_URL)
    await delay(2000)

    console.log('  ✓ Session cleared')
  } catch (error: any) {
    console.error(`  ⚠️ Logout failed: ${error.message}`)
  }
}

// Main
async function main() {
  console.log('🤖 Automated Session Collection\n')

  console.log(`📋 Configuration:`)
  console.log(`  Wallet URL: ${WALLET_URL}`)
  console.log(`  Email: ${COGNITO_EMAIL}`)
  console.log(`  Starting PIN: ${STARTING_PIN}`)
  console.log(`  Target sessions: ${NUM_SESSIONS}`)
  console.log(`  Output: ${OUTPUT_FILE}\n`)

  // Launch browser
  console.log('🌐 Launching browser...\n')
  const browser: Browser = await chromium.launch({
    headless: true, // Headless mode for server environments
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  })

  const page: Page = await context.newPage()

  const walletConfigs: WalletConfig[] = []
  let successCount = 0
  let failCount = 0

  // Collect sessions
  for (let i = 0; i < NUM_SESSIONS; i++) {
    const currentPin = (STARTING_PIN + i).toString()
    console.log(`\n--- Session ${i + 1}/${NUM_SESSIONS} | PIN: ${currentPin} ---\n`)

    // Login with current PIN
    const loginSuccess = await performLogin(page, currentPin)
    if (!loginSuccess) {
      failCount++
      console.log(`\n⚠️ Skipping session ${i + 1} due to login failure\n`)
      await delay(3000)
      continue
    }

    // Extract session data
    await delay(3000) // Wait for zkProof generation
    const sessionData = await extractSessionData(page, currentPin)

    if (sessionData) {
      walletConfigs.push(sessionData)
      successCount++
      console.log(`✓ Saved session ${i + 1} with PIN ${currentPin}`)
    } else {
      failCount++
    }

    // Logout for next iteration
    if (i < NUM_SESSIONS - 1) {
      console.log('\n  → Clearing session for next login...')
      await performLogout(page)
      await delay(2000)
    }

    // Progress update
    if ((i + 1) % 10 === 0) {
      console.log(`\n📊 Progress: ${i + 1}/${NUM_SESSIONS} (Success: ${successCount}, Failed: ${failCount})`)
    }
  }

  // Save results
  console.log('\n💾 Saving wallet configurations...\n')

  if (walletConfigs.length > 0) {
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(walletConfigs, null, 2))
    console.log(`✓ Saved ${walletConfigs.length} wallet configs to: ${OUTPUT_FILE}`)
  } else {
    console.error('❌ No wallet configurations collected!')
  }

  // Close browser
  await browser.close()

  // Summary
  console.log('\n📊 Collection Summary:\n')
  console.log(`  Total Attempts: ${NUM_SESSIONS}`)
  console.log(`  Successful: ${successCount}`)
  console.log(`  Failed: ${failCount}`)
  console.log(`  Success Rate: ${((successCount / NUM_SESSIONS) * 100).toFixed(1)}%`)

  if (successCount >= NUM_SESSIONS * 0.9) {
    console.log('\n✅ Collection completed successfully!')
    console.log('\nNext step: bun run generate')
  } else {
    console.log('\n⚠️ Some sessions failed. You may want to:')
    console.log('  1. Review the errors above')
    console.log('  2. Run the script again to collect missing sessions')
    console.log('  3. Manually collect remaining sessions if needed')
  }
}

main().catch(console.error)
