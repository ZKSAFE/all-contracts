const { BigNumber, utils } = require('ethers')
const snarkjs = require("snarkjs")
const fs = require("fs")

describe('ZKID-test', function () {
    let accounts
    let provider
    let zkID

    before(async function () {
        accounts = await ethers.getSigners()
        provider = accounts[0].provider
    })

    it('deploy', async function () {
        const ZKID = await ethers.getContractFactory('ZKID')
        zkID = await ZKID.deploy(accounts[1].address)
        await zkID.deployed()
        console.log('zkID deployed:', zkID.address, 'name:', await zkID.name())

        // const MockZKID = await ethers.getContractFactory('MockZKID')
        // const mockZKID = await MockZKID.deploy()
        // await mockZKID.deployed()
        // console.log('MockZKID deployed:', mockZKID.address, 'name:', await mockZKID.name())
        // await mockZKID.mint(accounts[0].address)
        // console.log('addressOf', await mockZKID.addressOf('100201'))

        await print()
    })


    it('mint 1', async function () {
        let totalPrice = b(0);
        let buyNum = 10
        for (let i=1; i<=buyNum; i++) {
            let price = await zkID.price(1)
            await zkID.mint(1, accounts[0].address, {value: price})
            console.log(i, 'buy 1 ID, price:', d(price, 18))
            totalPrice = totalPrice.add(price)
        }
        console.log('total price:', d(totalPrice, 18), ' each price:', d(totalPrice.div(buyNum), 18))
        await print()
    })

    it('mint 2', async function () {
        // await delay(10)
        await print()

        let buyNum = 10
        let price = await zkID.price(buyNum)
        await zkID.mint(buyNum, accounts[0].address, {value: price})
        console.log('buy ' + buyNum + ' IDs, total price:', d(price, 18), ' each price:', d(price.div(buyNum), 18))

        await print()
    })


    async function print() {
        console.log('')
        console.log('supply:', n(await zkID.supply()), 'kLast:', s(await zkID.kLast()))

        for (let num=1; num<=100; num++) {
            if ( n(await zkID.supply()) > num ) {
                let price = await zkID.price(num)
                console.log('Buy ' + num + ' IDs, each price:', d(price.div(num), 18))
            }
        }

        console.log('account0 eth:', d(await accounts[0].getBalance(), 18))
        console.log('account1 eth:', d(await accounts[1].getBalance(), 18))
        
        // for (let id=2100; id<2115; id++) {
        //     console.log('#' + id + ' owner:', await zkID.ownerOf(id))
        // } 

        console.log('')
    }


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
