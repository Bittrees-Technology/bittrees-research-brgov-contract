import * as readline from 'readline';
import { ethers, network } from 'hardhat';
import { CREATE2_FACTORY_ABI } from './gnosis.create2Factory.abi';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { CONFIG } from './config';
import { MetaTransactionData } from '@safe-global/types-kit';
import Safe from '@safe-global/protocol-kit';
import SafeApiKit from '@safe-global/api-kit';

export function generateCompatibleSalt(safeAddress: string, saltText: string): string {
    // Remove '0x' from the safe address
    const addressBytes = safeAddress.toLowerCase().replace('0x', '');

    // Generate a short hash from the salt text to use as the last 12 bytes
    const saltHash = ethers.keccak256(ethers.toUtf8Bytes(saltText)).slice(2, 26); // Taking just 12 bytes (24 chars)

    // Combine: first 20 bytes from Safe address + last 12 bytes from custom salt
    const combinedSalt = '0x' + addressBytes + saltHash;

    return combinedSalt;
}

export function calculateCreate2Address(
    factoryAddress: string,
    salt: string,
    bytecode: string
): string {
    // Calculate the initialization code hash
    const bytecodeHash = ethers.keccak256(bytecode);

    // Pack and hash according to CREATE2 rules used by the Safe factory
    // prefix (0xff) + factory address + salt + keccak256(bytecode)
    const create2AddressBytes = ethers.keccak256(
        ethers.concat([
            '0xff',
            factoryAddress.toLowerCase(),
            salt,
            bytecodeHash
        ])
    );

    // Extract the last 20 bytes (40 hex chars) to get the address
    const create2Address = '0x' + create2AddressBytes.slice(2).slice(-40);

    // Return checksum address
    return ethers.getAddress(create2Address);
}

/**
 * Helper to encode deployments using the safeCreate2 method on the Gnosis
 * CREATE2 factory contract
 * @param salt 32 bytes hex encoded string. First 20 bytes should match the lower
 * cased address of the address calling the create2 factory
 * @param bytecode Bytecode of the contract to deploy. If the contract takes init
 * arguments, the bytecode string should append those using
 * `ContractFactoryInstance.interface.encodeDeploy(initData)` - see deployBNote.ts
 * proxyCreationCode for example
 * @returns a string to be used as the `data` property on a transaction deploying the
 * contract. The `to` property should be the address of the Gnosis CREATE2 factory.
 * The `value` property should be 0. The `operation` property should be 0 (usually
 * optional and defaults to 0).
 * */
export function encodeCreate2FactoryDeploymentTxData(
    salt: string,
    bytecode: string
): string {
    const factoryInterface = new ethers.Interface(CREATE2_FACTORY_ABI);
    return factoryInterface.encodeFunctionData("safeCreate2", [salt, bytecode]);
}

/**
 * Function to prompt the user and wait for their input
 * @param question The question to ask the user
 * @returns A Promise that resolves to true for yes/continue or false for no/abort
 */
export function askForConfirmation(question: string): Promise<boolean> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise<boolean>((resolve) => {
        rl.question(`${question} (y/n): `, (answer: string) => {
            // Close the interface to prevent the program from hanging
            rl.close();

            const normalizedAnswer = answer.trim().toLowerCase();

            // Check if the answer is a variant of "yes"
            const isYes = normalizedAnswer === 'y' || normalizedAnswer === 'yes';

            resolve(isYes);
        });
    });
}

export async function proposeTxBundleToSafe(transactions: MetaTransactionData[], safeAddress: string) {
    // Get the signer - either from ledger or default hardhat
    const signer = await getSigner();

    const { chainId } = await ethers.provider.getNetwork();

    const safe = await Safe.init({
        provider: network.provider,
        signer: signer.address,
        safeAddress,
    })

    const unsignedSafeTx = await safe.createTransaction({
        transactions
    })

    const signedSafeTx = await safe.signTransaction(unsignedSafeTx);

    const signature = signedSafeTx.getSignature(signer.address);

    if (!signature) {
        throw new Error("Signature not found");
    }

    const safeService = new SafeApiKit({
        chainId
    });

    await safeService.proposeTransaction({
        senderAddress: signer.address,
        safeTransactionData: signedSafeTx.data,
        safeTxHash: await safe.getTransactionHash(signedSafeTx),
        senderSignature: signature.data,
        safeAddress,
    })

    console.log("\n==== Safe UI Instructions ====");
    console.log(
        "Go to your Safe UI to approve an execute the transaction bundle:\n"
        + getSafeWebUrl(network.name, CONFIG.create2FactoryCallerAddress)
    );
}

/**
 * Logs details about the transactions to console. Intended for use when CONFIG.proposeTxToSafe is false
 * and the script is being run to check output for testing or confirmation purposes (such
 * as confirming the proposed TXs add to the safe by one of the other multisig signers)
 * */
export function logTransactionDetailsToConsole(transactions: (
    MetaTransactionData & {transactionInfoLog: string })[]
) {
    transactions.map(tx => {
        console.log(tx.transactionInfoLog);
        console.log(`To address: ${tx.to}`);
        console.log(`Value: ${tx.value}`);
        console.log(`Operation: ${tx.operation || 0}`);
        console.log(`Data: ${tx.data.slice(0, 66)}...${tx.data.slice(-64)}`);
        console.log('\n');
    });
}

/**
 * @returns A HardhatEthersSigner. Either a ledger signer as configured in the
 * .env under LEDGER_ADDRESS and retrieved in config.ts, or a local signer as
 * configured in the .env under PRIVATE_KEY and retrieved in hardhat.config.ts
 * */
export async function getSigner(): Promise<HardhatEthersSigner> {
    let signer: HardhatEthersSigner;
    if (CONFIG.useLedger) {
        console.log(`Using Ledger with address: ${CONFIG.ledgerAddress}`);
        signer = await ethers.getSigner(CONFIG.ledgerAddress);
        console.log("Ledger connected successfully!");
    } else {
        const signers = await ethers.getSigners();
        signer = signers[0];
        console.log(`Using signer: ${await signer.getAddress()}`);
    }
    return signer;
}

/**
 * Returns the gnosis safe UI url where you can expect to find
 * the queue of proposed transactions
 * */
export function getSafeWebUrl(
    networkName: string,
    safeAddress: string
): string {
    const baseUrl = 'https://app.safe.global';
    let query = 'safe=';

    switch (networkName) {
        // Mainnets
        case "mainnet":
            query = `${query}eth:${safeAddress}`;
            break;
        case "base":
            query = `${query}base:${safeAddress}`;
            break;

        // Testnets
        case "sepolia":
            query = `${query}sep:${safeAddress}`;
            break;
        case "baseSepolia":
            query = `${query}basesep:${safeAddress}`;
            break;
        default:
            query = `${query}${safeAddress}`;
    }

    return `${baseUrl}/transactions/queue?${query}`;
}