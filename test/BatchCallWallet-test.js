const { BigNumber, utils } = require('ethers')
const snarkjs = require("snarkjs")
const fs = require("fs")

describe('BatchCallWallet-test', function () {
    let accounts
    let provider
    let wallet
    let usdt
    let check

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

        const AssetsCheck = await ethers.getContractFactory('AssetsCheck')
        check = await AssetsCheck.deploy()
        await check.deployed()
        console.log('check deployed:', check.address)
    })


    it('deploy BatchCallWallet', async function () {
        const BatchCallWallet = await ethers.getContractFactory('BatchCallWallet')
        wallet = await BatchCallWallet.connect(accounts[1]).deploy()
        await wallet.deployed()
        console.log('wallet deployed:', wallet.address)
    })


    it('deposit', async function () {
        await accounts[0].sendTransaction({to: wallet.address, value: m(5, 18)})
        console.log('transfer ETH done')

        await usdt.transfer(wallet.address, m(100, 18))
        console.log('deposit ERC20 to', wallet.address)

        await print()
    })


    it('call', async function () {
        console.log('account0 eth:', d(await provider.getBalance(accounts[0].address), 18))
        //check user's balance
        let to = check.address
        let value = m(0, 18)
        const AssetsCheck = await ethers.getContractFactory('AssetsCheck')
        let data = AssetsCheck.interface.encodeFunctionData('checkETHBalanceNotLessThan', [accounts[0].address, m(9994, 18)])

        await wallet.connect(accounts[1]).call(to, value, data)
        console.log('call done')

        await print()
    })


    it('batchCall', async function () {
        let to = usdt.address
        let value = m(0, 18)
        const ERC = await ethers.getContractFactory('MockERC20')
        let data1 = ERC.interface.encodeFunctionData('transfer(address,uint256)', [accounts[1].address, m(1, 18)])

        let abi = getAbi('./artifacts/contracts/mock/MockERC20.sol/MockERC20.json')
        let interface = new ethers.utils.Interface(abi)
        let data2 = interface.encodeFunctionData('transfer(address,uint256)', [accounts[1].address, m(2, 18)])

        await wallet.connect(accounts[1]).batchCall([to, to, accounts[1].address], [value, value, m(1, 18)], [data1, data2, []])
        console.log('batch withdraw done')

        await print()
    })


    it('validateBatchCall', async function () {
        let to = usdt.address
        let value = m(0, 18)
        let codedParam = utils.defaultAbiCoder.encode(['address','uint'], [accounts[1].address, m(1, 18)])
        let selector = utils.hexDataSlice(utils.keccak256(stringToHex('transfer(address,uint256)')), 0, 4)
        let data = utils.hexConcat([selector, codedParam])
        // equal to bellow
        // const ERC = await ethers.getContractFactory('MockERC20')
        // let data = ERC.interface.encodeFunctionData('transfer(address,uint256)', [accounts[1].address, m(1, 18)])
        let call = {to, value, data}
  
        to = check.address
        value = m(0, 18)
        const AssetsCheck = await ethers.getContractFactory('AssetsCheck')
        data = AssetsCheck.interface.encodeFunctionData('checkTokenBalanceEqualTo', [wallet.address, usdt.address, m(96, 18)])
        let call2 = {to, value, data}

        let address0 = '0x0000000000000000000000000000000000000000'
        let s = await signBatchCall(accounts[1], wallet.address, [call, call2], address0)

        await wallet.connect(accounts[2]).validateBatchCall(s.toArr, s.valueArr, s.dataArr, s.deadline, s.sender, s.signature)
        console.log('validateBatchCall')

        await print()
    })


    async function signBatchCall(signer, fromWallet, callArr, sender) {
        let toArr = []
        let valueArr = []
        let dataArr = []
        for (let i=0; i<callArr.length; i++) {
            let to = callArr[i].to
            let value = callArr[i].value
            let data = callArr[i].data

            toArr.push(to)
            valueArr.push(value)
            dataArr.push(data)
        }

        let deadline = Date.now() + 10000;
        let chainId = (await provider.getNetwork()).chainId
        const BatchCallWallet = await ethers.getContractFactory('BatchCallWallet')
        let nonce = await (await BatchCallWallet.attach(fromWallet)).nonce()

        let batchCall = BatchCallWallet.interface.encodeFunctionData('validateBatchCall', [toArr, valueArr, dataArr, deadline, sender, []])
        batchCall = utils.hexConcat([batchCall, utils.hexZeroPad(chainId, 31), fromWallet, utils.hexZeroPad(nonce, 32)])
        // console.log('[nodejs] batchCall')
        // console.log(batchCall)

        let hash = utils.keccak256(batchCall)
        let signature = await signer.signMessage(utils.arrayify(hash))

        return {toArr, valueArr, dataArr, deadline, chainId, fromWallet, nonce, sender, signature}
    }


    async function print() {
        console.log('')
        
        console.log('account0 usdt:', d(await usdt.balanceOf(accounts[0].address), 18), 'eth:', d(await provider.getBalance(accounts[0].address), 18))
        console.log('account1 usdt:', d(await usdt.balanceOf(accounts[1].address), 18), 'eth:', d(await provider.getBalance(accounts[1].address), 18))
        console.log('wallet usdt:', d(await usdt.balanceOf(wallet.address), 18), 'eth:', d(await provider.getBalance(wallet.address), 18))

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
