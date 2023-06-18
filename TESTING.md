# Testing steps

Deployer wallet public key: 0x7435e7f3e6B5c656c33889a3d5EaFE1e17C033CD

-   BRGOV test proxy contract is at https://goerli.etherscan.io/address/0x873Ac694eFeb2Ee5918AACE9699b4E3f3732514E to run `mint()` - which points to contract at https://goerli.etherscan.io/address/0x81be8114951268803584ab9e194bcc85cfdee976
-   BTREE test ERC-20 contract is at https://goerli.etherscan.io/address/0x1Ca23BB7dca2BEa5F57552AE99C3A44fA7307B5f to mint new BTREE tokens to play with and to run `increaseAllowance` method.
-   WBTC test ERC-20 contract is at https://goerli.etherscan.io/address/0x26bE8Ef5aBf9109384856dD25ce1b4344aFd88b0 to mint new WBTC tokens to play with and to run `increaseAllowance` method.

## Testing Minting Equity using BTREE tokens on GOERLI

1. Choose your wallet.

2. As admin on ERC-20, mint your wallet 1000 BTREE tokens (in WEI, so 1000 tokens is 1000000000000000000000 wei) so you have enough to buy an Equity token.

3. Now you have tokens to pay, but need to set your allowance on the ERC-20 to approve Equity contract spending those tokens. Visit the `increaseAllowance()` method on the ERC-20 contract (in WEI, so 1000 tokens is 1000000000000000000000 wei) to the spender (use the test proxy contract address of 0x81Ed0A98c0BD6A75240fD4F65E5e2c43d7b343D9). Essentially the logged in wallet is the token owner, and you're granting permissions for spender (the contract) to spend those owner's tokens.

4. Visit the equity contract at https://goerli.etherscan.io/address/0x873Ac694eFeb2Ee5918AACE9699b4E3f3732514E

5. Try to mint 1 equity token with `mint()` -- should succeed as long as you have enough tokens and have approved those tokens to be spent

6. Did it all work?

-   Verify BTREE tokens left users wallet (say, in metamask)
-   Verify treasury wallet received BTREE tokens -- https://goerli.etherscan.io/address/0x7435e7f3e6B5c656c33889a3d5EaFE1e17C033CD
-   Verify user owns an Equity token via `balanceOf()` on Equity contract.

## Testing Minting Equity using WBTC tokens on GOERLI

1. Choose your wallet.

2. As admin on ERC-20 (test WBTC at https://goerli.etherscan.io/address/0x26bE8Ef5aBf9109384856dD25ce1b4344aFd88b0), mint tokens to test wallet so you have enough WBTC to buy an BRGOV token. `0.001 WBTC per BRGOV` token. Which should be 0x100000 (since decimals are 8) WBTC.

3. Now you have tokens to pay, but need to set your allowance on the ERC-20 to approve BRGOV contract spending those tokens. Visit the `increaseAllowance()` method on the ERC-20 contract (use `100000`) to the spender (use the BRGOV test proxy contract address of `0x873Ac694eFeb2Ee5918AACE9699b4E3f3732514E`). Essentially the logged in wallet is the token owner, and you're granting permissions for spender (the contract) to spend those owner's tokens.

From WBTC repo, run:

```
$ npx hardhat console --network testnet
> await ethers.provider.listAccounts();
> const Contract = await ethers.getContractFactory('WBTC');
> const contract = await Contract.attach('0x26bE8Ef5aBf9109384856dD25ce1b4344aFd88b0')
> await contract.increaseAllowance('0x873Ac694eFeb2Ee5918AACE9699b4E3f3732514E', '0x100000')
> await contract.allowance('0x7435e7f3e6B5c656c33889a3d5EaFE1e17C033CD','0x873Ac694eFeb2Ee5918AACE9699b4E3f3732514E')
```

4. Visit the BRGOV proxy contract at https://goerli.etherscan.io/address/0x873ac694efeb2ee5918aace9699b4e3f3732514e and try to mint 1 BRGOV token with `mint()` -- should succeed as long as you have enough tokens and have approved those tokens to be spent

```
$ npx hardhat console --network testnet
> await ethers.provider.listAccounts();
> const Contract = await ethers.getContractFactory('BRGOV');
> const contract = await Contract.attach('0x873Ac694eFeb2Ee5918AACE9699b4E3f3732514E');
> await contract.mintPrice('0x1');
> await contract.mint('0x1', '0x7435e7f3e6B5c656c33889a3d5EaFE1e17C033CD', '0x1');
```

5. Did it all work?

-   Verify WBTC tokens left users wallet (say, in metamask)
-   Verify treasury wallet received WBTC tokens -- https://goerli.etherscan.io/address/0x7435e7f3e6B5c656c33889a3d5EaFE1e17C033CD
-   Verify user owns an BRGOV token via `balanceOf()` on proxy contract.

Permissions

-   check `hasRole` using role of `0x0` and address of `0x7435e7f3e6B5c656c33889a3d5EaFE1e17C033CD`
-   verify non-owner wallet can't run setters
-   verify adding a new wallet with role

Withdraw

-   Try withdraw
