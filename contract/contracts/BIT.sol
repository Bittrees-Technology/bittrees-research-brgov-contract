// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";

/**
 * @title IBNote
 * @notice Interface for BNote contract extending ERC1155 with custom functions
 */
interface IBNote is IERC1155 {
    function totalBalanceOf(address account) external view returns (uint256);
}

/**
 * @title BIT Token
 * @notice ERC20 token that acts as a vault for BNote SFTs, providing fungible liquidity
 * @dev Users can mint BIT by depositing BNotes and redeem BNotes by burning BIT (with premium)
 */
contract BIT is
Initializable,
ERC20Upgradeable,
AccessControlUpgradeable,
UUPSUpgradeable,
ReentrancyGuardUpgradeable,
PausableUpgradeable,
IERC1155Receiver
{
    using SafeERC20 for IERC20;

    // Contract identification
    string public constant VERSION = "1.0.0";

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // Exchange rates: BNote denomination -> BIT tokens (in full token units)
    uint256 public immutable constant MINT_RATE_MULTIPLIER = 1000 * 10**decimals(); // 1 BNote (id 1) = 1000 BIT in major units

    // Redemption premium: defaults to 1% premium (1010 BIT to redeem 1 BNote of denomination 1)
    uint256 public redemptionPremiumPerUnit = 10 * 10**decimals(); // 1% or 10 BIT
    IBNote public bnoteContract;
    address public treasury;

    event TreasuryUpdated(address indexed newTreasury);
    event RedemptionPremiumUpdated(uint256 newPremium);
    event TokensMinted(address indexed account, uint256 amount, uint256[] bnoteIds, uint256[] bnoteAmounts);
    event TokensRedeemed(address indexed account, uint256 bitAmount, uint256[] bnoteIds, uint256[] bnoteAmounts);
    event TokensRescued(address token, address to, uint256 amount);
    event PremiumCollected(address indexed treasury, uint256 amount);

    error InvalidArrayLength();
    error ZeroAmount();
    error ZeroAddress();
    error TreasuryNotSet();
    error InsufficientBNoteBalance(uint256 id, uint256 requested, uint256 available);

    // Override required by multiple inheritance
    function supportsInterface(bytes4 interfaceId)
    public
    view
    override(AccessControlUpgradeable, IERC165)
    returns (bool)
    {
        return
            interfaceId == type(IERC1155Receiver).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    // UUPS authorization
    function _authorizeUpgrade(address newImplementation)
    internal
    override
    onlyRole(ADMIN_ROLE)
    {}

    function initialize(
        string memory name_,
        string memory symbol_,
        address admin_,
        address bnoteContract_
    ) public initializer {
        require(bnoteContract_ != address(0), ZeroAddress());

        __ERC20_init(name_, symbol_);
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        __Pausable_init();

        // Grant roles
        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(ADMIN_ROLE, admin_);

        // Set BNote contract (immutable after initialization)
        bnoteContract = IBNote(bnoteContract_);
    }

    // ADMIN FUNCTIONS

    function setTreasury(address newTreasury) external onlyRole(ADMIN_ROLE) {
        require(newTreasury != address(0), ZeroAddress());
        treasury = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }

    /**
    * @notice Set the redemption premium per BNote unit in BIT minor units
    * @param newPremium Premium in BIT tokens per BNote unit (e.g., 10 = 10 BIT premium per unit)
    */
    function setRedemptionPremium(uint256 newPremium) external onlyRole(ADMIN_ROLE) {
        redemptionPremiumPerUnit = newPremium;
        emit RedemptionPremiumUpdated(newPremium);
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    // Rescue accidentally sent ERC20 tokens (including BIT tokens)
    function rescueERC20(address token, address to, uint256 amount) external onlyRole(ADMIN_ROLE) {
        require(to != address(0), ZeroAddress());
        IERC20(token).safeTransfer(to, amount);
        emit TokensRescued(token, to, amount);
    }

    // USER FUNCTIONS

    /**
     * @notice Mint BIT tokens by depositing BNote SFTs
     * @param bnoteIds Array of BNote token IDs to deposit
     * @param bnoteAmounts Array of amounts for each BNote ID
     */
    function mint(
        uint256[] memory bnoteIds,
        uint256[] memory bnoteAmounts
    ) external nonReentrant whenNotPaused {

        uint256 totalBitToMint = _calculateMintAmount(
            bnoteIds,
            bnoteAmounts
        );

        // Transfer BNotes from user to this contract
        bnoteContract.safeBatchTransferFrom(
            msg.sender,
            address(this),
            bnoteIds,
            bnoteAmounts,
            ""
        );

        // Mint BIT tokens to user
        _mint(msg.sender, totalBitToMint);

        emit TokensMinted(msg.sender, totalBitToMint, bnoteIds, bnoteAmounts);
    }

    function _calculateMintAmount(
        uint256[] memory bnoteIds,
        uint256[] memory bnoteAmounts
    ) internal view returns (uint256) {
        require(bnoteIds.length == bnoteAmounts.length, InvalidArrayLength());
        require(bnoteIds.length > 0, ZeroAmount());

        uint256 totalBitToMint = 0;
        for (uint256 i = 0; i < bnoteIds.length; i++) {
            uint256 id = bnoteIds[i];
            uint256 amount = bnoteAmounts[i];

            require(amount > 0, ZeroAmount());

            totalBitToMint += id * amount * MINT_RATE_MULTIPLIER;
        }

        return totalBitToMint;
    }

    /**
     * @notice Redeem BNotes by burning BIT tokens (with premium)
     * @param bnoteIds Array of BNote token IDs to redeem
     * @param bnoteAmounts Array of amounts for each BNote ID
     */
    function redeem(
        uint256[] memory bnoteIds,
        uint256[] memory bnoteAmounts
    ) external nonReentrant whenNotPaused {
        require(treasury != address(0), TreasuryNotSet());

        (uint256 baseBits, uint256 premiumBits) = _calculateRedeemPrice(
            bnoteIds,
            bnoteAmounts
        );

        // Burn user's BIT tokens
        _burn(msg.sender, baseBits);

        // Mint premium to treasury if there's a premium
        if (premiumBits > 0) {
            _transfer(msg.sender, treasury, premiumBits);
            emit PremiumCollected(treasury, premiumBits);
        }

        // Transfer BNotes to user
        bnoteContract.safeBatchTransferFrom(
            address(this),
            msg.sender,
            bnoteIds,
            bnoteAmounts,
            ""
        );

        emit TokensRedeemed(
            msg.sender,
            baseBits + premiumBits,
            bnoteIds,
            bnoteAmounts
        );
    }

    /**
    * @notice Calculate how much BIT is required to redeem given BNotes (including premium)
    * @param bnoteIds Array of BNote token IDs
    * @param bnoteAmounts Array of amounts for each BNote ID
    * @return baseBits - amount in BIT tokens to be burned
    * @return premiumBits - amount in BIT tokens to be paid to the treasury
    */
    function _calculateRedeemPrice(
        uint256[] memory bnoteIds,
        uint256[] memory bnoteAmounts
    ) internal view returns (uint256 baseBits, uint256 premiumBits) {
        require(bnoteIds.length == bnoteAmounts.length, InvalidArrayLength());
        require(bnoteIds.length > 0, ZeroAmount());

        uint256 totalBNote = 0;
        for (uint256 i = 0; i < bnoteIds.length; i++) {
            uint256 id = bnoteIds[i];
            uint256 amount = bnoteAmounts[i];

            require(amount > 0, ZeroAmount());

            // Check if contract has enough BNotes
            uint256 availableBalance = bnoteContract.balanceOf(address(this), id);
            require(availableBalance >= amount, InsufficientBNoteBalance(id, amount, availableBalance));

            totalBNote += id * amount;
        }

        uint256 baseBits = totalBNote * MINT_RATE_MULTIPLIER * 10**decimals();
        uint256 premiumBits = totalBNote * redemptionPremiumPerUnit;

        return (baseBits, premiumBits);
    }

    // VIEW FUNCTIONS

    /**
     * @notice Calculate how much BIT would be minted for given BNotes
     * @param bnoteIds Array of BNote token IDs
     * @param bnoteAmounts Array of amounts for each BNote ID
     * @return Total BIT tokens that would be minted
     */
    function calculateMintAmount(
        uint256[] memory bnoteIds,
        uint256[] memory bnoteAmounts
    ) external view returns (uint256) {
        return _calculateMintAmount(bnoteIds, bnoteAmounts);
    }

    /**
     * @notice Calculate how much BIT is required to redeem given BNotes (including premium)
     * @param bnoteIds Array of BNote token IDs
     * @param bnoteAmounts Array of amounts for each BNote ID
     * @return baseBits - amount in BIT tokens to be burned
     * @return premiumBits - amount in BIT tokens to be paid to the treasury
     */
    function calculateRedeemPrice(
        uint256[] memory bnoteIds,
        uint256[] memory bnoteAmounts
    ) external view returns (uint256 totalRequired, uint256 premium) {
        return _calculateRedeemPrice(bnoteIds, bnoteAmounts);
    }

    /**
     * @notice Get the current balance of BNotes held by the contract for a specific denomination
     * @param bnoteId The BNote token ID
     * @return The amount of BNotes held for that denomination
     */
    function getBNoteBalance(uint256 bnoteId) external view returns (uint256) {
        return bnoteContract.balanceOf(address(this), bnoteId);
    }

    /**
     * @notice Get the total value of all BNotes held by the contract (using BNote's totalBalanceOf function)
     * @return The total value of BNotes held (1*count + 10*count + 100*count + ...)
     */
    function getTotalBNoteValue() external view returns (uint256) {
        return bnoteContract.totalBalanceOf(address(this));
    }

    // ERC1155 Receiver functions - these reject direct transfers to maintain proper accounting
    // Users must use the mint() function instead of sending BNotes directly
    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external pure override returns (bytes4) {
        // Reject all direct transfers - forces users to use mint() function
        return bytes4(0);
    }

    function onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external pure override returns (bytes4) {
        // Reject all direct transfers - forces users to use mint() function
        return bytes4(0);
    }
}