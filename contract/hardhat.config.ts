import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    hardhat: {
      // This setting helps testing chainId conditionals
      chainId: 31337
    }
  },
  // Optional: Configure TypeChain
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  }
};

export default config;