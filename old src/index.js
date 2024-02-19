"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// *** YOU ARE LIMITED TO THE FOLLOWING IMPORTS TO BUILD YOUR PHAT CONTRACT     ***
// *** ADDING ANY IMPORTS WILL RESULT IN ERRORS & UPLOADING YOUR CODE TO PHALA  ***
// *** NETWORK WILL FAIL. IF YOU WANT TO KNOW MORE, JOIN OUR DISCORD TO SPEAK   ***
// *** WITH THE PHALA TEAM AT https://discord.gg/5HfmWQNX THANK YOU             ***
// *** FOR DOCS ON HOW TO CUSTOMIZE YOUR PC 2.0 https://bit.ly/customize-pc-2-0 ***
require("@phala/pink-env");
const viem_1 = require("viem");
const encodeReplyAbiParams = 'uint respType, uint id, address requester, uint256 score';
const decodeRequestAbiParams = 'uint id, address sender, address target';
function encodeReply(abiParams, reply) {
    return (0, viem_1.encodeAbiParameters)((0, viem_1.parseAbiParameters)(abiParams), reply);
}
function decodeRequest(abiParams, request) {
    return (0, viem_1.decodeAbiParameters)((0, viem_1.parseAbiParameters)(abiParams), request);
}
// Defined in OracleConsumerContract.sol
const TYPE_RESPONSE = 0;
const TYPE_ERROR = 2;
var Error;
(function (Error) {
    Error["BadRequestString"] = "BadRequestString";
    Error["FailedToFetchData"] = "FailedToFetchData";
    Error["FailedToDecode"] = "FailedToDecode";
    Error["MalformedRequest"] = "MalformedRequest";
})(Error || (Error = {}));
function errorToCode(error) {
    switch (error) {
        case Error.BadRequestString:
            return 1;
        case Error.FailedToFetchData:
            return 2;
        case Error.FailedToDecode:
            return 3;
        case Error.MalformedRequest:
            return 4;
        default:
            return 0;
    }
}
function stringToHex(str) {
    var hex = "";
    for (var i = 0; i < str.length; i++) {
        hex += str.charCodeAt(i).toString(16);
    }
    return "0x" + hex;
}
function fetchApiStats(apiUrl, apiKey, requester, target) {
    let headers = {
        "Content-Type": "application/json",
        "User-Agent": "phat-contract",
        "Authorization": `${apiKey}`
    };
    const sentTokensToTarget = JSON.stringify({ query: `
  query GetTokenTransfers { ethereum: TokenTransfers(input: {filter: {from: {_in: ["${requester}"]}, to: {_eq: "${target}"}}, blockchain: ethereum}) { TokenTransfer { from { addresses domains { name } socials { dappName profileName profileTokenId profileTokenIdHex userId userAssociatedAddresses } } to { addresses domains { name } socials { dappName profileName profileTokenId profileTokenIdHex userId userAssociatedAddresses } } transactionHash } } polygon: TokenTransfers(input: {filter: {from: {_in: ["${requester}"]}, to: {_eq: "${target}"}}, blockchain: polygon}) { TokenTransfer { from { addresses domains { name } socials { dappName profileName profileTokenId profileTokenIdHex userId userAssociatedAddresses } } to { addresses domains { name } socials { dappName profileName profileTokenId profileTokenIdHex userId userAssociatedAddresses } } transactionHash } } }
  ` });
    const hasLensProfile = JSON.stringify({ query: `
  query GetLensProfile { Socials( input: { filter: { dappName: { _eq: lens } identity: { _in: ["${target}"] } } blockchain: ethereum } ) { Social { profileName profileTokenId profileTokenIdHex }}}
  ` });
    const hasFarcasterAccount = JSON.stringify({ query: `
  query GetFarcasterAccount { Socials( input: { filter: { dappName: { _eq: farcaster } identity: { _in: ["${target}"] } } blockchain: ethereum } ) { Social { profileName userId userAssociatedAddresses }}}
  ` });
    const hasPrimaryEns = JSON.stringify({ query: `
  query GetPrimaryEns { Domains(input: {filter: {owner: {_in: ["${target}"]}, isPrimary: {_eq: true}}, blockchain: ethereum}) { Domain { name owner isPrimary }}}
  ` });
    const hasCommonPoaps = JSON.stringify({ query: `
  query CommonPoaps { Poaps( input: { filter: { owner: { _eq: "${target}" } } blockchain: ALL limit: 100 }) { Poap { poapEvent { poaps(input: { filter: { owner: { _eq: "${requester}" } } }) { eventId mintHash poapEvent { eventName eventURL isVirtualEvent }}}}}}
  ` });
    //
    // In Phat Contract runtime, we not support async/await, you need use `pink.batchHttpRequest` to
    // send http request. The Phat Contract will return an array of response.
    //
    let responses = pink.batchHttpRequest([
        { url: apiUrl, method: "POST", headers, body: stringToHex(sentTokensToTarget), returnTextBody: true },
        { url: apiUrl, method: "POST", headers, body: stringToHex(hasLensProfile), returnTextBody: true },
        { url: apiUrl, method: "POST", headers, body: stringToHex(hasFarcasterAccount), returnTextBody: true },
        { url: apiUrl, method: "POST", headers, body: stringToHex(hasPrimaryEns), returnTextBody: true },
        { url: apiUrl, method: "POST", headers, body: stringToHex(hasCommonPoaps), returnTextBody: true },
    ], 10000 // Param for timeout in milliseconds. Your Phat Contract script has a timeout of 10 seconds
    ); // Notice the [0]. This is important bc the `pink.batchHttpRequest` function expects an array of up to 5 HTTP requests.
    return computeTrustScore(responses);
}
function getResponseBody(response) {
    if (response.statusCode !== 200) {
        console.log(`Fail to read api with status code: ${response.statusCode}, error: ${response.error || response.body}}`);
        throw Error.FailedToFetchData;
    }
    if (typeof response.body !== "string") {
        throw Error.FailedToDecode;
    }
    // console.log(response.body);
    return JSON.parse(response.body);
}
function computeTrustScore(responses) {
    let result = 0;
    // Weight values are indexed to map to the index of the responses. e.g. responses[n] => weightValues[n]
    const weightValues = [10, 7, 7, 10, 7];
    const sentTokensToTargetResponseBody = getResponseBody(responses[0]);
    result += (sentTokensToTargetResponseBody.data?.ethereum.TokenTransfer?.length ?? 0) * weightValues[0];
    console.log(`Tokens Sent on ETH Check... Result [${result}]`);
    result += (sentTokensToTargetResponseBody.data?.polygon.TokenTransfer?.length ?? 0) * weightValues[0];
    console.log(`Tokens Sent on ETH Check... Result [${result}]`);
    const hasLensProfileResponseBody = getResponseBody(responses[1]);
    result += (hasLensProfileResponseBody.data?.Socials.Social ?? false) ? weightValues[1] : 0;
    console.log(`Lens Profile Check... Result [${result}]`);
    const hasFarcasterAccountResponseBody = getResponseBody(responses[2]);
    result += (hasFarcasterAccountResponseBody.data?.Socials.Social ?? false) ? weightValues[2] : 0;
    console.log(`Farcaster Account Check... Result [${result}]`);
    const hasPrimaryEnsResponseBody = getResponseBody(responses[3]);
    const ensDomains = hasPrimaryEnsResponseBody.data?.Domains.Domain ?? [];
    if (ensDomains.length > 0) {
        for (const ensDomain of ensDomains) {
            if (ensDomain.isPrimary) {
                result += weightValues[3];
                console.log(`Primary ENS Account. Result [${result}]`);
            }
        }
    }
    const hasCommonPoapsResponseBody = getResponseBody(responses[4]);
    const commonPoaps = hasCommonPoapsResponseBody.data?.Poaps.Poap ?? [];
    for (const commonPoap of commonPoaps) {
        if (commonPoap?.poaps != null) {
            result += weightValues[4];
        }
    }
    console.log(`Common POAPs Check... Result[${result}]`);
    return result;
}
//
// Here is what you need to implemented for Phat Contract, you can customize your logic with
// JavaScript here.
//
// The Phat Contract will be called with two parameters:
//
// - request: The raw payload from the contract call `request` (check the `request` function in TestLensApiConsumerConract.sol).
//            In this example, it's a tuple of two elements: [requestId, profileId]
// - secrets: The custom secrets you set with the `config_core` function of the Action Offchain Rollup Phat Contract. In
//            this example, it just a simple text of the lens api url prefix. For more information on secrets, checkout the SECRETS.md file.
//
// Your returns value MUST be a hex string, and it will send to your contract directly. Check the `_onMessageReceived` function in
// OracleConsumerContract.sol for more details. We suggest a tuple of three elements: [successOrNotFlag, requestId, data] as
// the return value.
//
function main(request, secrets) {
    console.log(`handle req: ${request}`);
    // Uncomment to debug the `secrets` passed in from the Phat Contract UI configuration.
    // console.log(`secrets: ${secrets}`);
    let requestId, requesterAddress, targetAddress, parsedSecrets;
    try {
        [requestId, requesterAddress, targetAddress] = decodeRequest(`${decodeRequestAbiParams}`, request);
        console.log(`[${requestId}]: ${requesterAddress} ${targetAddress}`);
        parsedSecrets = JSON.parse(secrets);
    }
    catch (error) {
        console.info("Malformed request received");
        return encodeReply(encodeReplyAbiParams, [TYPE_ERROR, 0n, 0x0000000000000000000000000000000000000000, errorToCode(error)]);
    }
    console.log(`Request received for profile ${requesterAddress} ${targetAddress}`);
    try {
        const targetAddressScore = fetchApiStats(parsedSecrets.apiUrl, parsedSecrets.apiKey, requesterAddress, targetAddress);
        console.log("response:", [TYPE_RESPONSE, requestId, requesterAddress, targetAddressScore]);
        return encodeReply(encodeReplyAbiParams, [TYPE_RESPONSE, requestId, requesterAddress, targetAddressScore]);
    }
    catch (error) {
        if (error === Error.FailedToFetchData) {
            throw error;
        }
        else {
            // otherwise tell client we cannot process it
            console.log("error:", [TYPE_ERROR, requestId, requesterAddress, error]);
            return encodeReply(encodeReplyAbiParams, [TYPE_ERROR, requestId, requesterAddress, errorToCode(error)]);
        }
    }
}
exports.default = main;
