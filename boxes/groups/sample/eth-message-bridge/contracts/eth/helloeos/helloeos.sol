
//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.4.26;
import "../ethmessagebridge/ethmessagebridge.sol";

contract helloeos is ethmessagebridge {
  event receivedMessage(string message);
  event receivedReceipt(string message, bool success);

  /**
    * @dev on message hook, unique implementation per consumer
    *
    * @param _message
    */
  function onMessage(Message _message) internal {
    string memory message = string(_message.message);
    string memory response = message + "!";
    receivedMessage(message);
    Receipt receipt = Receipt({
      message: _message.message,
      response: bytes(response),
      message_id: last_received_message_id,
      success: true
    });
    local_receipts[last_generated_local_receipt_id] = receipt;
  }

  /**
    * @dev on receipt hook, unique implementation per consumer
    *
    * @param _receipt
    */
  function onReceipt(Receipt _receipt) internal {
    string memory response = string(_receipt.response);
    emit receivedReceipt(response, _receipt.success);
  }
}
