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

# Contract Configuration & Handover steps:

## Quick Version via Composition Tasks (recommended):
This is the recommended approach to configuring and handing over the BNote contract. It must be carried out in 3 phases, 
each resulting in a transaction batch of multiple transactions to be executed by the safe in that stage.

### PHASE 00 - Technology Multisig configures the BNote contract and initiates handover to Research Multisig:
carries out detailed steps 1 - 8

`npx hardhat technology-configure-bnote-and-handover-to-research --network {network-name}`

### PHASE 01 - Research Multisig takes ownership over the BNote contract, proving PHASE 00 success:
carries out detailed steps 9 - 12

`npx hardhat research-take-bnote-ownership --network {network-name}`

### PHASE 02 - Technology Multisig loses ownership of the BNote contract, ONLY DO AFTER SUCCESSFUL PHASE 01:
carries out detailed steps 13a or 13b
`npx hardhat technology-renounce-bnote-roles --network {network-name}`

OR

`npx hardhat research-revoke-roles-on-bnote-from-technology --network {network-name}`

## Detailed Version, Transaction by Transaction:
This describes a thorough process of configuring the BNote contract and handing over control from the Bittrees Technology 
Multisig to the Bittrees Research Multisig. This process includes certain optional steps to test and ensure the contract
is working as intended in production. Optional steps can be omitted, but that is not recommended. Each step is a single
transaction, submitted to the gnosis safe as a transaction batch.

### 1. Technology Multisig sets paymentTokens on the contract: (REQUIRED)
`npx hardhat technology-add-new-active-payment-token --network {network-name} --token-address {token-contract-address} --price-in-minor-units 100000000000000000 --price-in-major-units 0.1`

OR 

`npx hardhat technology-add-new-active-payment-token-batch --network {network-name} --token-addresses {token-contract-address-1},{token-contract-address-2} --prices-in-minor-units 100000000000000000,200000000000000000 --prices-in-major-units 0.1,0.2`

This takes the same price in major and minor units and checks they're equivalent based on the decimals return by the onchain 
token contract of the given address. This is to guard against incorrect price scaling. Minor units are used in setting 
the payment token in the contract after all checks pass.

### 2. Technology Multisig sets treasury on the contract: (REQUIRED)
`npx hardhat technology-set-treasury-to-research --network {network-name}`

This is required for minting to work, and so funds paid for minting are received by Bittrees Research Multisig

### 3. Technology Multisig approves BNote contract to spend sufficient BTREE it holds: (OPTIONAL)
TODO: Add this task for Technology to approve BNote contract to spend its BTREE in the following test mint

`npx hardhat technology-approve-bnote-to-spend-btree --network {network-name}`

Required for minting in step 4 to work. Default usage approves 111k BTREE, as test assumptions are that
the unitPrice of 1 BNote is 1,000 BTREE, and test mint will mint 1 of each token resulting in a total of 111 BNote

### 4. Technology Multisig mints tokens to the treasury: (OPTIONAL - requires step 3 to have been carried out)
`npx hardhat technology-mint-batch-test --network {network-name}`

Proves minting is working correctly, and that the treasury and BTREE paymentToken are set correctly.

### 5. Technology Multisig pauses the contract: (OPTIONAL)
`npx hardhat technology-pause-bnote-minting --network {network-name}`

Proves minting is working correctly, and that the treasury is correctly set

### 6. (Probably Skip)Technology Multisig tries but fails to mint tokens to the treasury: (OPTIONAL - only useful if step 4 was used. Safe will refuse to execute. Don't do on all networks as it's a hassle to cancel onchain)
`npx hardhat technology-mint-batch-test --network {network-name}`

Proves that pausing the contract works as it should, and sets up the Research Multisig to prove once it has the ADMIN_ROLE

### 7. Technology Multisig grants DEFAULT_ADMIN_ROLE to the Research Multisig: (REQUIRED)  
`npx hardhat technology-grant-default-admin-role-to-research --network {network-name}`

Allows the Research Multisig to to grant roles to addresses 

### 8. Technology Multisig set baseUri on the contract: (OPTIONAL)
`npx hardhat technology-set-base-uri --network {network-name}`

Set the base URI on the contract using the value defined in config.ts

### 9. Research Multisig grants ADMIN_ROLE to the itself: (REQUIRED)
`npx hardhat research-grant-admin-role-to-itself --network {network-name}`

Proves that the Research Multisig DEFAULT_ADMIN_ROLE is working

### 10. Research Multisig unpauses contract so minting can resume: (REQUIRED if step 4 was used)
`npx hardhat research-unpause-bnote-minting --network {network-name}`

Proves that the Research Multisig ADMIN_ROLE is working

### 11. Technology Multisig approves BNote contract to spend sufficient BTREE it holds: (OPTIONAL)
TODO: Add this task for Technology to approve BNote contract to spend its BTREE in the following test mint

`npx hardhat research-approve-bnote-to-spend-btree --network {network-name}`

Required for minting to work. Default approves 111k BTREE, as test assumptions are that the unitPrice of 1 BNote is 
1,000 BTREE, and test mint will mint 1 of each token resulting in a total of 111 BNote

### 12. Research Multisig mints tokens to the treasury(itself): (OPTIONAL - requires step 10 to have been carried out)
`npx hardhat research-mint-batch-test --network {network-name}`

Proves to research that minting is working correctly, that the treasury is correctly set, 
that the BTREE token is set as a valid active paymentToken with the right price, and that the
contract is unpaused by Research's own authority

### 13_a. Technology Multisig renounces DEFAULT_ADMIN_ROLE & ADMIN_ROLE: (REQUIRED - alternatively do step 12_b)

`npx hardhat technology-renounce-default-admin-role --network {network-name}`

AND

`npx hardhat technology-renounce-admin-role --network {network-name}`

Leaves Bittrees Research as the exclusive address with authority over the contract. The --remainingAddress value
passed in should be the Research Multisig address, and ensures that the Technology Multisig does not renounce the roles
before they have been granted to another address.

### 13_b. Research Multisig revokes DEFAULT_ADMIN_ROLE & ADMIN_ROLE from Technology Multisig: (REQUIRED - alternatively do step 12_a)

`npx hardhat research-revoke-default-admin-role-from-technology --network {network-name}`

AND

`npx hardhat research-revoke-admin-role-from-technology --network {network-name}`

Leaves Bittrees Research as the exclusive address with authority over the contract. The --remainingAddress value 
passed in should be the Research Multisig address, and ensures that the Technology Multisig does not renounce the roles
before they have been granted to another address.
