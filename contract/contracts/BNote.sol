// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract BNote is
Initializable,
ERC1155Upgradeable,
AccessControlUpgradeable,
UUPSUpgradeable,
ReentrancyGuardUpgradeable,
PausableUpgradeable
{
    using Strings for uint256;
    using SafeERC20 for IERC20;

    // Contract identification
    string public constant NAME = "Bittrees Preferred Stock Notes";
    string public constant SYMBOL = "BNOTE";
    string public constant VERSION = "2.0.0";

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    uint256 public constant ID_ONE = 1;
    uint256 public constant ID_TEN = 10;
    uint256 public constant ID_HUNDRED = 100;

    address public treasury;
    string private _baseMetadataURI;

    struct PaymentToken {
        bool active;
        uint256 mintPriceForOneNote;
    }

    mapping(address => PaymentToken) public paymentTokens;

    event BaseURIUpdated(string newBaseURI);
    event TreasuryUpdated(address newTreasury);
    event PaymentTokenUpdated(address indexed token, bool active, uint256 mintPrice);
    event TokensMinted(address indexed account, uint256[] tokenIds, uint256[] amounts);
    event TokensRescued(address token, address to, uint256 amount);

    // provided by both inherited contracts so must be overridden to avoid conflicts
    function supportsInterface(bytes4 interfaceId)
    public
    view
    override(ERC1155Upgradeable, AccessControlUpgradeable)
    returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // provided as an abstract method so must be overridden
    function _authorizeUpgrade(address newImplementation)
    internal
    override
    onlyRole(ADMIN_ROLE)
    {}

    function initialize(
        string memory baseURI_,
        address treasury_,
        address admin_
    ) public initializer {
        __ERC1155_init(baseURI_);
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        __Pausable_init();

        // Validate treasury address
        require(treasury_ != address(0), "Treasury cannot be zero address");

        // Grant roles
        _grantRole(DEFAULT_ADMIN_ROLE, admin_);    // Bittrees Research multisig
        _grantRole(ADMIN_ROLE, admin_);

        // Set storage
        treasury = treasury_;
        _baseMetadataURI = baseURI_;

        // ===== ONE-TIME MINT LOGIC =====
        // Only used on Ethereum mainnet and testnet for airdropping existing holders as part of the
        // non-upgrade migration from contract v1 to v2
        if (block.chainid == 1 || block.chainid == 11155111) {
            _mint(treasury_, ID_ONE, 50, "");
            _mint(treasury_, ID_TEN, 55, "");
            _mint(treasury_, ID_HUNDRED, 48, "");
        }
    }

    // ADMIN FUNCTIONS

    function setBaseURI(string memory newBaseURI) external onlyRole(ADMIN_ROLE) {
        _baseMetadataURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
    }

    function setTreasury(address newTreasury) external onlyRole(ADMIN_ROLE) {
        require(newTreasury != address(0), "Treasury cannot be zero address");
        treasury = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }

    function setPaymentToken(address token, bool active, uint256 mintPrice) external onlyRole(ADMIN_ROLE) {
        require(token != address(0), "Token cannot be zero address");
        paymentTokens[token] = PaymentToken(active, mintPrice);
        emit PaymentTokenUpdated(token, active, mintPrice);
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    // Batch set multiple payment tokens at once for efficiency
    function setPaymentTokenBatch(
        address[] memory tokens,
        bool[] memory actives,
        uint256[] memory mintPrices
    ) external onlyRole(ADMIN_ROLE) {
        require(
            tokens.length == actives.length && tokens.length == mintPrices.length,
            "Array length mismatch"
        );

        for (uint256 i = 0; i < tokens.length; i++) {
            require(tokens[i] != address(0), "Token cannot be zero address");
            paymentTokens[tokens[i]] = PaymentToken(actives[i], mintPrices[i]);
            emit PaymentTokenUpdated(tokens[i], actives[i], mintPrices[i]);
        }
    }

    // Rescue accidentally sent ERC20 tokens
    function rescueERC20(address token, address to, uint256 amount) external onlyRole(ADMIN_ROLE) {
        require(to != address(0), "Cannot send to zero address");
        IERC20(token).safeTransfer(to, amount);
        emit TokensRescued(token, to, amount);
    }

    // USER FUNCTIONS

    function mintBatch(uint256[] memory tokenIds, uint256[] memory amounts, address paymentToken)
    external
    nonReentrant
    whenNotPaused
    {
        require(tokenIds.length == amounts.length, "Array length mismatch");
        require(paymentTokens[paymentToken].active, "Payment token not accepted");

        uint256 totalCost = 0;

        // Check if all mints are valid and calculate total cost
        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            require(
                tokenId == ID_ONE || tokenId == ID_TEN || tokenId == ID_HUNDRED,
                "Invalid tokenId"
            );

            totalCost +=
                paymentTokens[paymentToken].mintPriceForOneNote
                * amounts[i]
                * tokenId;
        }

        // Process payment with SafeERC20
        IERC20(paymentToken).safeTransferFrom(msg.sender, treasury, totalCost);

        // Mint tokens to purchaser after payment is complete
        _mintBatch(msg.sender, tokenIds, amounts, "");
        emit TokensMinted(msg.sender, tokenIds, amounts);
    }

    // VIEW FUNCTIONS

    function baseMetadataURI() external view returns (string memory) {
        return _baseMetadataURI;
    }

    function uri(uint256 id) public view override returns (string memory) {
        require(id == ID_ONE || id == ID_TEN || id == ID_HUNDRED, "Invalid token ID");
        return string.concat(_baseMetadataURI, id.toString(), ".json");
    }

    function contractURI() public view returns (string memory) {
        return string.concat(_baseMetadataURI, "contract.json");
    }
}