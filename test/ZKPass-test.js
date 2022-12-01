const { BigNumber, utils } = require('ethers')
const snarkjs = require("snarkjs")
const fs = require("fs")

describe('ZKPass-test', function () {
    let accounts
    let provider
    let zkPass

    before(async function () {
        accounts = await ethers.getSigners()
        provider = accounts[0].provider
    })

    it('deploy', async function () {
        const ZKPass = await ethers.getContractFactory('ZKPass')
        zkPass = await ZKPass.deploy()
        await zkPass.deployed()
        console.log('zkPass deployed:', zkPass.address)
    })


    it('initPassword', async function () {
        let pwd = '1234567890123456789012345678901234567890'
        let nonce = '1'
        let datahash = '0'
        let p = await getProof(pwd, accounts[0].address, nonce, datahash)

        await zkPass.resetPassword(p.proof, 0, 0, p.proof, p.pwdhash, p.expiration, p.allhash)
        console.log('initPassword done')
    })


    it('resetPassword', async function () {
        let oldpwd = '1234567890123456789012345678901234567890'
        let nonce = await zkPass.nonceOf(accounts[0].address)
        let datahash = '0'
        let oldZkp = await getProof(oldpwd, accounts[0].address, s(nonce), datahash)
   
        let newpwd = '12345678901234567890123456789012345678901234567890123456789012345678901234567890'
        let newZkp = await getProof(newpwd, accounts[0].address, s(nonce.add(1)), datahash)

        await zkPass.resetPassword(oldZkp.proof, oldZkp.expiration, oldZkp.allhash, newZkp.proof, newZkp.pwdhash, newZkp.expiration, newZkp.allhash)
        console.log('resetPassword done')
    })


    //util
    async function getProof(pwd, address, nonce, datahash) {

        let expiration = parseInt(Date.now() / 1000 + 600)
        let chainId = (await provider.getNetwork()).chainId
        let fullhash = utils.solidityKeccak256(['uint256','uint256','uint256','uint256'], [expiration, chainId, nonce, datahash])
        fullhash = s(b(fullhash).div(8)) //must be 254b, not 256b

        let input = [stringToHex(pwd), address, fullhash]
        let data = await snarkjs.groth16.fullProve({in:input}, "./zk/v1/circuit_js/circuit.wasm", "./zk/v1/circuit_final.zkey")

        // console.log(JSON.stringify(data))

        const vKey = JSON.parse(fs.readFileSync("./zk/v1/verification_key.json"))
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
