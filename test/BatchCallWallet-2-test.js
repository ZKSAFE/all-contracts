const { BigNumber, utils } = require('ethers')
const snarkjs = require("snarkjs")
const fs = require("fs")

describe('BatchCallWallet-2-test', function () {
    let accounts
    let provider
    let wallet0
    let wallet1
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
        wallet0 = await BatchCallWallet.connect(accounts[0]).deploy()
        await wallet0.deployed()
        console.log('wallet0 deployed:', wallet0.address)

        wallet1 = await BatchCallWallet.connect(accounts[1]).deploy()
        await wallet1.deployed()
        console.log('wallet1 deployed:', wallet1.address)
    })


    it('deposit', async function () {
        await accounts[0].sendTransaction({to: wallet0.address, value: m(5, 18)})
        console.log('transfer ETH to', wallet0.address)

        await usdt.transfer(wallet1.address, m(100, 18))
        console.log('deposit ERC20 to', wallet1.address)

        await print()
    })


    it('validateBatchCall', async function () {
        //account1 signing
        let to = usdt.address
        let value = m(0, 18)
        const ERC = await ethers.getContractFactory('MockERC20')
        let data = ERC.interface.encodeFunctionData('transfer(address,uint256)', [wallet0.address, m(10, 18)])
        let call1 = {to, value, data}
  
        to = check.address
        value = m(0, 18)
        const AssetsCheck = await ethers.getContractFactory('AssetsCheck')
        data = AssetsCheck.interface.encodeFunctionData('checkETHBalanceEqualTo', [wallet1.address, m(1, 18)])
        let call2 = {to, value, data}

        let s = await signBatchCall(accounts[1], wallet1.address, [call1, call2], wallet0.address)
        console.log('signBatchCall done')


        //account0 batchCall with account1's signedBatchCall and other calls
        let checkData1 = AssetsCheck.interface.encodeFunctionData('stagingTokenBalance', [wallet0.address, usdt.address])

        const BatchCallWallet = await ethers.getContractFactory('BatchCallWallet')
        let validateBatchCallData = BatchCallWallet.interface.encodeFunctionData('validateBatchCall', [s.toArr, s.valueArr, s.dataArr, s.deadline, s.sender, s.signature])

        let checkData2 = AssetsCheck.interface.encodeFunctionData('checkTokenBalanceIncreaseEqualTo', [wallet0.address, usdt.address, m(10, 18)])

        await wallet0.batchCall(
                [check.address, wallet1.address, wallet1.address, check.address], 
                [0, m(1, 18), 0, 0], 
                [checkData1, [], validateBatchCallData, checkData2]
            )
        console.log('batchCall done')

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
        console.log('wallet0 usdt:', d(await usdt.balanceOf(wallet0.address), 18), 'eth:', d(await provider.getBalance(wallet0.address), 18))
        console.log('wallet1 usdt:', d(await usdt.balanceOf(wallet1.address), 18), 'eth:', d(await provider.getBalance(wallet1.address), 18))

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
