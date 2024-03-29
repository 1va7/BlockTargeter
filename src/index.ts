// *** YOU ARE LIMITED TO THE FOLLOWING IMPORTS TO BUILD YOUR PHAT CONTRACT     ***
// *** ADDING ANY IMPORTS WILL RESULT IN ERRORS & UPLOADING YOUR CODE TO PHALA  ***
// *** NETWORK WILL FAIL. IF YOU WANT TO KNOW MORE, JOIN OUR DISCORD TO SPEAK   ***
// *** WITH THE PHALA TEAM AT https://discord.gg/5HfmWQNX THANK YOU             ***
// *** FOR DOCS ON HOW TO CUSTOMIZE YOUR PC 2.0 https://bit.ly/customize-pc-2-0 ***
import "@phala/pink-env";
import {decodeAbiParameters, encodeAbiParameters, parseAbiParameters} from "viem";

type HexString = `0x${string}`;
const encodeReplyAbiParams = 'uint respType, uint id, address requester, uint256 score';
const decodeRequestAbiParams = 'uint id, address sender, address target';

function encodeReply(abiParams: string, reply: any): HexString {
  return encodeAbiParameters(parseAbiParameters(abiParams),
      reply
  );
}

function decodeRequest(abiParams: string, request: HexString): any {
  return decodeAbiParameters(parseAbiParameters(abiParams),
      request
  );
}

// Defined in OracleConsumerContract.sol
const TYPE_RESPONSE = 0;
const TYPE_ERROR = 2;

enum Error {
  BadRequestString = "BadRequestString",
  FailedToFetchData = "FailedToFetchData",
  FailedToDecode = "FailedToDecode",
  MalformedRequest = "MalformedRequest",
}

