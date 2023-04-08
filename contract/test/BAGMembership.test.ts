import { expect } from 'chai';
import { upgrades } from 'hardhat';
import hre from 'hardhat';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { time } from '@nomicfoundation/hardhat-network-helpers';
import { Contract } from 'ethers';

const DAY = 60 * 60 * 24;
const WEEK = DAY * 7;
const YEAR = 52 * WEEK;

describe('BAGMembership', function () {
    let contract: Contract;
    let owner: SignerWithAddress;
    let otherUser: SignerWithAddress;

    beforeEach(async function () {
        const Contract = await hre.ethers.getContractFactory('BAGMembership');

        const [_owner, _otherUser] = await hre.ethers.getSigners();
        owner = _owner;
        otherUser = _otherUser;

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

            it('should successfully set and retrieve MintPrice', async () => {
                const newMintPrice = 10;
                await contract.setMintPrice(newMintPrice);
                await expect(await contract.mintPrice()).to.equal(newMintPrice);
            });
        });

        describe('non-owner', function () {
            it('should not be able to setURI', async () => {
                await expect(
                    contract.connect(otherUser).setURI('ipfs://123/')
                ).to.be.revertedWith(
                    'AccessControl: account 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 is missing role 0x0000000000000000000000000000000000000000000000000000000000000000'
                );
            });
            it('should not be able to setMintPrice', async () => {
                await expect(
                    contract.connect(otherUser).setMintPrice(1000000)
                ).to.be.revertedWith(
                    'AccessControl: account 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 is missing role 0x0000000000000000000000000000000000000000000000000000000000000000'
                );
            });
        });

        describe('emits', function () {
            it('MintPriceUpdated event', async function () {
                await contract.setMintPrice(5000);
                await expect(contract.setMintPrice(8000))
                    .to.emit(contract, 'MintPriceUpdated')
                    .withArgs(5000, 8000);
            });
        });
    });

    describe('mintMembership', function () {
        it('should not mint if value is below the minimum mintPrice', async function () {
            await contract.setMintPrice(hre.ethers.utils.parseEther('10.0'));
            await expect(
                contract.mintMembership(otherUser.address, {
                    value: hre.ethers.utils.parseEther('9.0'),
                })
            ).to.be.revertedWith('Not enough funds sent');
        });

        describe('upon successful mint (when value is equal to mintPrice)', function () {
            it('should emit a MemberJoined', async function () {
                await contract.setMintPrice(
                    hre.ethers.utils.parseEther('10.0')
                );
                await expect(
                    contract.mintMembership(otherUser.address, {
                        value: hre.ethers.utils.parseEther('10.0'),
                    })
                )
                    .to.emit(contract, 'MemberJoined')
                    .withArgs(otherUser.address, 1);
            });

            it('should be owned by otherUser', async function () {
                await contract.setMintPrice(
                    hre.ethers.utils.parseEther('10.0')
                );

                // other user should initially have balance of zero
                await expect(
                    await contract.balanceOf(otherUser.address, 1)
                ).to.equal(0);

                await contract.mintMembership(otherUser.address, {
                    value: hre.ethers.utils.parseEther('10.0'),
                });

                await expect(
                    await contract.balanceOf(otherUser.address, 1)
                ).to.equal(1);
            });

            it('non-owner should also be successful and emit a MemberJoined', async function () {
                await contract.setMintPrice(
                    hre.ethers.utils.parseEther('10.0')
                );
                await expect(
                    contract
                        .connect(otherUser)
                        .mintMembership(otherUser.address, {
                            value: hre.ethers.utils.parseEther('10.0'),
                        })
                )
                    .to.emit(contract, 'MemberJoined')
                    .withArgs(otherUser.address, 1);
            });
        });
    });

    describe('withdrawal', () => {
        it('should withdraw funds if DEFAULT_ADMIN_ROLE', async () => {
            await contract.setMintPrice(hre.ethers.utils.parseEther('22.0'));
            await contract.mintMembership(otherUser.address, {
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
            await contract.setMintPrice(hre.ethers.utils.parseEther('22.0'));
            await contract.mintMembership(otherUser.address, {
                value: hre.ethers.utils.parseEther('22.0'),
            });

            await expect(
                contract.connect(otherUser).withdraw()
            ).to.be.revertedWith(
                'AccessControl: account 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 is missing role 0x0000000000000000000000000000000000000000000000000000000000000000'
            );
        });
    });

    describe('membership token', () => {
        it('has correct expiration timeframe (default 1 year)', async () => {
            const unixNow = Date.now() / 1000;
            await contract.setMintPrice(hre.ethers.utils.parseEther('10.0'));
            await contract.mintMembership(otherUser.address, {
                value: hre.ethers.utils.parseEther('10.0'),
            });
            const tokenId = 1;
            const timestampNow = Math.floor(unixNow + 52 * 604800);
            const timestampFromContract = await contract.expirationTimestamps(
                tokenId
            );
            expect(
                timestampFromContract.gt(
                    hre.ethers.BigNumber.from(timestampNow)
                )
            ).to.be.true;
            expect(await contract.isExpired(tokenId)).to.be.false;
        });
        it('owner should be valid for unexpired tokens', async () => {
            await contract.setMintPrice(hre.ethers.utils.parseEther('10.0'));
            await contract.mintMembership(otherUser.address, {
                value: hre.ethers.utils.parseEther('10.0'),
            });

            const tokenId = 1;
            expect(await contract.isExpired(tokenId)).to.be.false;

            const balance = await contract.balanceOf(
                otherUser.address,
                tokenId
            );
            expect(balance.eq(1)).to.be.true;
        });

        it('admin can manually change member expiration to zero to indicate expired', async () => {
            await contract.setMintPrice(hre.ethers.utils.parseEther('10.0'));
            await contract.mintMembership(otherUser.address, {
                value: hre.ethers.utils.parseEther('10.0'),
            });

            const tokenId = 1;
            await contract.setExpiration(tokenId, 0x0);

            const balance = await contract.balanceOf(
                otherUser.address,
                tokenId
            );

            expect(balance.eq(0)).to.be.true;
        });

        it('has default expiration timeframe of 1 year', async () => {
            const currentTimeframe = await contract.expirationTimeframe();
            expect(currentTimeframe.eq(hre.ethers.BigNumber.from(YEAR))).to.be
                .true;
        });

        it('admin can manually update expiration "timeframe" to any time', async () => {
            await contract.setExpirationTimeframe(2 * YEAR);
            const currentTimeframe = await contract.expirationTimeframe();
            expect(currentTimeframe.eq(hre.ethers.BigNumber.from(2 * YEAR))).to
                .be.true;
        });

        it('otherUser can NOT manually update expiration "timeframe" to any time', async () => {
            await expect(
                contract.connect(otherUser).setExpirationTimeframe(2 * YEAR)
            ).to.be.revertedWith(
                'AccessControl: account 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 is missing role 0x0000000000000000000000000000000000000000000000000000000000000000'
            );
        });

        it('owner should be 0x0 for expired tokens', async () => {
            await contract.setMintPrice(hre.ethers.utils.parseEther('10.0'));
            await contract.mintMembership(otherUser.address, {
                value: hre.ethers.utils.parseEther('10.0'),
            });

            // move one second beyond one year so token is expired
            await time.increase(YEAR + 1);

            const tokenId = 1;
            expect(await contract.isExpired(tokenId)).to.be.true;

            const balance = await contract.balanceOf(
                otherUser.address,
                tokenId
            );
            expect(balance.eq(0)).to.be.true;
        });
    });
});
