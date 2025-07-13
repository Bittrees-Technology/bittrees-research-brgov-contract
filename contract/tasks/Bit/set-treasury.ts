import { task } from 'hardhat/config';
import { CONFIG } from '@project/config';
import { BittreesResearchContractNames } from '@project/lib/helpers';

/**
 * Contract Configuration Helper Task
 *
 * The Technology Multisig sets the treasury to the Bittrees Research Multisig.
 * */
task(
    'BIT-technology-set-treasury-to-research',
    'Bittrees Technology Multisig sets treasury to the Bittrees Research Multisig',
)
    .addFlag('dryRun', 'Add transactions to transactionBatch global without submitting and log')
    .setAction(async (taskArgs, hre) => {
        const { dryRun } = taskArgs;

        await hre.run('set-treasury', {
            contractName: BittreesResearchContractNames.BIT,
            treasuryAddress: CONFIG.bittreesResearchGnosisSafeAddress,
            from: CONFIG.bittreesTechnologyGnosisSafeAddress,
            dryRun,
        });
    });