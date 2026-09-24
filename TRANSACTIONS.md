# Testnet Transactions

Network: Base Sepolia  
Chain ID: 84532  
Token: zkUSD

## Accounts

### business-a
- ZK address: `zka93f15c591494e48fa608076c7399913550b1851f1f91d7cf3c7fadda38a3b50`
- Controller: `0x8C118cA64A2aF4d97FC355a8e4F7445512E81C1C`

### business-b
- ZK address: `zk8214c1830836a4c9c00fc65e4584b64bbc958ee3d80791a20e57373b435ace3f`
- Controller: `0x8186e4449f0843bAfe23dA81a95a225f7bcD5B99`

### Plain EVM recipient
- Address: `0x0337F2578854772EEf152c48B7AD18A68B83b7f7`

## Registration

business-a:
`0x450297a6d162df92c587f5f4fdee7a4f1c7457e60daf6bc23ce44a4cd6991a1a`

business-b:
`0x10d619e500b2c29a9561589a2dba08d7b535b0f1e0b0e0001c5a96630fcbd23a`

## Faucet

Faucet user operation hash:
`0x31016a78ddff44c1c2624b5c87a03631b82934fc530adff26f3c61061f74c420`

Result:
- business-a public balance: 100 zkUSD

## Public to encrypted

Amount: 100 zkUSD

Transaction hash:
`0x41143a4a5cdb3488010c1f2c8f19cae77685ce2ab724772011e33460dba90940`

Verified result:
- business-a public: 0 zkUSD
- business-a encrypted: 100 zkUSD

## Encrypted transfer

business-a -> business-b  
Amount: 25 zkUSD

Transaction hash:
`0x4fd98f67da7cbb2ff2b6d88e895072d99ecb03ca6af34ea20a66f2476c43f010`

Verified result:
- business-a encrypted: 75 zkUSD
- business-b encrypted: 25 zkUSD

## Encrypted to public EVM

business-b -> plain EVM recipient  
Amount: 10 zkUSD

Transaction hash:
`0x55d1068073caef7ee5332be117ff2e057887a36b0926bd16d36ac08f2585f142`

## Final verified balances

- business-a encrypted: 75 zkUSD
- business-b encrypted: 15 zkUSD
- plain EVM recipient public: 10 zkUSD
