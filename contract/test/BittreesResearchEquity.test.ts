import { expect } from 'chai';
import { upgrades } from 'hardhat';
import hre from 'hardhat';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { Contract } from 'ethers';

async function setupAndMint(
    btreeContract: Contract,
    contract: Contract,
    treasuryWallet: SignerWithAddress,
    otherWallet: SignerWithAddress
) {
    await contract.setMintPriceBTREE(hre.ethers.utils.parseEther('1000.0'));
    await contract.setBTREEContract(btreeContract.address);
    await contract.setBTREETreasury(treasuryWallet.address);

    // mint 1000 BTREE ERC-20 tokens to otherWallet, then mintWithBTREE()
    await btreeContract.mint(
        otherWallet.address,
        hre.ethers.utils.parseEther('1000.0')
    );

    // const otherWalletBalanceBefore = await btreeContract.balanceOf(
    //     otherWallet.address
    // );
    // console.log(
    //     'otherWalletBalanceBefore: ',
    //     otherWalletBalanceBefore.toString()
    // );
    // const treasuryBalanceBefore = await btreeContract.balanceOf(
    //     treasuryWallet.address
    // );
    // console.log('treasuryBalanceBefore: ', treasuryBalanceBefore.toString());

    // mint 1 BTREE NFT, but first approve BTREE tokens to transfer

    // console.log(
    //     'about to approve',
    //     hre.ethers.utils.parseEther('1000.0'),
    //     'tokens for address',
    //     contract.address
    // );
    await btreeContract
        .connect(otherWallet)
        .approve(contract.address, hre.ethers.utils.parseEther('1000.0'));
    await contract.mintWithBTREE(otherWallet.address);
}

