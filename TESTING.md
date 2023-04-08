# Testing steps

## GOERLI

Deployer wallet public key: 0x7435e7f3e6B5c656c33889a3d5EaFE1e17C033CD
OpenZeppelin Proxy deployed to 0xe0a513F4519386B26848BD8CBE39a800391a3Dbe

CONTACT: 0x6e8c260cB878489c8066Dd75536e5E9B5ca4C288

Set Mint Price a bit cheaper to 0.001 ETH: 1000000000000000

Mint Membership (Token 1) with 0.001 ETH to address: 0x7435e7f3e6B5c656c33889a3d5EaFE1e17C033CD

Check balance with `balanceOf` token 1

Check Token 1 expiration via `expirationTimestamps` and run in browser console via `new Date(timestamp * 1000)` and `isExpired` should also be false

Test gating via paragraph.xyz? Says supports ERC721 and ERC20 -- not 1155?

Test Expiration

-   Try expiration -- set it to nearby future (3 min from now) -- e.g. `Math.floor(Date.now()/1000) + 180` and query `isExpired`. Then try `balanceOf` to see owner no longer has that token since expired.

-   Test setting a longer expiration, then minting, then double-check date

Test URI

-   try `setURI` to `ipfs://cid/{id}`
-   try `uri` to see results come back

Permissions

-   check `hasRole` using role of `0x0` and address of `0x7435e7f3e6B5c656c33889a3d5EaFE1e17C033CD`
-   verify non-owner wallet can't run setters
-   verify adding a new wallet with role

Withdraw

-   Try withdraw

Test Minting Site at https://builders-advocacy-group.netlify.app

## MAINNET

### IPFS

Upload files to IPFS and test.

### DEPLOY

Deploy to `mainnet`

        npx hardhat run --network mainnet scripts/deploy.js

Deploy wallet balance: 0.12577493580778607
Deployer wallet public key: 0x7435e7f3e6B5c656c33889a3d5EaFE1e17C033CD
OpenZeppelin Proxy deployed to 0x6e8c260cB878489c8066Dd75536e5E9B5ca4C288

Implementation contract: 0xca6f24a651bc4ab545661a41a81ef387086a34c2
ProxyAdmin: https://etherscan.io/address/0xe4249d51593d590fb5120f48e2dabc36a550f698

        npx hardhat verify --network mainnet 0xca6f24a651bc4ab545661a41a81ef387086a34c2

### Setup Defender for contract Upgrades

-   Setup Defender: https://docs.openzeppelin.com/defender/guide-upgrades
-   Make sure `.env` has proper DEFENDER API keys
-   Transfer ProxyAdmin contract (`0xe4249d51593d590fb5120f48e2dabc36a550f698`) to Multisig Safe address of `eth:0x41Be6bDB81695c44631162e906Ba19e5233D3144` by updating `transfer-ownership.js` script to have proper Safe address, then run `npx hardhat run --network mainnet scripts/transfer-ownership.js`
