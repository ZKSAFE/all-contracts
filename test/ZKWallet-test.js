const { BigNumber, utils } = require('ethers')
const snarkjs = require("snarkjs")
const fs = require("fs")

describe('ZKWallet-test', function () {
    let accounts
    let provider
    let zkWallet
    let usdt

    before(async function () {
        accounts = await ethers.getSigners()
        provider = accounts[0].provider
    })

    it('deploy', async function () {
        const MockERC20 = await ethers.getContractFactory('MockERC20')
        usdt = await MockERC20.deploy('MockUSDT', 'USDT')
        await usdt.deployed()
        console.log('usdt deployed:', usdt.address)
        await usdt.mint(accounts[0].address, m(1000, 18))
        console.log('usdt mint to accounts[0]', d(await usdt.balanceOf(accounts[0].address), 18))
        await usdt.mint(accounts[1].address, m(1000, 18))
        console.log('usdt mint to accounts[1]', d(await usdt.balanceOf(accounts[1].address), 18))
    })


    it('deploy ZKWallet', async function () {
        const ZKWallet = await ethers.getContractFactory('ZKWallet')
        zkWallet = await ZKWallet.connect(accounts[1]).deploy()
        await zkWallet.deployed()
        console.log('zkWallet deployed:', zkWallet.address)
    })


    it('deposit', async function () {
        await accounts[0].sendTransaction({to: zkWallet.address, value: m(5, 18)})
        console.log('transfer ETH done')

        await usdt.transfer(zkWallet.address, m(100, 18))
        console.log('deposit ERC20 to', zkWallet.address)

        await print()
    })


    it('batch withdraw', async function () {
        let contractAddr = usdt.address
        let value = m(0, 18)
        const ERC = await ethers.getContractFactory('MockERC20')
        let data1 = ERC.interface.encodeFunctionData('transfer(address,uint256)', [accounts[1].address, m(1, 18)])

        let abi = getAbi('./artifacts/contracts/mock/MockERC20.sol/MockERC20.json')
        let interface = new ethers.utils.Interface(abi)
        let data2 = interface.encodeFunctionData('transfer(address,uint256)', [accounts[1].address, m(2, 18)])

        await zkWallet.connect(accounts[1]).batchCall([contractAddr, contractAddr, accounts[1].address], [value, value, m(1, 18)], [data1, data2, 0x0])
        console.log('batch withdraw done')

        await print()
    })


    async function print() {
        console.log('')
        
        console.log('account0 usdt:', d(await usdt.balanceOf(accounts[0].address), 18), 'eth:', d(await provider.getBalance(accounts[0].address), 18))
        console.log('account1 usdt:', d(await usdt.balanceOf(accounts[1].address), 18), 'eth:', d(await provider.getBalance(accounts[1].address), 18))
        console.log('zkWallet usdt:', d(await usdt.balanceOf(zkWallet.address), 18), 'eth:', d(await provider.getBalance(zkWallet.address), 18))

        console.log('')
    }


    function stringToHex(string) {
        let hexStr = '';
        for (let i = 0; i < string.length; i++) {
            let compact = string.charCodeAt(i).toString(16)
            hexStr += compact
        }
        return '0x' + hexStr
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
        return bn.mul(BigNumber.from(100)).div(BigNumber.from(10).pow(decimals)).toNumber() / 100
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
