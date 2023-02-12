# viem-bloom-filter

Add ALCHEMY_ID to .env

```bash
pnpm i
pnpm run start
```

Log example

```bash
39204115~0xff5546cf50e4d68e2b280b8c8038ee4b1c2f4d9f1db22774c9603d4d014bb9f5 - TP: Updated reserves for 2 pairs (4 was unnecessary). 
39204116~0x6124ed137c4bb44ce7f1aa2c2a5b45c1135c6bf0146370d3a9c6702d2cf913da - FP: Unnecessary call, 6 pairs.
39204117~0xfcd8c7964218d66810054e6ec12e6aa6c4f14f260301cea77d3ad19f3e0d0c70 - FP: Unnecessary call, 2 pairs.
39204118~0xd69a12b594ed6b8169d306b11aab8daa6a4ee0f6f9dbeceddcc2f23813e77443 - TP: Updated reserves for 1 pairs (7 was unnecessary). 
*** STATS: 200 blocks processed, neededRpcsCalls: 42, unnecessaryRpcCalls: 106.
39204119~0x694efce9881c505d2afebaceb8919899a057609ca34c290a4af2ea0ed7f4142f - FP: Unnecessary call, 3 pairs.
39204120~0x28c7bf83a3ea070a7ad86ec418dfc0c93be1ad2af882e1d7cd1636ee3bf5d25c - FP: Unnecessary call, 4 pairs.
39204121~0xff8ec0b9c3232e9347ff2f85c53259d0b79f08db07d8d765fb551f27e9e143bc - FP: Unnecessary call, 1 pairs.
```
