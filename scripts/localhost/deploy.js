"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { ethers } = require("hardhat");
require("dotenv/config");
async function main() {
    const OracleConsumerContract = await ethers.getContractFactory("OracleConsumerContract");
    const [deployer] = await ethers.getSigners();
    console.log("Deploying...");
    const consumer = await OracleConsumerContract.deploy(deployer.address);
    await consumer.deployed();
    console.log("Deployed", {
        consumer: consumer.address,
    });
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
