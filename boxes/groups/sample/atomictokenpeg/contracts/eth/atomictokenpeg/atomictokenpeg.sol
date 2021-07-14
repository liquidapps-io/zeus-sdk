//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "../link/link.sol";
import "./IERC721BurnableStorage.sol";
import "./IOwned.sol";

contract atomictokenpeg is link {
  event Refund(uint256 id, address recipient, uint256 tokenId, bytes reason);
  event Failure(bytes reason);
  event Receipt(address recipient, uint256 tokenId, bytes reason);
  
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
    bytes memory message = abi.encodePacked(bool(true), Endian.reverse64(recipient), uint64(tokenId), msg.sender, tokenContract);
    IERC721Burnable(tokenContract).burn(tokenId);
    pushMessage(message);
  }

  /**
    * @dev allows msg.sender to send tokens to another chain
    *
    * @param recipient message
    */
  function mintTokens(uint256 tokenId, address recipient, uint256 id, address tokenAddress, bytes memory message) internal {
    bytes memory receipt = message;
    try IERC721Burnable(tokenAddress).mint(recipient, tokenId) {
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
    //byte 0, status
    //byte 1-8, eos account
    //byte 9-17, asset_id
    //byte 17-37 address
    //byte 37-45 token index
    uint256 tokenId = readMessage(_message, 9, 8);
    address recipient = address(uint160(readMessage(_message, 17, 20)));
    address tokenAddress = address(uint160(readMessage(_message, 37, 20)));
    mintTokens(tokenId, recipient, id, tokenAddress, _message);
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
