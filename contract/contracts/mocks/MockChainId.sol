// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// purely for testing the chainId logic in the BNote initialize function
contract MockChainId {
    // Mimics the chainId check in the BNote contract
    function wouldMintOnChain(uint256 targetChainId) public pure returns (bool) {
        return targetChainId == 1; // Same condition as in the BNote initialize function
    }

    // Returns the current chain ID for verification
    function getCurrentChainId() public view returns (uint256) {
        return block.chainid;
    }
}