const { BigNumber, utils } = require('ethers')
const snarkjs = require('snarkjs')
const fs = require('fs')
const { util } = require('chai')

describe('Relayer-test', function () {
    let accounts
    let provider
    let zkWallet
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
   
        const ZKWallet = await ethers.getContractFactory('ZKWallet')
        zkWallet = await ZKWallet.connect(accounts[0]).deploy()
        await zkWallet.deployed()
        console.log('zkWallet0 deployed:', zkWallet.address)

        const Relayer = await ethers.getContractFactory('Relayer')
        relayer = await Relayer.connect(accounts[1]).deploy(usdt.address)
        await relayer.deployed()
        console.log('relayer deployed:', relayer.address)
    })


    it('deposit', async function () {
        await usdt.transfer(zkWallet.address, m(1000, 18))
        console.log('deposit ERC20 to', zkWallet.address)

        let target = usdt.address
        let value = 0
        let ERC = await ethers.getContractFactory('MockERC20')
        let data = ERC.interface.encodeFunctionData('transfer(address,uint256)', [relayer.address, m(100, 18)])
        let call = {target, value, data}
        let signedBatchcall = signBatchCall(accounts[0], zkWallet.address, [call])

        await relayer.depositCall([zkWallet.address], [signedBatchcall])
        console.log('relayer depositCall done')

        await print()
    })


    it('freeCall', async function () {
        let target = usdt.address
        let value = 0
        let ERC = await ethers.getContractFactory('MockERC20')
        let data = ERC.interface.encodeFunctionData('transfer(address,uint256)', [accounts[0].address, m(1, 18)])
        let call = {target, value, data}
        let callArr = []
        for (let i=0; i<1; i++) {
            callArr.push(call)
        }

        let walletArr = []
        let signedBatchcallArr = []
        for (let i=0; i<10; i++) {
            let signedBatchcall = signBatchCall(accounts[0], zkWallet.address, callArr)
            walletArr.push(zkWallet.address)
            signedBatchcallArr.push(signedBatchcall)
        }

        let gasUsed = (await (await relayer.freeCall(walletArr, signedBatchcallArr)).wait()).gasUsed
        console.log('relayer freeCall done', gasUsed)

        await print()
    })


    async function signBatchCall(account, walletAddr, callArr) {
        const ZKWallet = await ethers.getContractFactory('ZKWallet')

        let targetArr = []
        let valueArr = []
        let dataArr = []
        for (let i=0; i<callArr.length; i++) {
            let target = callArr[i].target
            let value = callArr[i].value
            let data = callArr[i].data

            targetArr.push(target)
            valueArr.push(value)
            dataArr.push(data)
        }

        let deadline = Date.now() + 10000;
        let chainId = (await provider.getNetwork()).chainId
        let batchCall = ZKWallet.interface.encodeFunctionData('validateBatchCall', [targetArr, valueArr, dataArr, deadline, []])

        batchCall = utils.hexConcat([batchCall, utils.hexZeroPad(chainId, 31), walletAddr])
        // console.log(batchCall)

        let hash = utils.keccak256(batchCall)

        let signature = await account.signMessage(utils.arrayify(hash))
        // console.log(signature)

        let signedBatchCall = utils.defaultAbiCoder.encode(['address[]', 'uint[]', 'bytes[]', 'uint', 'bytes'], [targetArr, valueArr, dataArr, deadline, signature])

        return signedBatchCall
    }


    // async function signBatchCall(account, walletAddr, callArr) {
    //     let params = []; //must be [], as the same of 'bytes memory params;' in Solidity
    //     let targetArr = []
    //     let valueArr = []
    //     let dataArr = []
    //     for (let i=0; i<callArr.length; i++) {
    //         let target = callArr[i].target
    //         let value = callArr[i].value
    //         let data = callArr[i].data

    //         params = utils.solidityPack(['bytes', 'address', 'uint', 'bytes'], [params, target, value, data])

    //         targetArr.push(target)
    //         valueArr.push(value)
    //         dataArr.push(data)
    //     }
    //     let deadline = Date.now() + 10000;
    //     let chainId = (await provider.getNetwork()).chainId
    //     // utils.solidityPack() is 'abi.encodePacked()' in Solidity
    //     params = utils.solidityPack(['bytes', 'uint', 'uint', 'address'], [params, deadline, chainId, walletAddr])
    //     let hash = utils.keccak256(params)

    //     // console.log('params', params)

    //     let signature = await account.signMessage(utils.arrayify(hash))

    //     let ZKWallet = await ethers.getContractFactory('ZKWallet')
    //     let signedBatchCall = ZKWallet.interface.encodeFunctionData('validateBatchCall', [targetArr, valueArr, dataArr, deadline, signature])

    //     // console.log('signedBatchCall', signedBatchCall)
    //     return signedBatchCall
    // }


    async function print() {
        console.log('')
        
        console.log('account0 usdt:', d(await usdt.balanceOf(accounts[0].address), 18), 'eth:', d(await provider.getBalance(accounts[0].address), 18))
        console.log('account1 usdt:', d(await usdt.balanceOf(accounts[1].address), 18), 'eth:', d(await provider.getBalance(accounts[1].address), 18))
        console.log('zkWallet usdt:', d(await usdt.balanceOf(zkWallet.address), 18), 'eth:', d(await provider.getBalance(zkWallet.address), 18))
        console.log('relayer usdt:', d(await usdt.balanceOf(relayer.address), 18), 'eth:', d(await provider.getBalance(relayer.address), 18))
        console.log('zkWallet usdt in relayer:', d(await relayer.balanceOf(zkWallet.address), 18))

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
