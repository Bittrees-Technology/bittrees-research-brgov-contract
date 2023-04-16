# Testing steps

Deployer wallet public key: 0x7435e7f3e6B5c656c33889a3d5EaFE1e17C033CD

-   Equity contract is at https://goerli.etherscan.io/address/0x81Ed0A98c0BD6A75240fD4F65E5e2c43d7b343D9 to run `mintWithBTREE()` - which points to contract at https://goerli.etherscan.io/address/0x28b5b603cdb94f70d4a6c0fedff24aebc2377ea8#code
-   BTREE ERC-20 contract is at https://goerli.etherscan.io/address/0x1Ca23BB7dca2BEa5F57552AE99C3A44fA7307B5f to mint new BTREE tokens to play with and to run `increaseAllowance` method.

## Testing Minting Equity using BTREE tokens on GOERLI

1. Choose your wallet.

2. As admin on ERC-20, mint your wallet 1000 BTREE tokens (in WEI, so 1000 tokens is 1000000000000000000000 wei) so you have enough to buy an Equity token.

3. Now you have tokens to pay, but need to set your allowance on the ERC-20 to approve Equity contract spending those tokens. Visit the `increaseAllowance()` method on the ERC-20 contract (in WEI, so 1000 tokens is 1000000000000000000000 wei) to the spender (use the contract address of 0x81Ed0A98c0BD6A75240fD4F65E5e2c43d7b343D9). Essentially the logged in wallet is the token owner, and you're granting permissions for spender (the contract) to spend those owner's tokens.

4. Visit the equity contract at https://goerli.etherscan.io/address/0x81Ed0A98c0BD6A75240fD4F65E5e2c43d7b343D9

5. Try to mint 1 equity token with `mintWithBTREE()` -- should succeed as long as you have enough tokens and have approved those tokens to be spent

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
