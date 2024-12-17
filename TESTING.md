# Testing steps

Deployer wallet public key: 0x7435e7f3e6B5c656c33889a3d5EaFE1e17C033CD

Base Sepolia testnet is used for testing. The following addresses are used:

-   BRGOV Proxy: https://sepolia.basescan.org/address/0x3b66BDdd1FfA50B3F816D8398e55B7FF269a7a42
-   BTREE (ERC-20): https://sepolia.basescan.org/address/0xCa6f24a651bc4Ab545661a41a81EF387086a34C2
-   WBTC (ERC-20): https://sepolia.basescan.org/address/0x5beB73bc1611111C3d5F692a286b31DCDd03Af81

## Contact Setup

Use values from Etherum Mainnet contact: <https://etherscan.io/address/0x1a8b6b0f57876f5a1a17539c25f9e4235cf7060c>

Follow steps in `README.md` in `**Second, Interact with your Contract**` section to setup the contract settings, starting with:

```javascript
const Contract = await ethers.getContractFactory('BRGOV');
const contract = await Contract.attach(
    '0x3b66BDdd1FfA50B3F816D8398e55B7FF269a7a42'
); // base sepolia
```

## Pre-testing

Mint and send test BTREE and WBTC to a test wallet: 0x458788Af51027917462c87AA6959269249CE8B4c

Values to use:

-   1000 BTREE in WEI is: 1000000000000000000000 == `10 ** 18 * 1000`
-   0.001 WBTC per BRGOV token is 100000 == `10 ** 8 * .001`

NOTE that there are now 3 denominations of tokens (1, 10, 100), 2 currencies (BTREE and WBTC).

Grant 555000 BTREE (555000000000000000000000) to test wallet for three scenarios below.
Grant 0.555 WBTC (55500000) to test wallet for three scenarios below.

## Testing Minting BRGOV using BTREE tokens on GOERLI

1. Choose your test wallet.

2. On BTREE ERC-20 contact grant allowance to transfer tokens to the sender. The sender is BRGOV proxy contract. Visit the `increaseAllowance()` method on the ERC-20 contract (in WEI, so 1000 tokens is 1000000000000000000000 wei) and grant allowance to spender.

3. Mint some tokens via the BRGOV contract

4. Try to mint:

    - 5000 BTREE: a "denomination of 1" token with `mint()` with quantity of 5
    - 50000 BTREE: a "denomination of 10" token with `mintTen()` with quantity of 5
    - 500000 BTREE a "denomination of 100" token with `mintHundred()` with quantity of 5

Steps:

-   See if you can mint without allowance set. You should see `error: ProviderError: execution reverted: Insufficient allowance`
-   Then set allowance and try again.

Details:

```shell
cd contract
npx hardhat console --network testnet
```

```javascript
const Contract = await ethers.getContractFactory('BRGOV');
const contract = await Contract.attach(
    '0x14dBB93a78B5e89540e902d1E6Ee26C989e08ef0'
);

// mint 5 BRGOV-1 tokens via BTREE (0x0)
await contract.mint('0x0', '0x458788Af51027917462c87AA6959269249CE8B4c', '5');

// mint 5 BRGOV-10 tokens via BTREE (0x0)
await contract.mintTen(
    '0x0',
    '0x458788Af51027917462c87AA6959269249CE8B4c',
    '5'
);

// mint 5 BRGOV-100 tokens via BTREE (0x0)
await contract.mintHundred(
    '0x0',
    '0x458788Af51027917462c87AA6959269249CE8B4c',
    '5'
);

// get balance of test account for BRGOV-10 token 1000000000003
await contract.balanceOf(
    '0x458788Af51027917462c87AA6959269249CE8B4c',
    '1000000000003'
);
```

5. Did it all work?

-   Verify BTREE tokens left users wallet
-   Verify treasury wallet received BTREE tokens
-   Verify user owns BRGOV tokens via `balanceOf()` on BRGOV contract.

## Testing Minting Equity using WBTC tokens on GOERLI

1. Choose your test wallet.

2. On BTREE ERC-20 contact grant allowance to transfer tokens to the sender. The sender is BRGOV proxy contract. Visit the `increaseAllowance()` method on the ERC-20 contract and grant allowance to spender.

3. Mint some tokens via the BRGOV contract

4. Try to mint:

    - .005 WBTC (500000): a "denomination of 1" token with `mint()` with quantity of 5
    - .05 WBTC (5000000): a "denomination of 10" token with `mintTen()` with quantity of 5
    - .5 WBTC (50000000): a "denomination of 100" token with `mintHundred()` with quantity of 5

Steps:

-   See if you can mint without allowance set. You should see `error: ProviderError: execution reverted: Insufficient allowance`
-   Then set allowance and try again.

Details:

```shell
cd contract
npx hardhat console --network testnet
```

```javascript
const Contract = await ethers.getContractFactory('BRGOV');
const contract = await Contract.attach(
    '0x14dBB93a78B5e89540e902d1E6Ee26C989e08ef0'
);

// mint 5 BRGOV-1 tokens via WBTC (0x1)
await contract.mint('0x1', '0x458788Af51027917462c87AA6959269249CE8B4c', '5');

// mint 5 BRGOV-10 tokens via WBTC (0x1)
await contract.mintTen(
    '0x1',
    '0x458788Af51027917462c87AA6959269249CE8B4c',
    '5'
);

// mint 5 BRGOV-100 tokens via WBTC (0x1)
await contract.mintHundred(
    '0x1',
    '0x458788Af51027917462c87AA6959269249CE8B4c',
    '5'
);

// get balance of test account for BRGOV-10 token 1000000000003
await contract.balanceOf(
    '0x458788Af51027917462c87AA6959269249CE8B4c',
    '1000000000003'
);
```

5. Did it all work?

-   Verify WBTC tokens left users wallet
-   Verify treasury wallet received WBTC tokens
-   Verify user owns BRGOV tokens via `balanceOf()` on BRGOV contract.

Permissions

-   check `hasRole` using role of `0x0` and address of `0x7435e7f3e6B5c656c33889a3d5EaFE1e17C033CD`
-   verify non-owner wallet can't run setters
-   verify adding a new wallet with role

Withdraw

-   Try withdraw
