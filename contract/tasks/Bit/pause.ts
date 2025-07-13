import { task } from 'hardhat/config';
import { CONFIG } from '@project/config';
import { BittreesResearchContractNames } from '@project/lib/helpers';

/**
 * Contract Configuration Helper Task
 *
 * The Bittrees Technology Multisig pauses the BIT contract
 * */
task(
    'BIT-technology-pause',
    'Bittrees Technology Multisig pauses the BIT contract',
)
    .addFlag('dryRun', 'Add transactions to transactionBatch global without submitting and log')
    .setAction(async (taskArgs, hre) => {
        const { dryRun } = taskArgs;

        await hre.run('pause', {
            contractName: BittreesResearchContractNames.BIT,
            from: CONFIG.bittreesTechnologyGnosisSafeAddress,
            dryRun,
        });
    });

/**
 * Contract Configuration Helper Task
 *
 * The Bittrees Research Multisig pauses the BIT contract
 * */
task(
    'BIT-research-pause',
    'Bittrees Research Multisig pauses the BIT contract',
)
    .addFlag('dryRun', 'Add transactions to transactionBatch global without submitting and log')
    .setAction(async (taskArgs, hre) => {
        const { dryRun } = taskArgs;

        await hre.run('pause', {
            contractName: BittreesResearchContractNames.BIT,
            from: CONFIG.bittreesResearchGnosisSafeAddress,
            dryRun,
        });
    });