// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// Mock upgrade version of BNote for testing upgrades
import "../BNote.sol";

contract BNoteV2Mock is BNote {
    function version() external pure returns (string memory) {
        return "v2";
    }
}