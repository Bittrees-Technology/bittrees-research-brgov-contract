// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract BNote is Initializable, ERC1155Upgradeable, AccessControlUpgradeable, UUPSUpgradeable {


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
    event PaymentTokenUpdated(address token, bool active, uint256 mintPrice);
    event TokensMinted(address indexed account, uint256[] tokenIds, uint256[] amounts);

    // provided by both inherited contract so must be overridden to avoid conflicts
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

        // Grant roles
        _grantRole(DEFAULT_ADMIN_ROLE, admin_);    // Bittrees Research multisig
        _grantRole(ADMIN_ROLE, admin_);

        // Set storage
        treasury = treasury_;
        _baseMetadataURI = baseURI_;

        // One-time mint logic
        // Only used on Ethereum mainnet for airdropping existing holders as part of the contract migration
        if (block.chainid == 1) {
            _mint(treasury_, ID_ONE, 1000, "");
            _mint(treasury_, ID_TEN, 100, "");
            _mint(treasury_, ID_HUNDRED, 10, "");
        }
    }

    function setBaseURI(string memory newBaseURI) external onlyRole(ADMIN_ROLE) {
        _baseMetadataURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
    }

    function setTreasury(address newTreasury) external onlyRole(ADMIN_ROLE) {
        treasury = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }

    function setPaymentToken(address token, bool active, uint256 mintPrice) external onlyRole(ADMIN_ROLE) {
        paymentTokens[token] = PaymentToken(active, mintPrice);
        emit PaymentTokenUpdated(token, active, mintPrice);
    }

    function mintBatch(uint256[] memory tokenIds, uint256[] memory amounts, address paymentToken) external {
        require(tokenIds.length == amounts.length, "Array length mismatch");
        require(paymentTokens[paymentToken].active, "Payment token not accepted");

        uint256 totalCost = 0;
        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint tokenId = tokenIds[i];
            require(
                tokenId == 1 || tokenId == 10 || tokenId == 100,
                "Invalid tokenId");
            totalCost +=
                paymentTokens[paymentToken].mintPriceForOneNote
                * amounts[i]
                * tokenId;
        }

        require(
            IERC20(paymentToken).transferFrom(msg.sender, treasury, totalCost),
            "Payment failed"
        );
        _mintBatch(msg.sender, tokenIds, amounts, "");
        emit TokensMinted(msg.sender, tokenIds, amounts);
    }

    function baseMetadataURI() external view returns (string memory) {
        return _baseMetadataURI;
    }
}
