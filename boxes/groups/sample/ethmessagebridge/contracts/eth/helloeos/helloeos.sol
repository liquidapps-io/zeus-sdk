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
    * @dev allows owner to push message
    *
    * @param _message message
    */
  function pushMessage(bytes memory _message) public {
    pushLocalMessage(_message);
    emit postedMessage(_message);
  }

  /**
    * @dev on message hook, unique implementation per consumer
    *
    * @param _message message
    */
  function onMessage(bytes memory _message) internal override {
    string memory message = string(_message);
    bytes memory response = abi.encodePacked(message, "!");
    receivedMessage(_message);
    pushLocalReceipt(_message, response, true);
  }

  /**
    * @dev on receipt hook, unique implementation per consumer
    *
    * @param _message message
    * @param _response response
    * @param _success success
    */
  function onReceipt(
    bytes memory _message,
    bytes memory _response,
    bool _success
  ) internal override {
    emit receivedReceipt(_message, _response, _success);
  }
}
