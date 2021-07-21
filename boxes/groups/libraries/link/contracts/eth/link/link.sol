//SPDX-License-Identifier: UNLICENSED
pragma solidity >0.6.0;

abstract contract link {

  uint256 private constant receipt_flag = uint256(1) << 31;

  struct Message {
    uint256 id;         // the message id, different from the batch id
    bytes message;      // message as bytes, must deserialize
    uint256 block_num;
    bool received;  
  }

  struct InboundMessage {
    bytes message;
    uint256 block_num;
  }

  address owner;

  uint256 public available_message_id;
  uint64  public available_batch_id;
  uint64  public next_incoming_batch_id;

  uint256 public last_outgoing_batch_block_num;
  uint256 public last_incoming_batch_block_num;

  address[] owners;
  uint256 required_sigs;

  // mapping of bridge owners
  mapping (address => bool) public isOwner;

  // mapping/linked list of received messages
  mapping (uint256 => InboundMessage) public inbound; 

  // mapping/linked list of local messages
  mapping (uint64 => Message) public batches;
  mapping (uint256 => uint64) public outbound;

  mapping (bytes32 => mapping(address => bool)) public hasConfirmed;
  mapping (bytes32 => bool) public executedMsg;
  mapping (bytes32 => uint256) public numOfConfirmed;  

  constructor(address[] memory _owners, uint256 _required) {
    for (uint i = 0; i < _owners.length; i++) {
      require(!isOwner[_owners[i]] && _owners[i] != address(0));
      isOwner[_owners[i]] = true;
    }
    require(_required <= _owners.length);
    owners = _owners;
    required_sigs = _required;
  }

  /**
    * @dev confirms consensus of messages before execution
    *
    * @param theHash message
    */
  function confirmConsensus(bytes32 theHash) internal returns (bool) {
    require(isOwner[msg.sender], "sender not authorized");
    require(!(hasConfirmed[theHash][msg.sender]), "sender already confirmed");
    hasConfirmed[theHash][msg.sender] = true;
    numOfConfirmed[theHash] += 1;
    if (numOfConfirmed[theHash] >= required_sigs && !executedMsg[theHash]) {
      executedMsg[theHash] = true;
      return true;
    }
    return false;
  }

  /**
    * @dev confirms consensus of messages before execution
    *
    * @param id message
    */
  function modifyConsensus(
    uint256 id,
    address[] memory _owners,
    uint256 required
    ) public {
      bytes32 dataHash = keccak256(abi.encodePacked(id, _owners, required));
      if (!confirmConsensus(dataHash)) {
        return;
      }
      for (uint i = 0; i < owners.length; i++) {
        isOwner[owners[i]] = false;
      }
      for (uint i = 0; i < _owners.length; i++) {
        require(!isOwner[_owners[i]] && _owners[i] != address(0));
        isOwner[_owners[i]] = true;
      }
      require(required <= _owners.length);
      owners = _owners;
      required_sigs = required;
  }

  /**
    * @dev view function which returns Messages only if 12 blocks have passed
    *
    * @param batch_id the batch to retrieve
    */
  function getBatch(uint64 batch_id) public view returns (uint256 id, bytes memory message, uint256 block_num) {
    Message memory requestedMessage = batches[batch_id];
    if (requestedMessage.block_num > 0 && block.number > (requestedMessage.block_num + uint256(12))) {
      return (requestedMessage.id, requestedMessage.message, requestedMessage.block_num);
    }
    bytes memory emptyMessage;
    return (0, emptyMessage, 0);
  }

  /**
    * @dev handling the pushing of messages from other chains
    *
    * @param _message the message to push
    */
  function pushInboundMessage(uint256 id, bytes memory _message) external {
    bytes32 dataHash = keccak256(abi.encodePacked(id, _message));
    if (!confirmConsensus(dataHash)) {
      return;
    }
    InboundMessage memory message = InboundMessage(_message, block.number);  
    inbound[id] = message;  
    if(id < receipt_flag) {      
      onMessage(id, _message);      
    } else {
      uint256 orig_id = id - receipt_flag;
      require(orig_id > 0); //TODO
      //VERIFY BLOCK AGE
      batches[outbound[orig_id]].received = true;
      onReceipt(orig_id, _message);
    }
    last_incoming_batch_block_num = block.number;
  }

  /**
    * @dev handling the pushing of local messages
    *
    * @param _message the message to push
    */
  function pushMessage(bytes memory _message) internal {
    Message memory message = Message(available_message_id, _message, block.number, false);
    batches[available_batch_id] = message;
    outbound[available_message_id] = available_batch_id;
    available_message_id++;
    available_batch_id++;
  }

  /**
    * @dev handling the pushing of local receipts
    *
    * @param _message message
    */
  function pushReceipt(uint256 id, bytes memory _message) internal {
    uint256 receipt_id = id + receipt_flag;
    Message memory message = Message(receipt_id, _message, block.number, true);
    batches[available_batch_id] = message;
    outbound[receipt_id] = available_batch_id;
    available_batch_id++;
  }

  function readMessage(bytes memory data, uint256 offset, uint256 length) internal pure returns (uint256 o) {
      require(data.length >= offset + length, "Reading bytes out of bounds");
      assembly {
          o := mload(add(data, add(32, offset)))
          let lb := sub(32, length)
          if lb { o := div(o, exp(2, mul(lb, 8))) }
      }
  }

  /**
    * @dev on message hook, unique implementation per consumer
    *
    * @param id uint256
    * @param _message message
    */
  function onMessage(uint256 id, bytes memory _message) internal virtual;

  /**
    * @dev on receipt hook, unique implementation per consumer
    *
    * @param id uint256
    * @param _message message
    */
  function onReceipt(uint256 id, bytes memory _message) internal virtual;
}
  
library Endian {
  /* https://ethereum.stackexchange.com/questions/83626/how-to-reverse-byte-order-in-uint256-or-bytes32 */
  function reverse64(uint64 input) internal pure returns (uint64 v) {
      v = input;

      // swap bytes
      v = ((v & 0xFF00FF00FF00FF00) >> 8) |
          ((v & 0x00FF00FF00FF00FF) << 8);

      // swap 2-byte long pairs
      v = ((v & 0xFFFF0000FFFF0000) >> 16) |
          ((v & 0x0000FFFF0000FFFF) << 16);

      // swap 4-byte long pairs
      v = (v >> 32) | (v << 32);
  }
}
