import { ethers, network } from "hardhat";
import { keccak256, Contract } from "ethers";
import Safe from "@safe-global/safe-core-sdk";
import { SafeTransactionDataPartial } from "@safe-global/safe-core-sdk-types";
import SafeServiceClient from "@safe-global/safe-service-client";
import EthersAdapter from "@safe-global/safe-ethers-lib";
import { providers, Wallet, utils as ethersV5Utils } from "ethers-v5";

// CREATE2 Factory ABI - with the CORRECT function names
export const CREATE2_FACTORY_ABI = [
    {
        "inputs": [
            { "internalType": "bytes32", "name": "salt", "type": "bytes32" },
            { "internalType": "bytes", "name": "initializer", "type": "bytes" }
        ],
        "name": "safeCreate2",
        "outputs": [{ "internalType": "address", "name": "proxy", "type": "address" }],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "bytes32", "name": "salt", "type": "bytes32" },
            { "internalType": "bytes", "name": "initializer", "type": "bytes" }
        ],
        "name": "findCreate2Address",
        "outputs": [{ "internalType": "address", "name": "proxy", "type": "address" }],
        "stateMutability": "view",
        "type": "function"
    }
];

// ERC1967 Proxy ABI parts we need for upgrades
export const ERC1967_PROXY_ABI = [
    {
        "inputs": [],
        "name": "implementation",
        "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "newImplementation", "type": "address" }
        ],
        "name": "upgradeTo",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "newImplementation", "type": "address" },
            { "internalType": "bytes", "name": "data", "type": "bytes" }
        ],
        "name": "upgradeToAndCall",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    }
];

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

// Helper to encode CREATE2 factory deploy call - WITH CORRECT FUNCTION NAME
export function encodeFactoryDeploy(
    salt: string,
    bytecode: string
): string {
    const factoryInterface = new ethers.Interface(CREATE2_FACTORY_ABI);
    return factoryInterface.encodeFunctionData("safeCreate2", [salt, bytecode]);
}

// Get Safe Web URL
export function getSafeWebUrl(
    networkName: string,
    safeAddress: string
): string {
    let baseUrl;

    switch (networkName) {
        case "mainnet":
            baseUrl = "https://app.safe.global/eth";
            break;
        case "goerli":
            baseUrl = "https://app.safe.global/gor";
            break;
        case "sepolia":
            baseUrl = "https://app.safe.global/sep";
            break;
        case "base":
            baseUrl = "https://app.safe.global/base";
            break;
        case "baseSepolia":
            baseUrl = "https://app.safe.global/base-sep";
            break;
        case "polygon":
            baseUrl = "https://app.safe.global/matic";
            break;
        default:
            baseUrl = "https://app.safe.global";
    }

    return `${baseUrl}:${safeAddress}/transactions/queue`;
}