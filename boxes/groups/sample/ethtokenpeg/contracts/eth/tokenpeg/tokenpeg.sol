//SPDX-License-Identifier: UNLICENSED
pragma solidity >0.6.0;
import "../link/link.sol";
import "../IERC20/IERC20.sol";
import "../IOwned/IOwned.sol";

contract tokenpeg is link {
  event Refund(address recipient, uint256 amount, bytes reason);

  IERC20 public tokenContract;
  
  constructor(
    address[] memory _owners,
    uint8 _required,
    address _tokenContract
  ) link(_owners, _required)
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
  function sendToken(uint256 amount, bytes32 recipient) public {
    tokenContract.destroy(msg.sender, amount);
    // encode rather than encodePacked, so msg.sender is padded to 32 bytes
    // we encode msg.sender,amount,recipient
    bytes memory message = abi.encode(recipient, amount, msg.sender);
    pushLocalMessage(message);
  }

  /**
    * @dev allows msg.sender to send tokens to another chain
    *
    * @param amount message
    * @param recipient message
    */
  function mintTokens(uint256 amount, address recipient, bytes memory message) internal {
    try tokenContract.issue(recipient, amount) {
      pushLocalReceipt(message, message, true);
    } catch(bytes memory failureMessage) {
      pushLocalReceipt(message, failureMessage, false);
    }
  }

  /**
    * @dev on message hook, unique implementation per consumer
    *
    * @param _message message
    */
  function onMessage(bytes memory _message) internal override {
    // deserialize message into sender,amount,recipient then issue
    uint256 amount;
    uint256 recipientAsUint256;
    assembly {
      // sender is mload(add(_message, 32))
      amount := mload(add(_message, 64))
      recipientAsUint256 := mload(add(_message, 96))
    }
    address recipient = address(uint160(recipientAsUint256));
    mintTokens(amount, recipient, _message);
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
    if (_success) {
      return;
    }
    // _message was encoded as msg.sender,amount,recipient where recipient
    // was an eos account
    uint256 senderAsUint256;
    uint256 amount;
    assembly {
      amount := mload(add(_message, 64))
      senderAsUint256 := mload(add(_message, 96))
    }
    address sender = address(uint160(senderAsUint256));
    tokenContract.issue(sender, amount);
    emit Refund(sender, amount, _response);
  }
}
