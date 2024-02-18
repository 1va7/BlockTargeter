// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "./PhatRollupAnchor.sol";

interface VRFOracleInterface {
    function requestRandomWords(string calldata seed, uint32 numWords) external;
}

contract VRFOracle is VRFOracleInterface, PhatRollupAnchor, Ownable {
    event ResponseReceived(uint reqId, string reqData, uint256[] value);
    event ErrorReceived(uint reqId, string reqData, uint256 errno);

    uint constant TYPE_RESPONSE = 0;
    uint constant TYPE_ERROR = 2;

    struct Request {
        address caller;
        string data;
    }

    mapping(uint => Request) requests;
    uint256 nextRequest = 1;

    constructor(address phatAttestor) {
        _grantRole(PhatRollupAnchor.ATTESTOR_ROLE, phatAttestor);
    }

    function setAttestor(address phatAttestor) public {
        _grantRole(PhatRollupAnchor.ATTESTOR_ROLE, phatAttestor);
    }

    function requestRandomWords(string calldata seed, uint32 numWords) external {
        // assemble the request
        uint256 id = nextRequest;
        if (isContract(msg.sender)) {
            requests[id] = Request(msg.sender, seed);
        } else {
            requests[id] = Request(address(0), seed);
        }
        _pushMessage(abi.encode(id, seed, numWords));
        nextRequest += 1;
    }

    function _onMessageReceived(bytes calldata action) internal override {
        // Optional to check length of action
        // require(action.length == 32 * 3, "cannot parse action");
        (uint respType, uint256 id, uint256[] memory data) = abi.decode(
            action,
            (uint, uint256, uint256[])
        );
        if (respType == TYPE_RESPONSE) {
            emit ResponseReceived(id, requests[id].data, data);
            if (requests[id].caller != address(0)) {
                VRFConsumerBaseV2 consumer = VRFConsumerBaseV2(requests[id].caller);
                consumer.rawFulfillRandomWords(id, data);
            }
            delete requests[id];
        } else if (respType == TYPE_ERROR) {
            emit ErrorReceived(id, requests[id].data, data[0]);
            delete requests[id];
        }
    }

    function isContract(address account) internal view returns (bool) {
        // This method relies in extcodesize, which returns 0 for contracts in
        // construction, since the code is only stored at the end of the
        // constructor execution.

        uint256 size;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            size := extcodesize(account)
        }
        return size > 0;
    }
}
