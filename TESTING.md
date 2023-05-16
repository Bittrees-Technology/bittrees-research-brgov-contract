# Setup steps

- Mint some test WBTC on our new test contract (https://goerli.etherscan.io/address/0x26bE8Ef5aBf9109384856dD25ce1b4344aFd88b0). When I minted 1 ETH (1000000000000000000 WEI), it minted a LOT (10,000,000,000 WBTC)! Probably should have divided by 10 ** 10 (since only 8 decimal places instead of 18).

- Upgrade our Equity contract
- Why didn't initializer set up new values?
- So manually added erc20Contract, treasury and mintPrice for both tokens: 0x00 (BTREE) and 0x01 (WBTC Test)


# Testing steps

Deployer wallet public key: 0x7435e7f3e6B5c656c33889a3d5EaFE1e17C033CD

-   Equity contract is at https://goerli.etherscan.io/address/0x81Ed0A98c0BD6A75240fD4F65E5e2c43d7b343D9 to run `mint()` - which points to contract at https://goerli.etherscan.io/address/0x28b5b603cdb94f70d4a6c0fedff24aebc2377ea8#code
-   BTREE ERC-20 contract is at https://goerli.etherscan.io/address/0x1Ca23BB7dca2BEa5F57552AE99C3A44fA7307B5f to mint new BTREE tokens to play with and to run `increaseAllowance` method.

## Testing Minting Equity using BTREE tokens on GOERLI

1. Choose your wallet.

2. As admin on ERC-20, mint your wallet 1000 BTREE tokens (in WEI, so 1000 tokens is 1000000000000000000000 wei) so you have enough to buy an Equity token.

3. Now you have tokens to pay, but need to set your allowance on the ERC-20 to approve Equity contract spending those tokens. Visit the `increaseAllowance()` method on the ERC-20 contract (in WEI, so 1000 tokens is 1000000000000000000000 wei) to the spender (use the contract address of 0x81Ed0A98c0BD6A75240fD4F65E5e2c43d7b343D9). Essentially the logged in wallet is the token owner, and you're granting permissions for spender (the contract) to spend those owner's tokens.

4. Visit the equity contract at https://goerli.etherscan.io/address/0x81Ed0A98c0BD6A75240fD4F65E5e2c43d7b343D9

5. Try to mint 1 equity token with `mint()` -- should succeed as long as you have enough tokens and have approved those tokens to be spent

6. Did it all work?

-   Verify BTREE tokens left users wallet (say, in metamask)
-   Verify treasury wallet received BTREE tokens -- https://goerli.etherscan.io/address/0x7435e7f3e6B5c656c33889a3d5EaFE1e17C033CD
-   Verify user owns an Equity token via `balanceOf()` on Equity contract.

Permissions

-   check `hasRole` using role of `0x0` and address of `0x7435e7f3e6B5c656c33889a3d5EaFE1e17C033CD`
-   verify non-owner wallet can't run setters
-   verify adding a new wallet with role

Withdraw

-   Try withdraw