function errorToCode(error: Error): number {
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
function stringToHex(str: string): string {
  var hex = "";
  for (var i = 0; i < str.length; i++) {
    hex += str.charCodeAt(i).toString(16);
  }
  return "0x" + hex;
}

function fetchApiStats(apiUrl: string, apiKey: string, requester: string, target: string): any {
  let headers = {
    "Content-Type": "application/json",
    "User-Agent": "phat-contract",
    "Authorization": `${apiKey}`
  };

  // for wallet balance
  const getUSDTBalance = JSON.stringify({ query: `
        query GetUsdtBalance {
      Ethereum: TokenBalances(
        input: {filter: {owner: {_eq: "${target}"}, tokenAddress: {_eq: "0xdAC17F958D2ee523a2206206994597C13D831ec7"}}, blockchain: ethereum}
      ) {
        TokenBalance {
          formattedAmount
        }
      }
    }
    `});
  const getUSDCBalance = JSON.stringify({ query: `
        query GetUsdcBalance {
      Ethereum: TokenBalances(
        input: {filter: {owner: {_eq: "${target}"}, tokenAddress: {_eq: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"}}, blockchain: ethereum}
      ) {
        TokenBalance {
          formattedAmount
        }
      }
    }
    `});
  const getWETHBalance = JSON.stringify({ query: `
          query GetWethBalance {
      Ethereum: TokenBalances(
        input: {filter: {owner: {_eq: "${target}"}, tokenAddress: {_eq: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"}}, blockchain: ethereum}
      ) {
        TokenBalance {
          formattedAmount
        }
      }
    }
    `});

  //for socials
  const hasLensProfile =  JSON.stringify({ query: `
  query GetLensProfile { Socials( input: { filter: { dappName: { _eq: lens } identity: { _in: ["${target}"] } } blockchain: ethereum } ) { Social { profileName profileTokenId profileTokenIdHex }}}
  `});
  const hasFarcasterAccount =  JSON.stringify({ query: `
  query GetFarcasterAccount { Socials( input: { filter: { dappName: { _eq: farcaster } identity: { _in: ["${target}"] } } blockchain: ethereum } ) { Social { profileName userId userAssociatedAddresses }}}
  `});
  const hasPrimaryEns =  JSON.stringify({ query: `
  query GetPrimaryEns { Domains(input: {filter: {owner: {_in: ["${target}"]}, isPrimary: {_eq: true}}, blockchain: ethereum}) { Domain { name owner isPrimary }}}
  `});

  // for nfts
  const hasNFTKinds = JSON.stringify({ query: `
      query GetNFTKinds {
      Ethereum: TokenBalances(
        input: {filter: {owner: {_eq: "${target}"}}, blockchain: ethereum}
      ) {
        TokenBalance {
          tokenNfts {
            id
          }
        }
      }
    }
    `});

  // for poaps
  const hasPoapKinds = JSON.stringify({ query: `
        query GetPoapKinds {
      Wallet(
        input: {identity: "${target}", blockchain: ethereum}
      ) {
        poaps {
          id
        }
      }
    }
    `});
  //
  // In Phat Contract runtime, we not support async/await, you need use `pink.batchHttpRequest` to
  // send http request. The Phat Contract will return an array of response.
  //
  let responses = pink.batchHttpRequest(
    [
      { url: apiUrl, method: "POST", headers, body: stringToHex(getUSDTBalance), returnTextBody: true },
      { url: apiUrl, method: "POST", headers, body: stringToHex(getUSDCBalance), returnTextBody: true },
      { url: apiUrl, method: "POST", headers, body: stringToHex(getWETHBalance), returnTextBody: true },

      { url: apiUrl, method: "POST", headers, body: stringToHex(hasLensProfile), returnTextBody: true },
      { url: apiUrl, method: "POST", headers, body: stringToHex(hasFarcasterAccount), returnTextBody: true },
      { url: apiUrl, method: "POST", headers, body: stringToHex(hasPrimaryEns), returnTextBody: true },

      { url: apiUrl, method: "POST", headers, body: stringToHex(hasNFTKinds), returnTextBody: true },

      { url: apiUrl, method: "POST", headers, body: stringToHex(hasPoapKinds), returnTextBody: true }
    ],
    10000 // Param for timeout in milliseconds. Your Phat Contract script has a timeout of 10 seconds
  ); // Notice the [0]. This is important bc the `pink.batchHttpRequest` function expects an array of up to 5 HTTP requests.
  return computeTrustScore(responses);
}

function getResponseBody(response: any) {
  if (response.statusCode !== 200) {
    console.log(`Fail to read api with status code: ${response.statusCode}, error: ${response.error || response.body}}`);
    throw Error.FailedToFetchData;
  }
  if (typeof response.body !== "string") {
    throw Error.FailedToDecode;
  }
  // console.log(response.body);
  return JSON.parse(response.body)
}

function computeTrustScore(responses: any): any {
  let result = 50; // Start from base score of 60

  // calculate wallet score
  let walletScore = 0;
  const walletWeight = [1, 1, 3000];
  const usdtBalanceResponseBody = getResponseBody(responses[0]);
  walletScore += (usdtBalanceResponseBody.data?.ethereum?.TokenBalance[0]?.formattedAmount ?? 0) * walletWeight[0];
  const usdcBalanceResponseBody = getResponseBody(responses[1]);
  walletScore += (usdcBalanceResponseBody.data?.ethereum?.TokenBalance[0]?.formattedAmount ?? 0) * walletWeight[1];
  const wethBalanceResponseBody = getResponseBody(responses[2]);
  walletScore += (wethBalanceResponseBody.data?.ethereum?.TokenBalance[0]?.formattedAmount ?? 0) * walletWeight[2];
  if (walletScore < 10000) {
    result += (30 / Math.log(10001)) * Math.log(walletScore + 1);
  } else {
    result += 30;
  }
  console.log(`Wallet Score... Result [${result}]`);

  // calculate social score
  const socialWeight = [7, 8, 5];
  const hasLensProfileResponseBody = getResponseBody(responses[3]);
  result += (hasLensProfileResponseBody.data?.Socials.Social ?? false) ? socialWeight[0] : 0;
  console.log(`Lens Profile Check... Result [${result}]`);
  const hasFarcasterAccountResponseBody = getResponseBody(responses[4]);
  result += (hasFarcasterAccountResponseBody.data?.Socials.Social ?? false) ? socialWeight[1] : 0;
  console.log(`Farcaster Account Check... Result [${result}]`);
  const hasPrimaryEnsResponseBody = getResponseBody(responses[5]);
  const ensDomains = hasPrimaryEnsResponseBody.data?.Domains.Domain ?? [];
  if (ensDomains.length > 0) {
    if (ensDomains[0].isPrimary) {
      result += socialWeight[2];
      console.log(`Primary ENS Account. Result [${result}]`);
    }
  }

  // calculate nft score
  const nftWeight = [30];
  const hasNFTKindsResponseBody = getResponseBody(responses[6]);
  const nftKinds = hasNFTKindsResponseBody.data?.ethereum?.TokenBalance?.length ?? 0;
  if (nftKinds < 10) {
    result += 3 * nftKinds;
  } else {
    result += nftWeight[0];
  }
  console.log(`NFT Check... Result [${result}]`);

  // calculate poap score
  const poapWeight = [30];
  const hasPoapKindsResponseBody = getResponseBody(responses[7]);
  const poapKinds = hasPoapKindsResponseBody.data?.Wallet?.poaps?.length ?? 0;
  if (poapKinds < 10) {
    result += 3 * poapKinds;
  } else {
    result += poapWeight[0];
  }
  console.log(`POAP Check... Result [${result}]`);

  // Apply scaling if result exceeds 90
  if (result > 90) {
    let excess = result - 90; // Calculate excess over 90
    result = 90 + (10 * (Math.log(excess + 1) / Math.log(11))); // Scale excess to 10 points max
    result = Math.round(result); 
  }

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
export default function main(request: HexString, secrets: string): HexString {
  console.log(`handle req: ${request}`);
  // Uncomment to debug the `secrets` passed in from the Phat Contract UI configuration.
  // console.log(`secrets: ${secrets}`);
  let requestId, requesterAddress, targetAddress, parsedSecrets;
  try {
    [requestId, requesterAddress, targetAddress] = decodeRequest(`${decodeRequestAbiParams}`, request);
    console.log(`[${requestId}]: ${requesterAddress} ${targetAddress}`);
    parsedSecrets = JSON.parse(secrets);
  } catch (error) {
    console.info("Malformed request received");
    return encodeReply(encodeReplyAbiParams, [TYPE_ERROR, 0n, 0x0000000000000000000000000000000000000000, errorToCode(error as Error)]);
  }
  console.log(`Request received for profile ${requesterAddress} ${targetAddress}`);
  try {
    const targetAddressScore = fetchApiStats(parsedSecrets.apiUrl, parsedSecrets.apiKey, requesterAddress, targetAddress);
    console.log("response:", [TYPE_RESPONSE, requestId, requesterAddress, targetAddressScore]);
    return encodeReply(encodeReplyAbiParams, [TYPE_RESPONSE, requestId, requesterAddress, targetAddressScore]);
  } catch (error) {
    if (error === Error.FailedToFetchData) {
      throw error;
    } else {
      // otherwise tell client we cannot process it
      console.log("error:", [TYPE_ERROR, requestId, requesterAddress, error]);
      return encodeReply(encodeReplyAbiParams, [TYPE_ERROR, requestId, requesterAddress, errorToCode(error as Error)]);
    }
  }
}
