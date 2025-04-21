// scripts/propose-upgrade.js
const { defender } = require('hardhat');
const { ethers } = require('hardhat');

async function main() {
    const proxyAddress = process.env.UPGRADEABLE_PROXY_ADDRESS;

    const BRGOV = await ethers.getContractFactory('BRGOV');
    console.log('Preparing proposal...');
    const proposal = await defender.proposeUpgrade(proxyAddress, BRGOV);
    console.log('Upgrade proposal created at:', proposal.url);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
