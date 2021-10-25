//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "../link/link.sol";
import { bitManipulation } from "../bitManipulation/bitManipulation.sol";
import "./IERC1155Tradable.sol";
import "./IOwned.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";

contract atomictokenpeg1155evm2eosio is link, ERC1155Holder {
  event Refund(uint256 id, address recipient, uint256 tokenId, bytes reason);
  event Failure(bytes reason);
  event Receipt(address recipient, uint256 tokenId, bytes reason);
  event debug(uint256 tokenId, uint64 recipient, address tokenAddress, bytes message);
  event debuga(bytes uriBytes1);

  constructor(
    address[] memory _owners,
    uint8 _required
  ) link(_owners, _required)
  {}

  /**
    * @dev accepts ownership of smart token
    */
  function acceptTokenOwnership(address tokenAddress) public {
    IOwned ownableToken = IOwned(tokenAddress);
    ownableToken.acceptOwnership();
  }

  /**
    * @dev allows msg.sender to send tokens to another chain
    *
    * @param tokenId message
    * @param recipient message
    */
  function sendToken(uint256 tokenId, uint64 recipient, address tokenContract) public {
    bytes memory data = "0x00";
    bytes memory message = abi.encodePacked(
      bool(true), 
      Endian.reverse64(recipient), 
      uint64(tokenId), msg.sender, 
      tokenContract,
      // add LEB128 encoding length prefix
      uint8(bytes(IERC1155Tradable(tokenContract).uri(tokenId)).length),
      bitManipulation.string_tobytes(IERC1155Tradable(tokenContract).uri(tokenId))
    );
    emit debug(tokenId, recipient, tokenContract, message);
    IERC1155Tradable(tokenContract).safeTransferFrom(msg.sender, address(this), tokenId, 1, data);
    pushMessage(message);
  }

  /**
    * @dev allows msg.sender to send tokens to another chain
    *
    * @param recipient message
    */
  function transferTokens(uint256 tokenId, address recipient, uint256 id, address tokenAddress, bytes memory message) internal {
    bytes memory receipt = message;
    bytes memory data = "0x00";
    try IERC1155Tradable(tokenAddress).safeTransferFrom(address(this), recipient, tokenId, 1, data) {
      // return success true
      receipt[0] = 0x01;
    } catch(bytes memory failureMessage) {
      // return success false
      receipt[0] = 0x00;
      emit Failure(failureMessage);
    }
    pushReceipt(id, receipt);
  }

  /**
    * @dev on message hook, unique implementation per consumer
    *
    * @param _message message
    */
  function onMessage(uint256 id, bytes memory _message) internal override {
    uint256 tokenId = readMessage(_message, 9, 8);
    address recipient = address(uint160(readMessage(_message, 17, 20)));
    address tokenAddress = address(uint160(readMessage(_message, 37, 20)));
    // skip LEB128 encoding length prefix
    transferTokens(tokenId, recipient, id, tokenAddress, _message);
  }

  /**
    * @dev on receipt hook, unique implementation per consumer
    *
    * @param _message message
    */
  function onReceipt(uint256 id, bytes memory _message) internal override {
    // messages sent do not receive receipts
    // incoming message failure logged on eosio
  }
}