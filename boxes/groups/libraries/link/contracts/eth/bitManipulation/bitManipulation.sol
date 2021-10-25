//SPDX-License-Identifier: UNLICENSED
pragma solidity >0.6.0;

library bitManipulation {
  // https://gist.github.com/ageyev/779797061490f5be64fb02e978feb6ac
  function slice(
      bytes memory _bytes,
      uint256 _start,
      uint256 _length
  )
      internal
      pure
      returns (bytes memory)
  {
      require(_length + 31 >= _length, "slice_overflow");
      require(_bytes.length >= _start + _length, "slice_outOfBounds");

      bytes memory tempBytes;

      assembly {
          switch iszero(_length)
          case 0 {
              // Get a location of some free memory and store it in tempBytes as
              // Solidity does for memory variables.
              tempBytes := mload(0x40)

              // The first word of the slice result is potentially a partial
              // word read from the original array. To read it, we calculate
              // the length of that partial word and start copying that many
              // bytes into the array. The first word we copy will start with
              // data we don't care about, but the last `lengthmod` bytes will
              // land at the beginning of the contents of the new array. When
              // we're done copying, we overwrite the full first word with
              // the actual length of the slice.
              let lengthmod := and(_length, 31)

              // The multiplication in the next line is necessary
              // because when slicing multiples of 32 bytes (lengthmod == 0)
              // the following copy loop was copying the origin's length
              // and then ending prematurely not copying everything it should.
              let mc := add(add(tempBytes, lengthmod), mul(0x20, iszero(lengthmod)))
              let end := add(mc, _length)

              for {
                  // The multiplication in the next line has the same exact purpose
                  // as the one above.
                  let cc := add(add(add(_bytes, lengthmod), mul(0x20, iszero(lengthmod))), _start)
              } lt(mc, end) {
                  mc := add(mc, 0x20)
                  cc := add(cc, 0x20)
              } {
                  mstore(mc, mload(cc))
              }

              mstore(tempBytes, _length)

              //update free-memory pointer
              //allocating the array padded to 32 bytes like the compiler does now
              mstore(0x40, and(add(mc, 31), not(31)))
          }
          //if we want a zero-length slice let's just return a zero-length array
          default {
              tempBytes := mload(0x40)
              //zero out the 32 bytes slice we are about to return
              //we need to do it because Solidity does not garbage collect
              mstore(tempBytes, 0)

              mstore(0x40, add(tempBytes, 0x20))
          }
      }

      return tempBytes;
  }

  // https://ethereum.stackexchange.com/questions/29295/how-to-convert-a-bytes-to-string-in-solidity
  function bytesToString(bytes memory byteCode) public pure returns(string memory stringData)
  {
      uint256 blank = 0; //blank 32 byte value
      uint256 length = byteCode.length;

      uint cycles = byteCode.length / 0x20;
      uint requiredAlloc = length;

      if (length % 0x20 > 0) //optimise copying the final part of the bytes - to avoid looping with single byte writes
      {
          cycles++;
          requiredAlloc += 0x20; //expand memory to allow end blank, so we don't smack the next stack entry
      }

      stringData = new string(requiredAlloc);

      //copy data in 32 byte blocks
      assembly {
          let cycle := 0

          for
          {
              let mc := add(stringData, 0x20) //pointer into bytes we're writing to
              let cc := add(byteCode, 0x20)   //pointer to where we're reading from
          } lt(cycle, cycles) {
              mc := add(mc, 0x20)
              cc := add(cc, 0x20)
              cycle := add(cycle, 0x01)
          } {
              mstore(mc, mload(cc))
          }
      }

      //finally blank final bytes and shrink size (part of the optimisation to avoid looping adding blank bytes1)
      if (length % 0x20 > 0)
      {
          uint offsetStart = 0x20 + length;
          assembly
          {
              let mc := add(stringData, offsetStart)
              mstore(mc, mload(add(blank, 0x20)))
              //now shrink the memory back so the returned object is the correct size
              mstore(stringData, length)
          }
      }
  }

    // https://ethereum.stackexchange.com/questions/9142/how-to-convert-a-string-to-bytes32
    function string_tobytes(string memory s) public pure returns (bytes memory){
        return bytes(s);
    }
}
