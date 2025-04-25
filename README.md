# Bittrees Research (BRGOV) Equity Contract

## MAINNET: Ethereum

-   BNote Proxy - https://etherscan.io/address/0xf1AAfFc982B5F553a730a9eC134715a547f1fe80
-   BNote Contact - https://etherscan.io/address/0x05817107460e6a3B0B719171fDe700f7eFe4E8F5
-   ProxyAdmin - https://etherscan.io/address/0x9561a4d6006aa6148b343a9afddf9591acc6abdf
-   BTREE - https://etherscan.io/address/0x6bDdE71Cf0C751EB6d5EdB8418e43D3d9427e436

## TESTNET: Sepolia

-   BNote Proxy - https://sepolia.etherscan.io/address/0xf1AAfFc982B5F553a730a9eC134715a547f1fe80
-   BNote Contact - https://sepolia.etherscan.io/address/0x05817107460e6a3B0B719171fDe700f7eFe4E8F5

## MAINNET: Base

-   BNote Proxy - https://basescan.org/address/0xf1AAfFc982B5F553a730a9eC134715a547f1fe80
-   ProxyAdmin - https://basescan.org/address/0x3b66bddd1ffa50b3f816d8398e55b7ff269a7a42
-   cbBTC contract: https://basescan.org/token/0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf
-   BTREE: https://basescan.org/address/0x4aCFF883f2879e69e67B7003ccec56C73ee41F6f

## TESTNET: Base Sepolia

-   BNote Proxy - https://sepolia.basescan.org/address/0xf1AAfFc982B5F553a730a9eC134715a547f1fe80
-   ProxyAdmin - https://sepolia.basescan.org/address/0x3ed570c2917EC8bEa558174697F28B24fc09ec09
-   BTREE - https://sepolia.basescan.org/address/0xCa6f24a651bc4Ab545661a41a81EF387086a34C2

