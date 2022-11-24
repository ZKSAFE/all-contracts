const { BigNumber, utils } = require('ethers')
const snarkjs = require("snarkjs")
const fs = require("fs")

describe('deploy-test', function () {
    let accounts
    let provider
    let zksafe_coder
    let zkPass

    before(async function () {
        accounts = await ethers.getSigners()
        provider = accounts[0].provider
        console.log('deployer: ', accounts[0].address)

        zksafe_coder = new ethers.Wallet(process.env.ZKSAFE_Coder_PK, provider)
        console.log('zksafe_coder', zksafe_coder.address, 'balance', s(await zksafe_coder.getBalance()))
    })

    it('deploy', async function () {
        await accounts[0].sendTransaction({to: zksafe_coder.address, value: m(100, 18)})
        console.log('send ETH to', zksafe_coder.address)

        
        for (let i=1; i<=26; i++) {
            await zksafe_coder.sendTransaction({to: '0xE44081Ee2D0D4cbaCd10b44e769A14Def065eD4D', value: 1})
            console.log('send', i)
        } 
        
        const ZKPass = await ethers.getContractFactory('ZKPass')
        const zkPass = await ZKPass.connect(zksafe_coder).deploy()
        await zkPass.deployed()
        console.log('ZKPass deployed:', zkPass.address)

        const SafeboxFactory = await ethers.getContractFactory('SafeboxFactory')
        const safeboxFactory = await SafeboxFactory.connect(zksafe_coder).deploy(zkPass.address)
        await safeboxFactory.deployed()
        console.log('SafeboxFactory deployed:', safeboxFactory.address)
    })


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
