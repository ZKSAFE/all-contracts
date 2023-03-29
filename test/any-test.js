const { BigNumber, utils } = require('ethers')
const snarkjs = require("snarkjs")
const fs = require("fs")

describe('any-test', function () {
    let accounts
    let provider

    before(async function () {
        accounts = await ethers.getSigners()
        provider = accounts[0].provider
    })

    it('MockERC721', async function () {
        const MockERC721 = await ethers.getContractFactory('MockERC721')
        const mockERC721 = await MockERC721.deploy('CATASTROPHY CLUB', 'Catastrophy')
        await mockERC721.deployed()
        console.log('MockERC721 deployed:', mockERC721.address, 'name:', await mockERC721.name())
        await mockERC721.mintURI(accounts[0].address, '9988', 'https://i.seadn.io/gcs/files/92ed2c565f294ec77736abb5a0066050.png')
        console.log('9988 owner is:', await mockERC721.ownerOf('9988'), ' tokenURL is:', await mockERC721.tokenURI('9988'))
    })


    // it('MockZKID', async function () {
    //     const MockZKID = await ethers.getContractFactory('MockZKID')
    //     const mockZKID = await MockZKID.deploy()
    //     await mockZKID.deployed()
    //     console.log('MockZKID deployed:', mockZKID.address, 'name:', await mockZKID.name())
    //     await mockZKID.mint(accounts[0].address)
    //     console.log('addressOf', await mockZKID.addressOf('100201'))
    // })


    function getAbi(jsonPath) {
        let file = fs.readFileSync(jsonPath)
        let abi = JSON.parse(file.toString()).abi
        return abi
    }

    async function delay(sec) {
        return new Promise((resolve, reject) => {
            setTimeout(resolve, sec * 1000);
        })
    }

    function m(num, decimals) {
        return BigNumber.from(num).mul(BigNumber.from(10).pow(decimals))
    }

    function d(bn, decimals) {
        return bn.mul(BigNumber.from(10000)).div(BigNumber.from(10).pow(decimals)).toNumber() / 10000
    }

    function b(num) {
        return BigNumber.from(num)
    }

    function n(bn) {
        return bn.toNumber()
    }

    function s(bn) {
        return bn.toString()
    }
})