describe('BittreesResearchEquity', function () {
    let btreeContract: Contract;
    let contract: Contract;
    let owner: SignerWithAddress;
    let otherWallet: SignerWithAddress;
    let treasuryWallet: SignerWithAddress;

    beforeEach(async function () {
        const BTREEContract = await hre.ethers.getContractFactory(
            'BTREETokenMock'
        );

        btreeContract = await BTREEContract.deploy();
        await btreeContract.deployed();

        const Contract = await hre.ethers.getContractFactory(
            'BittreesResearchEquity'
        );

        const [_owner, _otherWallet, _treasuryWallet] =
            await hre.ethers.getSigners();
        owner = _owner;
        otherWallet = _otherWallet;
        treasuryWallet = _treasuryWallet;

        contract = await upgrades.deployProxy(Contract);
        await contract.deployed();
    });

    describe('setters', function () {
        describe('owner', function () {
            it('should successfully set and retrieve URI', async () => {
                const newURI = 'ipfs://testuri/{id}';
                await contract.setURI(newURI);
                await expect(await contract.uri(1)).to.equal(newURI);
            });

            it('should successfully set and retrieve BTREE MintPrice', async () => {
                const newMintPrice = 10;
                await contract.setMintPriceBTREE(newMintPrice);
                await contract.setBTREEContract(btreeContract.address);
                await contract.setBTREETreasury(treasuryWallet.address);

                await expect(await contract.mintPriceBTREE()).to.equal(
                    newMintPrice
                );
            });

            it('should emit BTREEPriceUpdated event', async function () {
                await contract.setMintPriceBTREE(5000);
                await expect(contract.setMintPriceBTREE(8000))
                    .to.emit(contract, 'BTREEPriceUpdated')
                    .withArgs(5000, 8000);
            });

            it('should successfully set and retrieve BTREE Contract Address', async () => {
                await contract.setBTREEContract(btreeContract.address);
                await expect(await contract.btreeContract()).to.equal(
                    btreeContract.address
                );
            });

            it('should emit BTREEContractUpdated event', async function () {
                await expect(contract.setBTREEContract(btreeContract.address))
                    .to.emit(contract, 'BTREEContractUpdated')
                    .withArgs(
                        '0x0000000000000000000000000000000000000000',
                        btreeContract.address
                    );
            });

            it('should successfully set and retrieve BTREE Treasury Wallet', async () => {
                await contract.setBTREETreasury(otherWallet.address);
                await expect(await contract.btreeTreasury()).to.equal(
                    otherWallet.address
                );
            });

            it('should emit BTREETreasuryUpdated event', async function () {
                await expect(contract.setBTREETreasury(otherWallet.address))
                    .to.emit(contract, 'BTREETreasuryUpdated')
                    .withArgs(
                        '0x0000000000000000000000000000000000000000',
                        otherWallet.address
                    );
            });
        });

        describe('non-owner', function () {
            it('should not be able to setURI', async () => {
                await expect(
                    contract.connect(otherWallet).setURI('ipfs://123/')
                ).to.be.revertedWith(
                    'AccessControl: account 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 is missing role 0x0000000000000000000000000000000000000000000000000000000000000000'
                );
            });
            it('should not be able to setMintPriceBTREE', async () => {
                await expect(
                    contract.connect(otherWallet).setMintPriceBTREE(1000000)
                ).to.be.revertedWith(
                    'AccessControl: account 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 is missing role 0x0000000000000000000000000000000000000000000000000000000000000000'
                );
            });
        });
    });

    describe('mintWithBTREE', function () {
        it('should not mint if value is below the minimum mintPriceBTREE', async function () {
            await contract.setMintPriceBTREE(
                hre.ethers.utils.parseEther('1000.0')
            );
            await expect(
                contract.mintWithBTREE(otherWallet.address, {
                    value: hre.ethers.utils.parseEther('999.0'),
                })
            ).to.be.revertedWith('Not enough BTREE funds sent');
        });

        describe('upon successful mint (when value is equal to mintPriceBTREE)', function () {
            it('should emit a TransferSingle', async function () {
                await setupAndMint(
                    btreeContract,
                    contract,
                    treasuryWallet,
                    otherWallet
                );
                // await contract.setMintPriceBTREE(
                //     hre.ethers.utils.parseEther('1000.0')
                // );
                // await contract.setBTREEContract(btreeContract.address);
                // await contract.setBTREETreasury(treasuryWallet.address);

                const topic1 = owner.address;
                const topic2_from =
                    '0x0000000000000000000000000000000000000000';
                const topic3_to = otherWallet.address;
                const topic4_id = 1;
                const topic5_value = 1;
                await expect(
                    contract.mintWithBTREE(otherWallet.address, {
                        value: hre.ethers.utils.parseEther('1000.0'),
                    })
                )
                    .to.emit(contract, 'TransferSingle')
                    .withArgs(
                        topic1,
                        topic2_from,
                        topic3_to,
                        topic4_id,
                        topic5_value
                    );
            });

            it.only('should transfer BTREE from otherUser to btreeTreasury', async function () {
                await setupAndMint(
                    btreeContract,
                    contract,
                    treasuryWallet,
                    otherWallet
                );

                // erc-20 balance of otherWallet should be 1000 less than before
                // erc-20 balance for treasury should be 1000 more than before
                const otherWalletBalanceAfter = await btreeContract.balanceOf(
                    otherWallet.address
                );
                const treasuryBalanceAfter = await btreeContract.balanceOf(
                    treasuryWallet.address
                );

                await expect(otherWalletBalanceAfter.toString()).to.equal(
                    hre.ethers.BigNumber.from(0).toString()
                );

                await expect(treasuryBalanceAfter.toString()).to.equal(
                    hre.ethers.utils.parseEther('1000.0').toString()
                );
            });

            it('should be owned by otherWallet', async function () {
                await contract.setMintPriceBTREE(
                    hre.ethers.utils.parseEther('10.0')
                );
                await contract.setBTREEContract(btreeContract.address);
                await contract.setBTREETreasury(treasuryWallet.address);

                // other user should initially have balance of zero
                await expect(
                    await contract.balanceOf(otherWallet.address, 1)
                ).to.equal(0);

                await contract.mintWithBTREE(otherWallet.address, {
                    value: hre.ethers.utils.parseEther('10.0'),
                });

                await expect(
                    await contract.balanceOf(otherWallet.address, 1)
                ).to.equal(1);
            });

            it('non-owner should also be successful and emit a TransferSingle', async function () {
                await contract.setMintPriceBTREE(
                    hre.ethers.utils.parseEther('10.0')
                );
                await contract.setBTREEContract(btreeContract.address);
                await contract.setBTREETreasury(treasuryWallet.address);

                const topic1 = otherWallet.address;
                const topic2_from =
                    '0x0000000000000000000000000000000000000000';
                const topic3_to = otherWallet.address;
                const topic4_id = 1;
                const topic5_value = 1;
                await expect(
                    contract
                        .connect(otherWallet)
                        .mintWithBTREE(otherWallet.address, {
                            value: hre.ethers.utils.parseEther('10.0'),
                        })
                )
                    .to.emit(contract, 'TransferSingle')
                    .withArgs(
                        topic1,
                        topic2_from,
                        topic3_to,
                        topic4_id,
                        topic5_value
                    );
            });
        });
    });

    describe('withdrawal', () => {
        it('should withdraw funds if DEFAULT_ADMIN_ROLE', async () => {
            await contract.setMintPriceBTREE(
                hre.ethers.utils.parseEther('22.0')
            );
            await contract.setBTREEContract(btreeContract.address);
            await contract.setBTREETreasury(treasuryWallet.address);

            await contract.mintWithBTREE(otherWallet.address, {
                value: hre.ethers.utils.parseEther('22.0'),
            });

            const ownerBalance = await hre.ethers.provider.getBalance(
                owner.address
            );
            const contractBalance = await hre.ethers.provider.getBalance(
                contract.address
            );

            await contract.withdraw();

            const ownerBalanceAfter = await hre.ethers.provider.getBalance(
                owner.address
            );

            const contractBalanceAfter = await hre.ethers.provider.getBalance(
                contract.address
            );

            expect(contractBalanceAfter.toString()).to.equal(
                hre.ethers.BigNumber.from(0).toString()
            );
            // slightly greater-than due to gas fees
            expect(ownerBalance.add(contractBalance).gt(ownerBalanceAfter)).to
                .be.true;
        });

        it('should not withdraw funds if not DEFAULT_ADMIN_ROLE', async () => {
            await contract.setMintPriceBTREE(
                hre.ethers.utils.parseEther('22.0')
            );
            await contract.setBTREEContract(btreeContract.address);
            await contract.setBTREETreasury(treasuryWallet.address);

            await contract.mintWithBTREE(otherWallet.address, {
                value: hre.ethers.utils.parseEther('22.0'),
            });

            await expect(
                contract.connect(otherWallet).withdraw()
            ).to.be.revertedWith(
                'AccessControl: account 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 is missing role 0x0000000000000000000000000000000000000000000000000000000000000000'
            );
        });
    });
});
