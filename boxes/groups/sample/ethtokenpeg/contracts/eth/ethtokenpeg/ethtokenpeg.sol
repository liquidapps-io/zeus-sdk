//SPDX-License-Identifier: UNLICENSED
pragma solidity >0.6.0;
import "../link/link.sol";
import "../IERC20/IERC20.sol";
import "../IOwned/IOwned.sol";

contract ethtokenpeg is link {
  event Refund(uint256 id, address recipient, uint256 amount, bytes reason);
  event Failure(bytes reason);
  event Receipt(address recipient, uint256 amount, bytes reason);

  IERC20 public tokenContract;
  
  constructor(
    address[] memory _owners,
    uint8 _required,
    address _tokenContract
  ) public link(_owners, _required)
  {
    tokenContract = IERC20(_tokenContract);
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
    * @param amount message
    * @param recipient message
    */
  function sendToken(uint256 amount, uint64 recipient) public {
    tokenContract.destroy(msg.sender, amount);
    bytes memory message = abi.encodePacked(bool(true), Endian.reverse64(recipient), uint64(amount), msg.sender);
    pushMessage(message);
  }

  /**
    * @dev allows msg.sender to send tokens to another chain
    *
    * @param amount message
    * @param recipient message
    */
  function mintTokens(uint256 amount, address recipient, uint256 id, bytes memory message) internal {
    bytes memory receipt = message;
    try tokenContract.issue(recipient, amount) {
      receipt[0] = 0x01;
    } catch(bytes memory failureMessage) {      
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
    //byte 9-17, amount
    //byte 17-27 address
    uint256 amount = readMessage(_message, 9, 8);
    address recipient = address(uint160(readMessage(_message, 17, 20)));
    mintTokens(amount, recipient, id, _message);
  }

  /**
    * @dev on receipt hook, unique implementation per consumer
    *
    * @param _message message
    */
  function onReceipt(uint256 id, bytes memory _message) internal override {
    uint256 success = readMessage(_message, 0, 1);
    if (success > 0) {
      return;
    }
    uint256 amount = readMessage(_message, 9, 8);
    address sender = address(uint160(readMessage(_message, 17, 20)));
    tokenContract.issue(sender, amount);
    emit Refund(id, sender, amount, _message);
  }
}
