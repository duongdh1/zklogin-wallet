# 🤖 Quick Start - Automated Collection

Thu thập 100 wallet sessions tự động trong ~15 phút.

## ▶️ Chạy Ngay

```bash
cd scripts
bun run collect
```

## 📋 Kịch Bản Tự Động

Script sẽ lặp 100 lần:

1. **Mở** https://zklogin-wallet-wallet.vercel.app/
2. **Click** "Sign in with Cognito"
3. **Redirect** → AWS Cognito Hosted UI
4. **Login**:
   - Email: `duongdh@twendeesoft.com`
   - Password: `Dohaiduong1803@`
5. **Redirect** → PIN page
6. **Nhập PIN** (lần 1): `111111`, `111112`, `111113`, ...
7. **Nhập PIN** (lần 2 - confirm): Same
8. **Vào app** → Extract session data
9. **Clear session** → Lặp lại với PIN tiếp theo

## 📊 Progress

```
--- Session 1/100 | PIN: 111111 ---
  → Navigating to wallet app...
  → Clicking "Sign in with Cognito"...
  → Waiting for Cognito login page...
  → Entering email and password...
  → Submitting login...
  → Waiting for redirect to PIN page...
  → Entering PIN: 111111 (first time)...
  → Entering PIN: 111111 (confirm)...
  → Waiting for main app...
  ✓ Login and PIN setup successful
✓ PIN 111111: Extracted successfully
✓ Saved session 1 with PIN 111111

--- Session 2/100 | PIN: 111112 ---
...
```

## 📁 Output

`wallets.json` với 100 wallet configs:

```json
[
  {
    "jwtToken": "eyJ...",
    "ephemeralSecretKey": "suiprivkey1...",
    "randomness": "123...",
    "maxEpoch": 50,
    "zkProof": {...},
    "salt": "0000111111"
  },
  {
    "jwtToken": "eyJ...",
    "ephemeralSecretKey": "suiprivkey1...",
    "randomness": "456...",
    "maxEpoch": 50,
    "zkProof": {...},
    "salt": "0000111112"
  },
  ...
]
```

## ⚙️ Config

Edit trong `collect-sessions.ts`:

```typescript
const WALLET_URL = 'https://zklogin-wallet-wallet.vercel.app/'
const NUM_SESSIONS = 100
const STARTING_PIN = 111111
const COGNITO_EMAIL = 'duongdh@twendeesoft.com'
const COGNITO_PASSWORD = 'Dohaiduong1803@'
```

## 🎬 Headless Mode

Chạy ẩn (không hiện browser):

```typescript
const browser = await chromium.launch({
  headless: true  // Line 200
})
```

## 🔄 Tiếp Theo

```bash
bun run generate  # Generate 1000+ transactions
bun run verify    # Verify results
```

## ⏱️ Timing

- **Per session**: ~9 seconds
- **100 sessions**: ~15 minutes
- **vs Manual**: 3-4 hours → **10x faster!**