![Solidity tests](https://github.com/Bittrees-Technology/bittrees-research-brgov-contract/actions/workflows/continuous-integration.yaml/badge.svg)

Bittrees Research (BNote) Preferred Stock Contract (based on ERC-1155 upgradable)

Includes:

-   configuration for deploying to any EVM chain
-   suite of tests
    -   run tests locally (via `npm test`)
    -   use [Chai matchers from Waffle](https://ethereum-waffle.readthedocs.io/en/latest/matchers.html) (instead of OpenZeppelin Test Helpers)
    -   includes Github Action to run tests
    -   run gas report
    -   run code coverage report
-   generates TypeScript bindings via TypeChain (in `contract/typechain-types`)
-   monorepo-ready -- all contract code and tools are in `./contract` to make it easy to add UI or other pieces
-   solhint linter config (and then install plugin for your editor that supports solhint syntax highlighting)
-   format files with Prettier (`npm run style`)
-   turn on Solidity optimization (1000 means optimize for more high-frequency usage of contract). [Compiler Options](https://docs.soliditylang.org/en/v0.7.2/using-the-compiler.html#input-description)
-   add hardhat-etherscan for verifying contracts on PolygonScan (or Etherscan), which means uploading the source code so it's available for contract users to view/verify. For more info see [hardhat-etherscan plugin](https://hardhat.org/plugins/nomiclabs-hardhat-etherscan.html).
-   in VSCode, optionally run your whole environment in a Docker container (config in `.devcontainer`). Learn more about [VSCode: Remote Development in Containers](https://code.visualstudio.com/docs/remote/containers-tutorial)

## Getting Started

Install dependencies and run tests to make sure things are working.

    cd contract
    npm install
    npm run test:ci -or- npm test

    npm run test:gas    # to also show gas reporting
    npm run test:coverage   # to show coverage, details in contract/coverage/index.html

## Deploying

Deploying an upgradeable contract is a bit more complex and 3 contracts are required on initial deploy.

There are two deploy scenarios:

-   First-time deploy of all 3 contracts.
-   Subsequent upgrades of just your 1 contract.

### First setup configuration and fund your wallet

-   copy `.env.sample` to `.env`. Then view and edit `.env` for further instructions on configuring your RPC endpoints, private key and Etherscan API key.
-   for deploys to testnet, ensure your wallet account has some test currency to deploy. For example, on Polygon you want test MATIC via <https://faucet.polygon.technology/> For local testing, Hardhat already provides test currency for you on the local chain.

### Deploy to Testnet

Scenario 1: First-time deploy of all 3 contracts (Proxy, Admin and your actual contract)

-   cd contract
-   deploy via `npx hardhat run --network testnet scripts/deploy.js`
-   once deployed, you'll see `Deployer wallet public key`. Head over to Etherscan (or Polygonscan) and view that account. You'll see 3 contracts recently deployed.
    1.  The first chronologically deployed contract is yours (example: https://mumbai.polygonscan.com/address/0xc858c56f9137aea2508474aa17658de460febb7d#code). Let's call this `CONTRACT_ADDRESS`.
    2.  The second contract is called "ProxyAdmin" (example: https://mumbai.polygonscan.com/address/0xec34f10619f7c0cf30d92d17993e10316a01c884#code).
    3.  The third is called "TransparentUpgradeableProxy" (example: https://mumbai.polygonscan.com/address/0xbf1774e5ba0fe942c7498b67ff93c509b723eb67#code) and this is the address that matches the `OpenZeppelin Proxy deployed to` in the output after running the deploy script. Let's call this `PROXY_ADDRESS`.
-   upload source code so others can verify it on-chain via `npx hardhat verify --network testnet CONTRACT_ADDRESS`. Head back to Etherscan or Polygonscan and view #1 again. You should now see actual source code in the contract.
-   `PROXY_ADDRESS` is that actual address used to interact with the contract, view on OpenSea, etc.
    -   you can interact manually via the console -- see [Playing with Contract](#playing-with-contract) below
    -   you can interact with on Etherscan or Polygonscan
-   **IMPORTANT** You'll notice new files in `.openzeppelin` folder. It's important you keep these files and check them into the repository. They are required for upgrading the contract.

Scenario 2: Upgrade your contract

If you upgrade contract without making any changes, the system will continue to use currently deployed version.

-   cd contract
-   update `UPGRADEABLE_PROXY_ADDRESS` environment variables in `.env` and set to the `PROXY_ADDRESS` from above. This is always the Proxy contract address which doesn't change. Only the `CONTACT_ADDRESS` changes when upgrading.
-   upgrade via `npx hardhat run --network testnet scripts/deploy-upgrade.js`
-   find the newly deployed contract (`CONTRACT_ADDRESS`) from steps above. You'll find the newest contract recently deployed by the deployer wallet labeled as "Contract Creation".
-   upload source code so others can verify it on-chain via `npx hardhat verify --network testnet CONTRACT_ADDRESS`. Head back to Etherscan or Polygonscan and view #1 again. You should now see actual source code in the contract.
-   `PROXY_ADDRESS` is that actual address used to interact with the contract, view on OpenSea, etc.
    -   you can interact manually via the console -- see [Playing with Contract](#playing-with-contract) below
    -   you can interact with on Etherscan or Polygonscan
-   **IMPORTANT** You'll notice changed files in `.openzeppelin` folder. It's important you keep these files and check them into the repository. They are required for upgrading the contract.

## Upgrading Contract with OpenZeppelin Defender

First, set transfer ProxyAdmin to Gnosis Safe -- update `scripts/transfer-ownership.js` with Safe address.

    npx hardhat run --network testnet scripts/transfer-ownership.js

Second, propose upgrade:

    npx hardhat run --network testnet scripts/propose-upgrade.js

This will create the new implementation contract (under the deployer wallet), which you can verify:

    # for example:
    npx hardhat verify --network testnet 0xB715b1824fd05044F773a9f72E44d3ca0c123461

Lastly, go into Defender and approve upgrade.

### Deploy to Mainnet

If you're happy with everything after testing locally and on testnet, it's time to deploy to production on Mainnet.

Use same instructions above for deploying to testnet but use `--network mainnet` command option instead.

<a id="playing-with-contract"></a>

### Playing with Contract

You can interact with the contract directly in two ways:

1. on Etherscan or Polygonscan
2. You can interact with your contract in real-time via the Hardhat console.

    1. First you connect to your contract
    2. Then you interact with your contract

If you want to go the console route:

**First, Connect to your Contract**

_Running console session on testnet_

1. If you deployed contract to testnet, find your contract address, then just run `npx hardhat console --network testnet`.
2. Jump down to the example interactive console session.

_Running console session on mainnet_

1. If you deployed contract to mainnet, find your contract address, then just run `npx hardhat console --network mainnet`.
2. Jump down to the example interactive console session.

**Second, Interact with your Contract**

Now that you've connected to your contract above via `hardhat console`, let's play with it.

To configure the contract:

```javascript
// first let's ensure we have the right wallet
// run `listAccounts`
// - if you're running on local hardhat you'll see a bunch of accounts created
// - if you're interacting with a contract on testnet or mainnet and you should see your public wallet account (the match for your private key in your `.env` file)
await ethers.provider.listAccounts();

const Contract = await ethers.getContractFactory('BRGOV');
const contract = await Contract.attach('<proxy contract address goes here>');

// set these to the contract addresses you want to use
await contract.setERC20Contract(
    '0x0',
    '0x4DE534be4793C52ACc69A230A0318fF1A06aF8A0'
); // BTREE
await contract.setERC20Contract(
    '0x1',
    '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf'
); // WBTC

//
// these are just for reference, already set by default when contract deployed
//
await contract.setBaseURI(
    'ipfs://QmbAXCWwNfZmqCwvuKhVpK3FQ3vE813wWZgVcxfM88QUne/'
);
await contract.setMintPrice('0x0', '1000000000000000000000'); // 1000 BTREE
await contract.setMintPrice('0x1', '100000'); // 0.001 WBTC
await contract.setTreasuryAddress(
    '0x0',
    '0x2F8f86e6E1Ff118861BEB7E583DE90f0449A264f'
); // BTREE
await contract.setTreasuryAddress(
    '0x1',
    '0x2F8f86e6E1Ff118861BEB7E583DE90f0449A264f'
); // WBTC
```

## Check out your NFT on OpenSea

Head over to Etherscan or Polygonscan, find your `CONTRACT_ADDRESS`, click "contact" then "write", and run the `mintItem` function to mint a new NFT. Use `0.001` for price (has to be >= mintPrice) and the public wallet address of who will be getting the NFT.

If deployed on Polygon's Mumbai (testnet) you can view by going to https://testnets.opensea.io/assets and filter by MUMBAI chain. You'll see your NFT. Here's an example [query](https://testnets.opensea.io/assets?search[chains][0]=MUMBAI&search[query]=0xc858C56F9137aEA2508474AA17658dE460Febb7d&search[resultModel]=ASSETS).

Which then has a link to the "Unidentified contract - 2l2TWfgZSS" OpenSea collection at https://testnets.opensea.io/collection/unidentified-contract-2l2twfgzss
