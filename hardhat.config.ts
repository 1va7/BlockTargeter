require('dotenv').config();
const { HardhatUserConfig } = require('hardhat/config');
require('@nomicfoundation/hardhat-toolbox');
const { ProxyAgent, setGlobalDispatcher } = require('undici');

if (process.env.http_proxy || process.env.https_proxy) {
  const proxy = process.env.http_proxy || process.env.https_proxy;
  const proxyAgent = new ProxyAgent(proxy);
  setGlobalDispatcher(proxyAgent);
}

// 如果未设置，则使用hardhat账户0的私钥
const DEPLOYER_PRIVATE_KEY =
  process.env.DEPLOYER_PRIVATE_KEY ?? "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
// 在https://polygonscan.com获取免费的POLYGONSCAN_API_KEY
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY || '';

const config = {
  solidity: "0.8.17",
  networks: {
    polygon: {
      // 如果未设置，可以在https://dashboard.alchemyapi.io或https://infura.io获取您自己的Alchemy API密钥
      url: process.env.POLYGON_RPC_URL ?? '',
      accounts: [DEPLOYER_PRIVATE_KEY],
    },
    mumbai: {
      // 如果未设置，可以在https://dashboard.alchemyapi.io或https://infura.io获取您自己的Alchemy API密钥
      url: process.env.MUMBAI_RPC_URL ?? '',
      accounts: [DEPLOYER_PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: POLYGONSCAN_API_KEY,
  },
};

module.exports = config;
