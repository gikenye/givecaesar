
# Caesar

Send batch ETH transations to your friends with ease.
## Highlights

- Send ETH/ERC20 to multiple recipients in one operation
- Wallet integration via Reown AppKit + wagmi
- Upgradeable `FundNPC` Solidity contract with a 0.1% fee small fee mechanism

## Quick start

```bash
pnpm install
NEXT_PUBLIC_PROJECT_ID=<your_reown_project_id> pnpm dev
```

Open http://localhost:3000 and connect your wallet.

## Contracts

Contract source: `contracts/FundNPC.sol` — supports equal and custom splits for ETH and ERC20 tokens.

## License

MIT
