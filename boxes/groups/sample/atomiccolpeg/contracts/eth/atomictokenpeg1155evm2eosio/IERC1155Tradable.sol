// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC1155/extensions/IERC1155MetadataURI.sol";

interface IERC1155Tradable is IERC1155MetadataURI {
    /**
     * safeTransferFrom
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data) external override;
        
    /**
     * uri
     */
    function uri(uint256) external override view returns (string memory);
}