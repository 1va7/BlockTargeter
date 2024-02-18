"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { ethers } = require("hardhat");
require("dotenv/config");
async function main() {
    const OracleConsumerContract = await ethers.getContractFactory("OracleConsumerContract");
    const [deployer] = await ethers.getSigners();
    const consumerSC = process.env["LOCALHOST_CONSUMER_CONTRACT_ADDRESS"] || "";
    if (!consumerSC) {
        console.error("Error: Please provide LOCALHOST_CONSUMER_CONTRACT_ADDRESS");
        process.exit(1);
    }
    const consumer = OracleConsumerContract.attach(consumerSC);
    console.log("Pushing a request...");
    await consumer.connect(deployer).request("0xeaf55242a90bb3289db8184772b0b98562053559");
    consumer.on("ResponseReceived", async (reqId, requester, target, score) => {
        console.info("Received event [ResponseReceived]:", {
            reqId,
            requester,
            target,
            score,
        });
        process.exit();
    });
    consumer.on("ErrorReceived", async (reqId, requester, target, error) => {
        console.info("Received event [ErrorReceived]:", {
            reqId,
            requester,
            target,
            error,
        });
        process.exit();
    });
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
