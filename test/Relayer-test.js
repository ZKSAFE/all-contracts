const { BigNumber, utils } = require('ethers')
const snarkjs = require('snarkjs')
const fs = require('fs')
const { util } = require('chai')

describe('Relayer-test', function () {
    let accounts
    let provider
    let wallet
    let relayer
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
   
        const Relayer = await ethers.getContractFactory('Relayer')
        relayer = await Relayer.connect(accounts[1]).deploy(usdt.address)
        await relayer.deployed()
        console.log('relayer deployed:', relayer.address)
    })


    it('user deploy BatchCallWallet & deposit', async function () {
        const BatchCallWallet = await ethers.getContractFactory('BatchCallWallet')
        wallet = await BatchCallWallet.connect(accounts[0]).deploy()
        await wallet.deployed()
        console.log('wallet deployed:', wallet.address)

        //deposit usdt from EOA to BatchCallWallet
        await usdt.transfer(wallet.address, m(1000, 18))
        console.log('deposit ERC20 to', wallet.address)

        //deposit usdt as gas from BatchCallWallet to Relayer
        let to = usdt.address
        let value = m(0, 18)
        let ERC = await ethers.getContractFactory('MockERC20')
        let data = ERC.interface.encodeFunctionData('transfer(address,uint256)', [relayer.address, m(100, 18)])
        let call = {to, value, data}

        let s = await signBatchCall(accounts[0], wallet.address, [call])
        let signedBatchCall = BatchCallWallet.interface.encodeFunctionData('validateBatchCall', [s.toArr, s.valueArr, s.dataArr, s.deadline, s.signature])

        await relayer.depositCall([wallet.address], [signedBatchCall])
        console.log('relayer depositCall done')

        await print()
    })


    it('freeCall', async function () {
        let to = usdt.address
        let value = m(0, 18)
        let ERC = await ethers.getContractFactory('MockERC20')
        let data = ERC.interface.encodeFunctionData('transfer(address,uint256)', [accounts[0].address, m(300, 18)])
        let call = {to, value, data}

        //mock multiple calls batch to one
        let callArr = []
        for (let i=0; i<2; i++) {
            callArr.push(call)
        }

        //mock multiple users
        const BatchCallWallet = await ethers.getContractFactory('BatchCallWallet')
        let walletArr = []
        let signedBatchCallArr = []
        for (let i=0; i<10; i++) {
            let s = await signBatchCall(accounts[0], wallet.address, [call])
            let signedBatchCall = BatchCallWallet.interface.encodeFunctionData('validateBatchCall', [s.toArr, s.valueArr, s.dataArr, s.deadline, s.signature])
            walletArr.push(wallet.address)
            signedBatchCallArr.push(signedBatchCall)
        }

        let gasUsed = (await (await relayer.freeCall(walletArr, signedBatchCallArr)).wait()).gasUsed
        console.log('relayer freeCall done', gasUsed)

        await print()
    })


    async function signBatchCall(signer, fromWallet, callArr) {
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

        let batchCall = BatchCallWallet.interface.encodeFunctionData('validateBatchCall', [toArr, valueArr, dataArr, deadline, []])
        batchCall = utils.hexConcat([batchCall, utils.hexZeroPad(chainId, 31), fromWallet, utils.hexZeroPad(nonce, 32)])
        // console.log('[nodejs] batchCall')
        // console.log(batchCall)

        let hash = utils.keccak256(batchCall)
        let signature = await signer.signMessage(utils.arrayify(hash))

        return {toArr, valueArr, dataArr, deadline, chainId, fromWallet, nonce, signature}
    }


    async function print() {
        console.log('')
        
        console.log('account0 usdt:', d(await usdt.balanceOf(accounts[0].address), 18), 'eth:', d(await provider.getBalance(accounts[0].address), 18))
        console.log('account1 usdt:', d(await usdt.balanceOf(accounts[1].address), 18), 'eth:', d(await provider.getBalance(accounts[1].address), 18))
        console.log('wallet usdt:', d(await usdt.balanceOf(wallet.address), 18), 'eth:', d(await provider.getBalance(wallet.address), 18))
        console.log('relayer usdt:', d(await usdt.balanceOf(relayer.address), 18), 'eth:', d(await provider.getBalance(relayer.address), 18))
        console.log('wallet usdt in relayer:', d(await relayer.balanceOf(wallet.address), 18))

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