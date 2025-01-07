// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract BRGOV is ERC1155, Ownable {
    using Strings for uint256;

    // 3 ID constants
    uint256 public constant ID_ONE = 1;
    uint256 public constant ID_TEN = 10;
    uint256 public constant ID_HUNDRED = 100;

    // Price multipliers
    uint256 public constant MULTIPLIER_ONE = 1;
    uint256 public constant MULTIPLIER_TEN = 10;
    uint256 public constant MULTIPLIER_HUNDRED = 100;

    // Payment token config
    struct PaymentToken {
        bool active;           // can it be used?
        uint256 mintPrice;     // price for "1" unit, in ERC20's smallest units
    }

    // Map from tokenAddress => PaymentToken config
    mapping(address => PaymentToken) public paymentTokens;

    // Single treasury for all tokens
    address public treasury;

    // Base URI
    string private _baseMetadataURI;

    /**
     * @dev Regular constructor: sets up base URI, treasury, optionally
     *      mints some tokens to the treasury for airdrop if you choose.
     */
    constructor(
        string memory baseURI_,
        address treasury_,
        uint256 amountOne,
        uint256 amountTen,
        uint256 amountHundred
    ) ERC1155("") {
        _baseMetadataURI = baseURI_;
        treasury = treasury_;

        // For migration purposes. Mint tokens to the treasury for each already issued by
        // the deprecated contract so they can be airdropped to current holders
        if (amountOne > 0) {
            _mint(treasury, ID_ONE, amountOne, "");
        }
        if (amountTen > 0) {
            _mint(treasury, ID_TEN, amountTen, "");
        }
        if (amountHundred > 0) {
            _mint(treasury, ID_HUNDRED, amountHundred, "");
        }

    }

    /**
     * @dev Override ERC1155 uri() to show "base + tokenId"
     */
    function uri(uint256 tokenId) public view override returns (string memory) {
        return string(abi.encodePacked(_baseMetadataURI, tokenId.toString()));
    }

    // -----------------------------
    // Owner (admin) methods
    // -----------------------------

    /**
     * @dev Set base metadata URI
     */
    function setBaseURI(string memory newBaseURI) external onlyOwner {
        _baseMetadataURI = newBaseURI;
    }

    /**
     * @dev Update the treasury address
     */
    function setTreasury(address newTreasury) external onlyOwner {
        treasury = newTreasury;
    }

    /**
     * @dev Enable or update a payment token
     * e.g. setPaymentToken(0xWBTC, true, 100_000);
     * means "this contract is active, price is 0.001 WBTC for 1 base token"
     */
    function setPaymentToken(
        address token,
        bool active,
        uint256 mintPrice
    ) external onlyOwner {
        paymentTokens[token] = PaymentToken({
            active: active,
            mintPrice: mintPrice
        });
    }

    /**
     * @dev Disable a payment token by setting `active=false`
     */
    function disablePaymentToken(address token) external onlyOwner {
        paymentTokens[token].active = false;
    }

    // -----------------------------
    // Public minting logic
    // -----------------------------

    /**
     * @dev Mint multiple IDs in a single call, paying with a chosen ERC20.
     * @param paymentToken The ERC20 to pay with
     * @param tokenIds Array of token IDs (e.g. [1,10,100,1])
     * @param amounts Matching array of amounts (e.g. [5,3,1,2])
     * Note that each "ID_TEN" effectively costs 10x the "ID_ONE" mintPrice, etc.
     */
    function mintBatch(
        address paymentToken,
        uint256[] memory tokenIds,
        uint256[] memory amounts
    ) external {
        require(tokenIds.length == amounts.length, "Mismatched array lengths");
        require(tokenIds.length > 0, "Nothing to mint");

        PaymentToken memory pt = paymentTokens[paymentToken];
        require(pt.active, "Payment token not active");

        // Sum total cost
        uint256 totalCost;
        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(
                tokenIds[i] == ID_ONE || tokenIds[i] == ID_TEN || tokenIds[i] == ID_HUNDRED,
                "Invalid tokenId"
            );
            require(amounts[i] > 0, "Mint amount zero?");

            // figure out multiplier
            uint256 multiplier = (
                tokenIds[i] == ID_ONE
                    ? MULTIPLIER_ONE
                    : (tokenIds[i] == ID_TEN ? MULTIPLIER_TEN : MULTIPLIER_HUNDRED)
            );

            uint256 costForThisLine = pt.mintPrice * multiplier * amounts[i];
            totalCost += costForThisLine;
        }

        // Pull the total ERC20 in one go
        IERC20 erc20 = IERC20(paymentToken);
        require(
            erc20.allowance(msg.sender, address(this)) >= totalCost,
            "Allowance not set"
        );
        bool ok = erc20.transferFrom(msg.sender, treasury, totalCost);
        require(ok, "TransferFrom failed");

        // Now do batch mint
        _mintBatch(msg.sender, tokenIds, amounts, "");
    }
}
