//SPDX-License-Identifier: UNLICENSED
pragma solidity >0.6.0;
import "../link/link.sol";

contract helloeos is link {
  event receivedMessage(bytes message);
  event postedMessage(bytes message);
  event receivedReceipt(bytes message, bytes response, bool success);
  event postedReceipt(string message, bool success);

  constructor(address[] memory _owners, uint8 _required) link(_owners, _required) {}

  /**
    * @dev on message hook, unique implementation per consumer
    *
    * @param _message message
    */
  function onMessage(uint256 id, bytes memory _message) internal override {
  }

  /**
    * @dev on receipt hook, unique implementation per consumer
    *
    * @param id id
    * @param _message message
    */
  function onReceipt(
    uint256 id,
    bytes memory _message
  ) internal override {
  }
}
