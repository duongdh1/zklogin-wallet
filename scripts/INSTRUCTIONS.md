# 📋 Hướng Dẫn Tạo 100 Wallets với 1000+ Transactions

## 🎯 Mục Tiêu

Tạo 1000+ transactions từ 100 wallets khác nhau để gửi cho Sui team yêu cầu TestNet access.

## 📝 Quy Trình

### Bước 1: Tạo 100 Sessions từ Browser

Bạn cần login vào wallet app **100 lần** để lấy 100 session data khác nhau.

#### 1.1. Login lần đầu

```bash
# Chạy wallet app
cd apps/wallet
bun run dev
```

Mở http://localhost:3000 và login.

#### 1.2. Export Session Data

Mở Browser DevTools (F12) → Console, chạy:

```javascript
JSON.stringify({
  jwtToken: sessionStorage.getItem('idToken'),
  ephemeralSecretKey: sessionStorage.getItem('ephemeralSecretKey'),
  randomness: sessionStorage.getItem('randomness'),
  maxEpoch: parseInt(sessionStorage.getItem('maxEpoch') || '0'),
  zkProof: JSON.parse(sessionStorage.getItem('zkProof') || '{}'),
  salt: '0000000001'  // Thay đổi cho mỗi lần: 0000000001, 0000000002, ...
}, null, 2)
```

Copy output và save vào notepad.

#### 1.3. Logout và Repeat

1. **Logout** khỏi wallet
2. **Login lại** (sẽ tạo ephemeral key mới → JWT mới)
3. Chạy lại command ở 1.2 với **salt mới** (`0000000002`, `0000000003`, ...)
4. Lặp lại 100 lần

### Bước 2: Tạo File wallets.json

Gộp tất cả 100 sessions vào 1 array:

```json
[
  {
    "jwtToken": "eyJ... (từ session 1)",
    "ephemeralSecretKey": "suiprivkey1... (từ session 1)",
    "randomness": "123... (từ session 1)",
    "maxEpoch": 50,
    "zkProof": { ... (từ session 1) },
    "salt": "0000000001"
  },
  {
    "jwtToken": "eyJ... (từ session 2)",
    "ephemeralSecretKey": "suiprivkey1... (từ session 2)",
    "randomness": "456... (từ session 2)",
    "maxEpoch": 50,
    "zkProof": { ... (từ session 2) },
    "salt": "0000000002"
  },
  ...
  {
    "jwtToken": "eyJ... (từ session 100)",
    "ephemeralSecretKey": "suiprivkey1... (từ session 100)",
    "randomness": "789... (từ session 100)",
    "maxEpoch": 50,
    "zkProof": { ... (từ session 100) },
    "salt": "0000000100"
  }
]
```

Lưu vào: `scripts/wallets.json`

### Bước 3: Chạy Script Generate Transactions

```bash
cd scripts
bun run multi
```

Script sẽ:
- ✅ Load 100 wallet configs
- ✅ Request faucet cho tất cả
- ✅ Execute round-robin transfers
- ✅ Generate 1000+ transactions
- ✅ Save kết quả vào `transaction-reports/transactions-*.json`

## ⚡ Tips để Nhanh Hơn

### Auto-Export Script

Tạo bookmarklet để export nhanh:

```javascript
javascript:(function(){
  const salt = prompt('Enter salt (e.g., 0000000001):');
  const data = {
    jwtToken: sessionStorage.getItem('idToken'),
    ephemeralSecretKey: sessionStorage.getItem('ephemeralSecretKey'),
    randomness: sessionStorage.getItem('randomness'),
    maxEpoch: parseInt(sessionStorage.getItem('maxEpoch') || '0'),
    zkProof: JSON.parse(sessionStorage.getItem('zkProof') || '{}'),
    salt: salt
  };
  console.log(JSON.stringify(data, null, 2));
  alert('Session data copied to console!');
})();
```

Tạo bookmark với URL = code trên, mỗi lần login click bookmark là export ngay.

### Parallel Sessions

Mở **nhiều browser profiles/windows** để login đồng thời:
- Chrome Profile 1: Wallets 1-10
- Chrome Profile 2: Wallets 11-20
- Firefox: Wallets 21-30
- Edge: Wallets 31-40
- ...

## 🔍 Kiểm Tra File wallets.json

```bash
# Đếm số wallets
cat wallets.json | grep -c "jwtToken"

# Validate JSON format
bun run check-wallets
```

## 📊 Ước Tính Thời Gian

- **Manual login**: ~2 phút/session → 100 sessions = **3-4 giờ**
- **Script execution**: 1000 transactions ÷ 100 wallets × 1.5s = **~25 phút**
- **Tổng**: **~4 giờ**

## ✅ Output Format

File `transactions-*.json` sẽ có format:

```json
[
  {
    "address": "0x8581ca1b...",
    "txDigests": [
      "AbCdEf123...",
      "GhIjKl456...",
      ...
    ]
  },
  ...
]
```

→ Gửi file này cho Sui team! 🚀

## 🆘 Troubleshooting

### Lỗi: "JWT expired"
- JWTs hết hạn sau 1 giờ
- Phải collect tất cả 100 sessions trong 1 giờ HOẶC
- Update maxEpoch để có thời gian chạy script

### Lỗi: "Nonce mismatch"
- Mỗi session phải có ephemeralKey + randomness + zkProof riêng
- Không được reuse session data

### Lỗi: "Faucet rate limit"
- Script tự động delay 2s giữa các requests
- Nếu vẫn lỗi, tăng delay trong code

---

**Chúc may mắn! 🎉**
