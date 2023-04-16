# Testing steps

Deployer wallet public key: 0x7435e7f3e6B5c656c33889a3d5EaFE1e17C033CD

-   Equity Proxy deployed to https://goerli.etherscan.io/address/0x81Ed0A98c0BD6A75240fD4F65E5e2c43d7b343D9
        - which points to contract at https://goerli.etherscan.io/address/0x28b5b603cdb94f70d4a6c0fedff24aebc2377ea8#code

## Testing on GOERLI

-   Equity contract is at https://goerli.etherscan.io/address/0x81Ed0A98c0BD6A75240fD4F65E5e2c43d7b343D9 to run `mintWithBTREE()`
-   BTREE ERC-20 contract is at https://goerli.etherscan.io/address/0x1Ca23BB7dca2BEa5F57552AE99C3A44fA7307B5f to mint new BTREE tokens to play with and to run `increaseAllowance` method.

Scenarios:

1.  Test with a wallet that isn't a contract administrator

2.  Try to mint 1 or more tokens with `mintWithBTREE()` when you don't have any BTREE tokens -- should fail -- can only reject

3.  As admin on ERC-20, mint yourself 1000 BTREE tokens (in WEI, so 1000 tokens is 1000000000000000000000 wei). Should still fail since ERC-20 allowance not set -- can only reject

4.  Now set your allowance on the ERC-20 via - back with your non-Admin wallet, set your own allocation in ERC-20 contract (in WEI, so 1000 tokens is 1000000000000000000000 wei) to the spender (contract) address by calling `increaseAllowance()`. Essentially the logged in wallet is the token owner, and you're granting permissions for spender (the contract) to spend those owner's tokens.

5.  Try to mint with `mintWithBTREE()` - should succeed as long as you have enough tokens and have approved those tokens to be spent

6.  Did it all work?

-   Verify BTREE tokens left users wallet (say, in metamask)
-   Verify treasury wallet received BTREE tokens -- https://goerli.etherscan.io/address/0x7435e7f3e6B5c656c33889a3d5EaFE1e17C033CD
-   Verify user owns an Equity token via `balanceOf()` on Equity contract.

Permissions

-   check `hasRole` using role of `0x0` and address of `0x7435e7f3e6B5c656c33889a3d5EaFE1e17C033CD`
-   verify non-owner wallet can't run setters
-   verify adding a new wallet with role

Withdraw

-   Try withdraw
