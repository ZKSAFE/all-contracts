const { BigNumber, utils } = require('ethers')
const snarkjs = require("snarkjs")
const fs = require("fs")

describe('Safebox-fee', function () {
    let accounts
    let provider
    let zkPass
    let safeboxFactory
    let safebox
    let usdt
    let busd
    let nft
    let fee

    before(async function () {
        accounts = await ethers.getSigners()
        provider = accounts[0].provider
    })

    it('deploy', async function () {
        const ZKPass = await ethers.getContractFactory('ZKPass')
        zkPass = await ZKPass.deploy()
        await zkPass.deployed()
        console.log('zkPass deployed:', zkPass.address)


        const SafeboxFactory = await ethers.getContractFactory('SafeboxFactory')
        safeboxFactory = await SafeboxFactory.deploy(zkPass.address)
        await safeboxFactory.deployed()
        console.log('safeboxFactory deployed:', safeboxFactory.address)
    })


    it('initPassword_0', async function () {
        let pwd = 'abc123'
        let nonce = '1'
        let datahash = '0'
        let p = await getProof(pwd, accounts[0].address, nonce, datahash)

        await zkPass.resetPassword(p.proof, 0, 0, p.proof, p.pwdhash, p.expiration, p.allhash)
        console.log('initPassword done')
    })


    it('initPassword_1', async function () {
        let pwd = 'abc123456'
        let nonce = '1'
        let datahash = '0'
        let p = await getProof(pwd, accounts[1].address, nonce, datahash)

        await zkPass.connect(accounts[1]).resetPassword(p.proof, 0, 0, p.proof, p.pwdhash, p.expiration, p.allhash)
        console.log('initPassword done')
    })


    it('transferOwnership', async function () {
        let pwd = 'abc123'
        let nonce = s(await zkPass.nonceOf(accounts[0].address))
        let newOwner = accounts[1].address
        let newOwner_uint = s(b(newOwner))
        let p = await getProof(pwd, accounts[0].address, nonce, newOwner_uint)

        await safeboxFactory.transferOwnership(p.proof, newOwner, p.expiration, p.allhash)
        console.log('transferOwnership done')
    })


    it('setFee', async function () {
        let pwd = 'abc123456'
        let nonce = s(await zkPass.nonceOf(accounts[1].address))
        let newFee = s(utils.parseEther('0.2'))
        let p = await getProof(pwd, accounts[1].address, nonce, newFee)

        let fee = await safeboxFactory.fee()
        console.log('fee', utils.formatEther(fee))
        
        await safeboxFactory.connect(accounts[1]).setFee(p.proof, newFee, p.expiration, p.allhash)
        console.log('setFee done')

        fee = await safeboxFactory.fee()
        console.log('fee', utils.formatEther(fee))
    })

    it('setFeeTo', async function () {
        let pwd = 'abc123456'
        let nonce = s(await zkPass.nonceOf(accounts[1].address))
        let feeTo = accounts[2].address
        let p = await getProof(pwd, accounts[1].address, nonce, feeTo)

        console.log('feeTo', await safeboxFactory.feeTo())
        
        await safeboxFactory.connect(accounts[1]).setFeeTo(p.proof, feeTo, p.expiration, p.allhash)
        console.log('setFeeTo done')

        feeTo = await safeboxFactory.feeTo()
        console.log('feeTo', feeTo)
    })


    //util
    async function getProof(pwd, address, nonce, datahash) {

        let expiration = parseInt(Date.now() / 1000 + 600)
        let chainId = (await provider.getNetwork()).chainId
        let fullhash = utils.solidityKeccak256(['uint256','uint256','uint256','uint256'], [expiration, chainId, nonce, datahash])
        fullhash = s(b(fullhash).div(8)) //must be 254b, not 256b

        let input = [stringToHex(pwd), address, fullhash]
        let data = await snarkjs.groth16.fullProve({in:input}, "./zk/main9/circuit_js/circuit.wasm", "./zk/main9/circuit_final.zkey")

        // console.log(JSON.stringify(data))

        const vKey = JSON.parse(fs.readFileSync("./zk/main9/verification_key.json"))
        const res = await snarkjs.groth16.verify(vKey, data.publicSignals, data.proof)

        if (res === true) {
            console.log("Verification OK")

            let pwdhash = data.publicSignals[0]
            let fullhash = data.publicSignals[1]
            let allhash = data.publicSignals[2]

            let proof = [
                BigNumber.from(data.proof.pi_a[0]).toHexString(),
                BigNumber.from(data.proof.pi_a[1]).toHexString(),
                BigNumber.from(data.proof.pi_b[0][1]).toHexString(),
                BigNumber.from(data.proof.pi_b[0][0]).toHexString(),
                BigNumber.from(data.proof.pi_b[1][1]).toHexString(),
                BigNumber.from(data.proof.pi_b[1][0]).toHexString(),
                BigNumber.from(data.proof.pi_c[0]).toHexString(),
                BigNumber.from(data.proof.pi_c[1]).toHexString()
            ]

            return {proof, pwdhash, address, expiration, chainId, nonce, datahash, fullhash, allhash}

        } else {
            console.log("Invalid proof")
        }
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
