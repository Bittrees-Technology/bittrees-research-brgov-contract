// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";

contract BAGMembership is ERC1155Upgradeable, AccessControlUpgradeable {
    using CountersUpgradeable for CountersUpgradeable.Counter;
    CountersUpgradeable.Counter private _tokenIds;
    uint256 public mintPrice;
    mapping(uint256 => uint256) public expirationTimestamps; // tokenId and its expiration date in seconds since Epoch
    uint256 public expirationTimeframe;

    event MemberJoined(address indexed member, uint256 indexed tokenId);
    event MintPriceUpdated(uint256 indexed oldValue, uint256 indexed newValue);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        mintPrice = 0.01 ether;
        expirationTimeframe = 52 weeks;

        __ERC1155_init("ipfs://QmXMsaYXedBE5BDXwXfNNWgoo36ZkY3XoNqecGFU97RZQh/1");
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

    function setMintPrice(
        uint256 _newPrice
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        // Mint price in wei
        emit MintPriceUpdated(mintPrice, _newPrice);
        mintPrice = _newPrice;
    }

    function setExpirationTimeframe(
        uint256 newExpirationTimeframe
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        expirationTimeframe = newExpirationTimeframe;
    }

    function mintMembership(address to) external payable returns (uint256) {
        require(mintPrice <= msg.value, "Not enough funds sent");

        _tokenIds.increment();
        uint256 newItemId = _tokenIds.current();
        _mint(to, newItemId, 1, "");
        expirationTimestamps[newItemId] = block.timestamp + expirationTimeframe;

        emit MemberJoined(to, newItemId);

        return newItemId;
    }

    function withdraw() external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 _balance = address(this).balance;
        (bool success, ) = payable(msg.sender).call{value: _balance}("");
        require(success, "Unable to withdraw");
    }

    function isExpired(uint256 tokenId) public view returns (bool) {
        return expirationTimestamps[tokenId] < block.timestamp;
    }

    function setExpiration(
        uint256 tokenId,
        uint256 timestamp
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        expirationTimestamps[tokenId] = timestamp;
    }

    function balanceOf(
        address account,
        uint256 tokenId
    ) public view virtual override returns (uint256) {
        if (isExpired(tokenId)) return (0x0);
        return super.balanceOf(account, tokenId);
    }
}
