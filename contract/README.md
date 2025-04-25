# Bittrees Research Preferred Stock - BNote contract

This contract is made to be deployed from the Bittrees Technology Gnosis Safe Multisig 
via the Gnosis Create2 Factory to ensure the implementation and proxy contracts have the
same contract address across all EVM network.

### Project Installation and Configuration:
1. install the packages using `npm install`
2. compile the contracts using `npx hardhat compile`
3. run the tests using `npx hardhat test`
4. copy the env sample and fill in the needed missing values `cp ./.env.sample .env`
   - input the `RPC URLs` for any chains you intend to use (some may need to be added to the `hardhat.config.ts` too) 
   - input the `ETHERSCAN`, `BASESCAN`, etc API keys for any chains on which you intend to verify contract deployments
   - set `PROPOSE_TX=true` and `USE_LEDGER=true` for official deployments or interactions with existing official contracts (including official testnet deployments)

Now you should be ready to run various scripts/plugins to deploy, configure, upgrade, and verify the contracts.

## NB:
Intended use of this project is to set `PROPOSE_TX=true` and `USE_LEDGER=true`.

### Details:
- `PROPOSE_TX=true` -> This sets the behavior so that any scripts which create a transaction attempt to 
sign it and then submit it to the configured Gnosis Safe for approval/execution. Such scripts will output
a link to the safe once the transaction is proposed so you can easily check the success and share the link 
with other signers on the safe
- `PROPOSE_TX=false` -> This instead logs the unsigned transactions to the console so they can be copied/pasted and
sent from any other valid sender of that transaction once they sign
- `USE_LEDGER=true` -> When a script attempts to sign the transaction, it will ask you to sign on your
ledger device. This requires `LEDGER_ADDRESS` to be the address you want to sign with on your ledger
- `USE_LEDGER=false` -> When a script attempts to sign a transaction, it will use the `PRIVATE_KEY` to sign

## Deployment steps:
1. `npx hardhat compile` <- ensure you've compiled the latest changes
2. `npx hardhat test` <- ensure all the tests are passing (and appropriate tests have been added)
3. `npx hardhat run scripts/deployBNote.ts --network {network-name}` <- expected/configured network names can be found in the hardhat.config.ts
4. `npx hardhat verify --network {network-name} {implementation-contract-address}` <- verify the implementation contract code on appropriate block explorers for the network
5. `npx hardhat verify --network {network-name} {proxy-contract-address} --constructor-args deployments/proxy-args.ts` <- verify the proxy contract code on appropriate block explorers for the network

running the deployment script will output a json file in `deployments/bnote-deployment-{network-name}.json`
proxy-args.ts can be updated (if necessary for testing) by grabbing the proxyArgs from the deployment json file

## Contract Configuration & Handover steps:
This describes a thorough process of configuring the BNote contract and handing over control from the Bittrees Technology 
Multisig to the Bittrees Research Multisig. This process attempts to be thorough, including certain optional steps to test
the contract is working as intended in production. Optional steps can be omitted, but that is not recommended.

1. Technology Multisig sets paymentTokens on the contract: (REQUIRED)
use `npx hardhat technology-add-new-active-payment-token --network {network-name} --token {token-contract-address} --priceInMinorUnits 100000000000000000 --priceInMajorUnits 0.1`
or use `npx hardhat technology-add-new-active-payment-token-batch --network {network-name} --tokens {token-contract-address-1},{token-contract-address-2} --pricesInMinorUnits 100000000000000000,200000000000000000 --pricesInMajorUnits 0.1,0.2`
* this take a price in major and minor units and checks they're equivalent based on the decimals return by the onchain 
token contract of the given address. This is to guard against incorrect price scaling. minor units are using in setting 
the payment token in the contract after all checks pass

2. Technology Multisig sets treasury on the contract: (REQUIRED)
use `npx hardhat technology-set-treasury-to-research --network {network-name}`
* this is required for minting to work, and so funds paid for minting are received by Bittrees Research Multisig 

3. Technology Multisig mints tokens on the treasury: (OPTIONAL)
use `npx hardhat technology-mint-batch-test --network {network-name}` TODO: add this task
* this proves minting is working correctly, and that the treasury is correctly set

4. Technology Multisig pauses the contract: (OPTIONAL)
use `npx hardhat technology-pause-bnote --network {network-name}` TODO: add this task
* this proves minting is working correctly, and that the treasury is correctly set

5. Technology Multisig tries but fails to mint tokens to the treasury: (OPTIONAL - only useful if step 4 was used)
use `npx hardhat technology-mint-batch-test --network {network-name}` TODO: add this task
* this proves that pausing the contract works as it should, and sets up the Research Multisig to prove once it has the ADMIN_ROLE

6. Technology Multisig grants DEFAULT_ADMIN_ROLE to the Research Multisig: (REQUIRED)  
use `npx hardhat technology-grant-default-admin-role-to-research --network {network-name}`
* this allows the Research Multisig to to grant roles to addresses 

7. Research Multisig grants ADMIN_ROLE to the itself: (REQUIRED)
use `npx hardhat research-grant-admin-role-to-itself --network {network-name}`
* this proves that the Research Multisig DEFAULT_ADMIN_ROLE is working

8. Research Multisig unpauses contract so minting can resume: (REQUIRED if step 4 was used)
use `npx hardhat research-unpause-bnote --network {network-name}` TODO: add this task
* this proves that the Research Multisig ADMIN_ROLE is working

9. Technology Multisig renounces DEFAULT_ADMIN_ROLE & ADMIN_ROLE: (REQUIRED - alternatively do step 10)
use `npx hardhat technology-renounce-default-admin-role --network {network-name}`
and use `npx hardhat technology-renounce-admin-role --network {network-name}`
* this leaves Bittrees Research as the exclusive address with authority over the contract. The --remainingAddress value
passed in should be the Research Multisig address, and ensures that the Technology Multisig does not renounce the roles
before they have been granted to another address.

10. Research Multisig revokes DEFAULT_ADMIN_ROLE & ADMIN_ROLE from Technology Multisig: (REQUIRED - alternatively do step 9)
use `npx hardhat research-revoke-default-admin-role-from-technology --network {network-name}`
and use `npx hardhat research-revoke-admin-role-from-technology --network {network-name}`
* this leaves Bittrees Research as the exclusive address with authority over the contract. The --remainingAddress value 
passed in should be the Research Multisig address, and ensures that the Technology Multisig does not renounce the roles
before they have been granted to another address.
