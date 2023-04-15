// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

// import "hardhat/console.sol";

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";

interface IERC20 {
    function totalSupply() external view returns (uint256);

    function balanceOf(address account) external view returns (uint256);

    function allowance(
        address owner,
        address spender
    ) external view returns (uint256);

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);

    function approve(address spender, uint256 amount) external returns (bool);
}

contract BittreesResearchEquity is
    ERC1155Upgradeable,
    AccessControlUpgradeable
{
    using CountersUpgradeable for CountersUpgradeable.Counter;
    CountersUpgradeable.Counter private _tokenIds;
    uint256 public mintPriceBTREE;
    IERC20 public btreeContract;
    address public btreeTreasury;

    event BTREEPriceUpdated(uint256 indexed oldValue, uint256 indexed newValue);

    event BTREEContractUpdated(
        IERC20 indexed oldAddress,
        IERC20 indexed newAddress
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
        btreeContract = IERC20(0x1Ca23BB7dca2BEa5F57552AE99C3A44fA7307B5f); // goerli
        btreeTreasury = 0x1Ca23BB7dca2BEa5F57552AE99C3A44fA7307B5f;

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
        IERC20 _btreeContract
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit BTREEContractUpdated(btreeContract, _btreeContract);
        btreeContract = IERC20(_btreeContract);
    }

    function setBTREETreasury(
        address _btreeTreasury
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit BTREETreasuryUpdated(btreeTreasury, _btreeTreasury);
        btreeTreasury = _btreeTreasury;
    }

    function mintWithBTREE(address to, uint256 mintCount) external payable {
        require(btreeTreasury != address(0), "BTREE treasury not set");

        require(btreeContract != IERC20(address(0)), "BTREE contract not set");
        uint256 _balance = IERC20(btreeContract).balanceOf(to);

        uint256 _totalPrice = mintPriceBTREE * mintCount;
        require(_totalPrice <= _balance, "Not enough BTREE funds sent");

        require(
            btreeContract.allowance(to, address(this)) >= _totalPrice,
            "Insufficient allowance"
        );
        bool successfulTransfer = IERC20(btreeContract).transferFrom(
            to,
            btreeTreasury,
            mintPriceBTREE
        );
        require(successfulTransfer, "Unable to transfer BTREE to treasury");

        for (uint i = 0; i < mintCount; i++) {
            _tokenIds.increment();
            uint256 newItemId = _tokenIds.current();
            _mint(to, newItemId, 1, "");
        }
    }

    function withdraw() external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 _balance = address(this).balance;
        (bool success, ) = payable(msg.sender).call{value: _balance}("");
        require(success, "Unable to withdraw");
    }
}
