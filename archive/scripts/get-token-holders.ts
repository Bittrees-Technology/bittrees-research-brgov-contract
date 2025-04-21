import { ethers } from "hardhat";
import { BRGOV__factory } from '../typechain-types';
import fs from "fs";
import { BigNumber } from 'ethers';

async function main() {
    console.log("Creating snapshot of BRGOV token holders...");

    // Get the contract
    const proxyAddress = process.env.UPGRADEABLE_PROXY_ADDRESS;
    if (!proxyAddress) {
        throw new Error("UPGRADEABLE_PROXY_ADDRESS not set in environment");
    }

    const provider = ethers.provider;
    const brgov = BRGOV__factory.connect(proxyAddress, provider);

    // Constants from the contract
    const MAX_BRGOV_TOKENID_ONE = ethers.BigNumber.from("1000000000000"); // 1 * 10^12
    const MAX_BRGOV_TOKENID_TEN = ethers.BigNumber.from("2000000000000"); // 2 * 10^12
    const MAX_BRGOV_TOKENID_HUNDRED = ethers.BigNumber.from("3000000000000"); // 3 * 10^12

    // Get Transfer events for each denomination
    console.log("Fetching Transfer events from contract creation...");

    // Get the contract creation block - or use a fixed block if known
    const currentBlock = await provider.getBlockNumber();
    const startBlock = 16717999; // Start from genesis or a known block
    const blocksPerQuery = 10000; // Adjust based on RPC limits

    // Initialize holders for each denomination
    const holdersOne: Record<string, BigNumber> = {};
    const holdersTen: Record<string, BigNumber> = {};
    const holdersHundred: Record<string, BigNumber> = {};

    // Get TransferSingle events in chunks to avoid RPC limitations
    for (let fromBlock = startBlock; fromBlock <= currentBlock; fromBlock += blocksPerQuery) {
        const toBlock = Math.min(fromBlock + blocksPerQuery - 1, currentBlock);
        console.log(`Scanning blocks ${fromBlock} to ${toBlock}...`);

        // Filter for TransferSingle events
        const filter = brgov.filters.TransferSingle();
        const events = await brgov.queryFilter(filter, fromBlock, toBlock);

        for (const event of events) {
            const { args } = event;
            if (!args) continue;

            const { from, to, id, value } = args;

            // Determine token denomination
            let holders: Record<string, BigNumber>;
            if (id.lte(MAX_BRGOV_TOKENID_ONE)) {
                holders = holdersOne;
            } else if (id.lte(MAX_BRGOV_TOKENID_TEN)) {
                holders = holdersTen;
            } else if (id.lte(MAX_BRGOV_TOKENID_HUNDRED)) {
                holders = holdersHundred;
            } else {
                console.warn(`Unknown token ID: ${id.toString()}`);
                continue;
            }

            // Subtract from sender (if not minting)
            if (from !== ethers.constants.AddressZero) {
                holders[from] = (holders[from] || ethers.BigNumber.from(0)).sub(value);
                // Remove if balance becomes zero
                if (holders[from].lte(0)) {
                    delete holders[from];
                }
            }

            // Add to recipient (if not burning)
            if (to !== ethers.constants.AddressZero) {
                holders[to] = (holders[to] || ethers.BigNumber.from(0)).add(value);
            }
        }
    }

    // Create summary
    const summary = {
        denomination1: {
            totalSupply: Object.values(holdersOne).reduce((a, b) => a.add(b), ethers.BigNumber.from(0)).toNumber(),
            holders: Object.entries(holdersOne).map(([address, amount]) => ({
                address,
                amount: amount.toString()
            }))
        },
        denomination10: {
            totalSupply: Object.values(holdersTen).reduce((a, b) => a.add(b), ethers.BigNumber.from(0)).toNumber(),
            holders: Object.entries(holdersTen).map(([address, amount]) => ({
                address,
                amount: amount.toString()
            }))
        },
        denomination100: {
            totalSupply: Object.values(holdersHundred).reduce((a, b) => a.add(b), ethers.BigNumber.from(0)).toNumber(),
            holders: Object.entries(holdersHundred).map(([address, amount]) => ({
                address,
                amount: amount.toString()
            }))
        },
    };

    console.log("=== Summary ===");
    console.log(`Denomination 1 total supply: ${summary.denomination1.totalSupply}`);
    console.log(`Denomination 1 holders: ${summary.denomination1.holders.length}`);
    console.log(`Denomination 10 total supply: ${summary.denomination10.totalSupply}`);
    console.log(`Denomination 10 holders: ${summary.denomination10.holders.length}`);
    console.log(`Denomination 100 total supply: ${summary.denomination100.totalSupply}`);
    console.log(`Denomination 100 holders: ${summary.denomination100.holders.length}`);

    // Write to file
    const outputFile = `brgov-holders-snapshot-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(outputFile, JSON.stringify(summary, null, 2));
    console.log(`✅ Snapshot saved to ${outputFile}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});