# 🚀 zkLogin Transaction Generator

Generate 1000+ Sui DevNet transactions from 100 unique zkLogin wallets.

## 📋 Quick Start

### 1. Prepare Wallet Configs

Create `wallets.json` with 100 wallet configurations. Each wallet needs:

```json
[
  {
    "jwtToken": "eyJ...",
    "ephemeralSecretKey": "suiprivkey1...",
    "randomness": "123...",
    "maxEpoch": 50,
    "zkProof": { 
      "proofPoints": {...},
      "issBase64Details": {...},
      "headerBase64": "..."
    },
    "salt": "0000000001"
  },
  ...
]
```

### 2. Run Generator

```bash
bun run generate
```

### 3. Verify Results

```bash
bun run verify transaction-reports/transactions-*.json
```

## 📚 Detailed Instructions

See [INSTRUCTIONS.md](./INSTRUCTIONS.md) for step-by-step guide on collecting 100 wallet sessions.

## 📁 Files

- **generate-multi-jwt.ts** - Main script to generate transactions
- **verify-transactions.ts** - Verify transactions on-chain
- **wallets.json** - Your 100 wallet configurations (create this)
- **INSTRUCTIONS.md** - Detailed setup guide

## 🎯 Output

Script generates `transaction-reports/transactions-<timestamp>.json`:

```json
[
  {
    "address": "0x8581ca1b...",
    "txDigests": ["AbCdEf...", "GhIjKl...", ...]
  },
  ...
]
```

Submit this file to Sui team for TestNet access approval.

## ⚙️ Configuration

Edit constants in `generate-multi-jwt.ts`:

- `TOTAL_TRANSACTIONS` - Target number of transactions (default: 1000)
- `TRANSFER_AMOUNT` - Amount per transfer in MIST (default: 1 SUI)
