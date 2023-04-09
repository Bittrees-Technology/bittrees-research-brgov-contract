// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";

contract BittreesResearchEquity is
    ERC1155Upgradeable,
    AccessControlUpgradeable
{
    using CountersUpgradeable for CountersUpgradeable.Counter;
    CountersUpgradeable.Counter private _tokenIds;
    uint256 public mintPriceBTREE;
    address public btreeContract;
    address public btreeTreasury;

    event BTREEPriceUpdated( 
        uint256 indexed oldValue,
        uint256 indexed newValue
    );

    event BTREEContractUpdated(
        address indexed oldAddress,
        address indexed newAddress
    );

    event BTREETreasuryUpdated(
        address indexed oldAddress,
        address indexed newAddress
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        mintPriceBTREE = 1000 ether;

        __ERC1155_init(
            "ipfs://QmXMsaYXedBE5BDXwXfNNWgoo36ZkY3XoNqecGFU97RZQh/1"
        );
        __AccessControl_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        override(ERC1155Upgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function setURI(string memory newuri) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _setURI(newuri);
    }

    function setMintPriceBTREE(
        uint256 _newPrice
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        // Mint price in wei
        emit BTREEPriceUpdated(mintPriceBTREE, _newPrice);
        mintPriceBTREE = _newPrice;
    }

    function setBTREEContract(
        address _btreeContract
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit BTREEContractUpdated(btreeContract, _btreeContract);
        btreeContract = _btreeContract;
    }

    function setBTREETreasury(
        address _btreeTreasury
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit BTREETreasuryUpdated(btreeTreasury, _btreeTreasury);
        btreeTreasury = _btreeTreasury;
    }

    function mintWithBTREE(address to) external payable returns (uint256) {
        require(mintPriceBTREE <= msg.value, "Not enough BTREE funds sent");

        _tokenIds.increment();
        uint256 newItemId = _tokenIds.current();
        _mint(to, newItemId, 1, "");

        return newItemId;
    }

    function withdraw() external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 _balance = address(this).balance;
        (bool success, ) = payable(msg.sender).call{value: _balance}("");
        require(success, "Unable to withdraw");
    }
}
