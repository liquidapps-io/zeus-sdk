Encoding Ethereum method arguments (specifically for gnosis multisig) -

As a note, one byte is 8 bits, or two hexadecimals, so 32 bytes are actually 64 hexadecimals (0-9+a-f). Note that 0-9+a-f gives us 16 different options, which is 4 bits (2^4=16) or "half" of a byte.

https://medium.com/@hayeah/how-to-decipher-a-smart-contract-method-call-8ee980311603

An example of an encoded method of the Gnosis Multisig Contract (`submitTransaction(0x409e78ff1b1b8e55620d3a075de707dc5bacbc9d, 1, 0x0)`) originally one string, broken down into 4 bytes for the method id, then rows of 32 bytes

(1) c6427474
(2) 000000000000000000000000409e78ff1b1b8e55620d3a075de707dc5bacbc9d
(3) 0000000000000000000000000000000000000000000000000000000000000001
(4) 0000000000000000000000000000000000000000000000000000000000000060
(5) 0000000000000000000000000000000000000000000000000000000000000001
(6) 0000000000000000000000000000000000000000000000000000000000000000

(1) - The first 4 bytes are the method id. In this case the method is `submitTransaction(address destination, uint256 value, bytes data)`. The method id is calculated to be the first 4 bytes of the sha3 hash `submitTransction(address,uint256,bytes)`.

(2) - The first method argument, `address destination` left padded with 0's, in this case 0x409e78ff1b1b8e55620d3a075de707dc5bacbc9d 

(3) - The second argument, `uint256 value` (no need to left pad since 32 bytes = 256 bits), in this case equal to 1.

(4) - Since the last argument is a dynamically sized array, this value (0x60) points to the location of where the data of the dynamic array starts. In this case 0x60 = 96, pointing to the beginning of (5).

(5) - Contains the `length` of the dynamic array, in this case just 1. 

(6) - Is the only entry of the array, which is just 0x0, or no data at all. 


---------------------------------------------------------------
Refactoring
---------------------------------------------------------------

1.) ganache-cli extension in start-localenv should be moved to its own box
2.) the noncehandler should also be moved to its own box perhaps with its own tests