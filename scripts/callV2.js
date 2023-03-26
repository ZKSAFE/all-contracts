const hre = require('hardhat')
const fs = require('fs')
const { BigNumber, utils } = require('ethers')
const snarkjs = require('snarkjs')



const ZKPASS_ADDRESS = '0x6009234967B1c7872de00BB3f3e77610b8D6dc9e'
const SAFEBOXFACTORY_ADDRESS = '0xa877a2247b318b40935E102926Ba5ff4F3b0E8b1'
const USDC_ADDRESS = '0x67aE69Fd63b4fc8809ADc224A9b82Be976039509'
const SAFEBOX_ADDRESS = '0xd66016D8bF4a981dfA826999f73D2c2937dA06eD'

var provider

async function main() {
    const accounts = await hre.ethers.getSigners()
    provider = accounts[0].provider
    console.log('deployer: ', accounts[0].address)

    const ZKPass = await ethers.getContractFactory('ZKPass')
    const zkPass = await ZKPass.attach(ZKPASS_ADDRESS)

    const SafeboxFactory = await ethers.getContractFactory('SafeboxV2Factory')
    const safeboxFactory = await SafeboxFactory.attach(SAFEBOXFACTORY_ADDRESS)

    // let predictedAddress = await safeboxFactory.newSafeboxAddr(accounts[0].address)
    // console.log('safebox predictedAddress', predictedAddress)
    const Safebox = await ethers.getContractFactory('SafeboxV2')
    let safebox = await Safebox.attach(SAFEBOX_ADDRESS)

    // const MockERC20 = await ethers.getContractFactory('MockERC20')
    // const usdt = await MockERC20.attach(USDC_ADDRESS)

    // await usdt.transfer(predictedAddress, m(1, 18))

    //createSafebox
    // let pwd = '***'
    // let nonce = '1'
    // let datahash = '0'
    // let p = await getProof(pwd, safebox.address, nonce, datahash)
    // let tx = await safeboxFactory.createSafebox(p.proof, p.pwdhash, p.expiration, p.allhash)
    // console.log('createSafebox submitted')
    // let receipt = await tx.wait()
    // console.log('createSafebox confirmed, address:', b(receipt.logs[2].topics[2]).toHexString())

    //setup privatekey
    // pwd = '***'
    // nonce = s(await zkPass.nonceOf(safebox.address))
    // datahash = s(b(accounts[0].address))
    // p = await getProof(pwd, safebox.address, nonce, datahash)
    // await safebox.resetPk(accounts[0].address, p.proof, p.expiration, p.allhash)
    // console.log('resetPk done')

    // await delay(10)
    console.log('safebox pkAddr:', await safebox.pkAddr())

    console.log('done')
}

//util
async function getProof(pwd, address, nonce, datahash) {

    let expiration = parseInt(Date.now() / 1000 + 600)
    let chainId = (await provider.getNetwork()).chainId
    let fullhash = utils.solidityKeccak256(['uint256', 'uint256', 'uint256', 'uint256'], [expiration, chainId, nonce, datahash])
    fullhash = s(b(fullhash).div(8)) //must be 254b, not 256b

    let input = [stringToHex(pwd), address, fullhash]
    let data = await snarkjs.groth16.fullProve({ in: input }, "./zk/v1/circuit_js/circuit.wasm", "./zk/v1/circuit_final.zkey")

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

        return { proof, pwdhash, address, expiration, chainId, nonce, datahash, fullhash, allhash }

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
    console.log('delay.. ' + sec + 's')
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

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });