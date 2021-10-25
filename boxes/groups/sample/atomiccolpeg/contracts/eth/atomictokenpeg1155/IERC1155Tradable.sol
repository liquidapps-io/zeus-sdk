// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC1155/extensions/IERC1155MetadataURI.sol";

interface IERC1155Tradable is IERC1155MetadataURI {
    /**
     * burn
     */
    function burn(
        address account,
        uint256 id,
        uint256 value) external;
        
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
     * create
     */
    function create(
        address _initialOwner,
        uint256 _id,
        uint256 _initialSupply,
        string memory _uri,
        bytes memory _data) external returns (uint256);
        
    /**
     * uri
     */
    function uri(uint256) external override view returns (string memory);
}