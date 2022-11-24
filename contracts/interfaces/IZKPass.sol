// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface IZKPass {
    /**
     * An event emitted after user set/reset his password
     * @param user - the password owner (it could be smartcontract wallet address)
     * @param pwdhash - the password hash
     */
    event SetPassword(address indexed user, uint indexed pwdhash);

    /**
     * An event emitted after operation verified with password
     * @param user - the password owner (it could be smartcontract wallet address)
     * @param nonce - each user has a nonce, the nonce will +1 after verified
     */
    event Verified(address indexed user, uint indexed nonce);

    /**
     * Get password hash of user
     * @param user - the password owner (it could be smartcontract wallet address)
     * @return - password hash of user
     */
    function pwdhashOf(address user) external view returns (uint);

    /**
     * User set/reset his password, it will update his pwdhash
     * @param proof1 - proof generated by the old password
     * @param expiration1 - old password signing expiry seconds
     * @param allhash1 - allhash generated by the old password
     * @param proof2 - proof generated by the new password
     * @param pwdhash2 - hash of the new password generated by ZK
     * @param expiration2 - new password signing expiry seconds
     * @param allhash2 - allhash generated by the new password
     */
    function resetPassword(
        uint[8] memory proof1,
        uint expiration1,
        uint allhash1,
        uint[8] memory proof2,
        uint pwdhash2,
        uint expiration2,
        uint allhash2
    ) external;

    /**
     * Verify user's password signing operation.
     * It should be called by another contract, that contract knows the operation params
     *  then generate the datahash to call this function, it will proof that user's password
     *  is correct, and the operation(datahash) is signed by the password
     * @param user - the password owner
     * @param proof - proof generated by the password
     * @param datahash - the data what user signing, this is the hash of the data
     * @param expiration - password signing expiry seconds
     * @param allhash - allhash generated by the password
     */
    function verify(
        address user,
        uint[8] memory proof,
        uint datahash,
        uint expiration,
        uint allhash
    ) external;
}
