# 🤖 Automated Session Collection

Tự động thu thập 100 wallet sessions bằng Playwright.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
bun install
bunx playwright install chromium
```

### 2. Start Wallet App

Mở terminal mới:

```bash
cd apps/wallet
bun run dev
```

Đợi app chạy ở http://localhost:3000

### 3. Run Collection Script

```bash
cd scripts
COGNITO_EMAIL="your@email.com" COGNITO_PASSWORD="yourpassword" bun run collect
```

Script sẽ:
- ✅ Tự động login 100 lần
- ✅ Extract session data từ sessionStorage
- ✅ Logout và login lại
- ✅ Lưu tất cả vào `wallets.json`

### 4. Generate Transactions

Sau khi có `wallets.json`:

```bash
bun run generate
```

## ⚙️ Configuration

Edit `collect-sessions.ts`:

```typescript
const WALLET_URL = 'http://localhost:3000'  // Wallet app URL
const NUM_SESSIONS = 100                     // Number of sessions to collect
```

## 🎯 Features

### Headless Mode

Chạy ẩn không hiển thị browser:

```typescript
const browser = await chromium.launch({
  headless: true  // Change to true
})
```

### Custom Selectors

Nếu UI thay đổi, update selectors:

```typescript
// Login button
await page.click('button:has-text("Login")')

// Cognito form
await page.fill('input[name="username"]', email)
await page.fill('input[name="password"]', password)
```

### Speed Control

```typescript
const browser = await chromium.launch({
  slowMo: 100  // Milliseconds delay between actions
})
```

## 📊 Progress Tracking

Script hiển thị:
- ✅ Session number (1/100, 2/100, ...)
- ✅ Login status
- ✅ Extraction status
- ✅ Success/failure count
- ✅ Overall progress every 10 sessions

## 🔧 Troubleshooting

### Lỗi: "Timeout waiting for login"

- Kiểm tra WALLET_URL đúng chưa
- Kiểm tra credentials Cognito
- Tăng timeout:

```typescript
await page.waitForURL('**/activity', { timeout: 60000 })
```

### Lỗi: "Missing session data"

- zkProof chưa generate xong
- Tăng delay sau login:

```typescript
await delay(5000)  // Wait 5 seconds
```

### Lỗi: "Element not found"

UI selectors thay đổi. Update:

```typescript
await page.click('text=Your Login Button Text')
```

## 🎬 Demo Workflow

```
1. [Browser opens] → Navigate to http://localhost:3000
2. [Click Login] → Redirect to Cognito
3. [Fill credentials] → Submit form
4. [Wait redirect] → Back to /activity
5. [Extract data] → Get sessionStorage
6. [Logout] → Clear session
7. [Repeat] → 100 times
8. [Save JSON] → wallets.json created ✓
```

## 📝 Output Example

`wallets.json`:

```json
[
  {
    "jwtToken": "eyJraWQ...",
    "ephemeralSecretKey": "suiprivkey1...",
    "randomness": "123...",
    "maxEpoch": 50,
    "zkProof": {...},
    "salt": "0000000001"
  },
  ...
  {
    "jwtToken": "eyJraWQ...",
    "ephemeralSecretKey": "suiprivkey1...",
    "randomness": "456...",
    "maxEpoch": 50,
    "zkProof": {...},
    "salt": "0000000100"
  }
]
```

## ⏱️ Estimated Time

- **Login**: ~5 seconds/session
- **Extract**: ~2 seconds/session
- **Logout**: ~2 seconds/session
- **Total**: ~9 seconds × 100 = **~15 minutes**

Nhanh hơn **10x** so với manual! 🚀

## 🔐 Security Notes

- ⚠️ Không commit credentials vào git
- ⚠️ Dùng environment variables
- ⚠️ `wallets.json` đã có trong `.gitignore`

## 🆘 Need Help?

Check Playwright docs:
- [Getting Started](https://playwright.dev/docs/intro)
- [Selectors](https://playwright.dev/docs/selectors)
- [Navigation](https://playwright.dev/docs/navigations)
