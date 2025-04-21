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
4. `npx hardhat verify --network {network-name} {proxy-contract-address} --constructor-args deployments/proxy-args.ts` <- verify the proxy contract code on appropriate block explorers for the network
5. `npx hardhat verify --network {network-name} {implementation-contract-address}` <- verify the implementation contract code on appropriate block explorers for the network

running the deployment script will output a json file in `deployments/bnote-deployment-{network-name}.json`
proxy-args.ts can be updated (if necessary for testing) by grabbing the proxyArgs from the deployment json file