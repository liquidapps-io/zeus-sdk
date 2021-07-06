//SPDX-License-Identifier: UNLICENSED
pragma solidity >0.6.0;
import "../link/link.sol";
import "./IERC721Burnable.sol";
import "./IOwned.sol";

contract atomictokenpeg is link {
  event Refund(uint256 id, address recipient, uint256 tokenId, bytes reason);
  event Failure(bytes reason);
  event Receipt(address recipient, uint256 tokenId, bytes reason);

  IERC721Burnable public tokenContract;
  
  constructor(
    address[] memory _owners,
    uint8 _required,
    address _tokenContract
  ) link(_owners, _required)
  {
    tokenContract = IERC721Burnable(_tokenContract);
  }

  /**
    * @dev accepts ownership of smart token
    */
  function acceptTokenOwnership() public {
    IOwned ownableToken = IOwned(address(tokenContract));
    ownableToken.acceptOwnership();
  }

  /**
    * @dev allows msg.sender to send tokens to another chain
    *
    * @param tokenId message
    * @param recipient message
    */
  function sendToken(uint256 tokenId, uint64 recipient) public {
    tokenContract.burn(tokenId);
    bytes memory message = abi.encodePacked(bool(true), Endian.reverse64(recipient), uint64(tokenId), msg.sender);
    pushMessage(message);
  }

  // /**
  //   * @dev allows owner to mint tokens from improper send
  //   *
  //   * @param tokenId message
  //   * @param recipient message
  //   */
  // function mintToken(uint256 tokenId, address recipient) public {
  //   require(isOwner[msg.sender], "sender not authorized");
  //   tokenContract.mint(recipient, tokenId);
  // }

  /**
    * @dev allows msg.sender to send tokens to another chain
    *
    * @param recipient message
    */
  function mintTokens(uint256 tokenId, address recipient, uint256 id, bytes memory message) internal {
    bytes memory receipt = message;
    try tokenContract.mint(recipient, tokenId) {
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
    //byte 17-27 address
    uint256 tokenId = readMessage(_message, 9, 8);
    address recipient = address(uint160(readMessage(_message, 17, 20)));
    mintTokens(tokenId, recipient, id, _message);
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
