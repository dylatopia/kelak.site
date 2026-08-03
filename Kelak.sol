// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Kelak {

    // Vault Information

    struct Vault {
        address owner;
        address recipient;
        string content;       // the text message, OR a link to an uploaded photo/video/voice note
        string contentType;   // "text", "image", "video", or "voice"
        uint256 unlockTimestamp;
        uint256 createdAt;
        bool isUnlocked;
    }

    // Storage
    
    uint256 public vaultCount;
    mapping(uint256 => Vault) private vaults;
    mapping(address => uint256[]) public vaultsByRecipient;
    mapping(address => uint256[]) public vaultsByOwner;

    // Events

    event VaultCreated(uint256 indexed vaultId, address indexed owner, address indexed recipient, uint256 unlockTimestamp);
    event VaultUnlocked(uint256 indexed vaultId, address indexed recipient, uint256 unlockedAt);

    // Actions

    function createVault(
        address recipient,
        uint256 unlockTimestamp,
        string memory content,
        string memory contentType
    ) public returns (uint256) {
        require(unlockTimestamp > block.timestamp, "Unlock date must be in the future");
        require(recipient != address(0), "Invalid recipient");
        require(bytes(content).length > 0, "Content required");
        require(bytes(contentType).length > 0, "Content type required");

        vaultCount++;
        vaults[vaultCount] = Vault(
            msg.sender,
            recipient,
            content,
            contentType,
            unlockTimestamp,
            block.timestamp,
            false
        );

        vaultsByRecipient[recipient].push(vaultCount);
        vaultsByOwner[msg.sender].push(vaultCount);

        emit VaultCreated(vaultCount, msg.sender, recipient, unlockTimestamp);
        return vaultCount;
    }

    function unlockVault(uint256 vaultId) public returns (string memory content, string memory contentType) {
        Vault storage v = vaults[vaultId];

        require(v.owner != address(0), "Vault not found");
        require(v.recipient == msg.sender, "Only the intended recipient can unlock this vault");
        require(block.timestamp >= v.unlockTimestamp, "This vault is not ready to be unlocked yet");

        if (!v.isUnlocked) {
            v.isUnlocked = true;
            emit VaultUnlocked(vaultId, msg.sender, block.timestamp);
        }

        return (v.content, v.contentType);
    }

    // View vault metadata (content stays hidden)

    function getVaultStatus(uint256 vaultId) public view returns (
        address owner,
        address recipient,
        uint256 unlockTimestamp,
        uint256 createdAt,
        bool isUnlocked
    ) {
        Vault storage v = vaults[vaultId];
        return (v.owner, v.recipient, v.unlockTimestamp, v.createdAt, v.isUnlocked);
    }

    function getMyVaultsAsRecipient() public view returns (uint256[] memory) {
        return vaultsByRecipient[msg.sender];
    }

    function getMyVaultsAsOwner() public view returns (uint256[] memory) {
        return vaultsByOwner[msg.sender];
    }
}
