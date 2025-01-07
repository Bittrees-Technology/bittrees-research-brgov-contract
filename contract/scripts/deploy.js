// scripts/deploy.js
const { ethers } = require('hardhat');

async function main() {
    // Grab the first signer as deployer
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    console.log("Account balance:", ethers.utils.formatEther(await deployer.getBalance()), "ETH");

    // Get the contract factory
    const BRGOV = await ethers.getContractFactory("BRGOV");

    // Here are your constructor arguments
    // Adjust these values as needed:
    const baseURI = "ipfs://YOUR_BASE_URI/";
    const treasury = "0xTREASURY_ADDRESS_HERE";
    const amountOne = 100;     // For migration mint
    const amountTen = 20;      // For migration mint
    const amountHundred = 5;   // For migration mint

    // Deploy normally (non-upgradeable)
    const brgovContract = await BRGOV.deploy(
        baseURI,
        treasury,
        amountOne,
        amountTen,
        amountHundred
    );

    // Wait for deployment to finish
    await brgovContract.deployed();

    console.log("BRGOV contract deployed at:", brgovContract.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
