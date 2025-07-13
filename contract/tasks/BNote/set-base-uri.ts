import { task } from 'hardhat/config';
import { CONFIG } from '@project/config';
import { BittreesResearchContractNames } from '@project/lib/helpers';

/**
 * Contract Configuration Helper Task
 *
 * The Technology Multisig sets the base URI on the BNote contract.
 * */
task(
    'BNOTE-technology-set-base-uri',
    'Bittrees Technology Multisig sets the base URI on the BNote contract.',
)
    .addFlag('dryRun', 'Add transactions to transactionBatch global without submitting and log')
    .setAction(async (taskArgs, hre) => {
        const { dryRun } = taskArgs;

        const networkName = hre.network.name;

        await hre.run('set-base-uri', {
            contractName: BittreesResearchContractNames.BNOTE,
            baseUri: CONFIG.network[networkName].baseURI,
            from: CONFIG.bittreesTechnologyGnosisSafeAddress,
            dryRun,
        });
    });

/**
 * Contract Configuration Helper Task
 *
 * The Research Multisig sets the base URI on the BNote contract.
 * */
task(
    'BNOTE-research-set-base-uri',
    'Bittrees Research Multisig sets the base URI on the BNote contract.',
)
    .addFlag('dryRun', 'Add transactions to transactionBatch global without submitting and log')
    .setAction(async (taskArgs, hre) => {
        const { dryRun } = taskArgs;

        const networkName = hre.network.name;

        await hre.run('set-base-uri', {
            contractName: BittreesResearchContractNames.BNOTE,
            baseUri: CONFIG.network[networkName].baseURI,
            from: CONFIG.bittreesResearchGnosisSafeAddress,
            dryRun,
        });
    });