const hre = require('hardhat')
const fs = require('fs')
const { BigNumber, utils } = require('ethers')
const snarkjs = require('snarkjs')



const ZKPASS_ADDRESS = '0x6009234967B1c7872de00BB3f3e77610b8D6dc9e'
const SAFEBOXFACTORY_ADDRESS = '0xa877a2247b318b40935E102926Ba5ff4F3b0E8b1'
const USDC_ADDRESS = '0x67aE69Fd63b4fc8809ADc224A9b82Be976039509'
// const SAFEBOX_ADDRESS = '0xd66016D8bF4a981dfA826999f73D2c2937dA06eD'
const SAFEBOX_ADDRESS = '0x27370bc7be6584931bf365014cf3ae0b5630ac72'

var provider

async function create() {
    const accounts = await hre.ethers.getSigners()
    provider = accounts[0].provider
    const delayer = accounts[0].address
    console.log('caller: ', delayer)

    const SafeboxFactory = await ethers.getContractFactory('SafeboxV2Factory')
    const safeboxFactory = await SafeboxFactory.attach(SAFEBOXFACTORY_ADDRESS)

    let predictedAddress = await safeboxFactory.newSafeboxAddr(delayer)
    console.log('safebox predictedAddress', predictedAddress)

    // 创建保险箱
    let pwd = '123456'
    let nonce = '1'
    let datahash = '0'
    let p = await getProof(pwd, predictedAddress, nonce, datahash)
    let tx = await safeboxFactory.createSafebox(p.proof, p.pwdhash, p.expiration, p.allhash)
    console.log('createSafebox submitted')
    let receipt = await tx.wait()
    console.log('createSafebox confirmed, safebox address is:', b(receipt.logs[2].topics[2]).toHexString())

    console.log('done')
}


async function login() {
    const accounts = await hre.ethers.getSigners()
    provider = accounts[0].provider
    const user = accounts[0].address
    console.log('caller: ', user)

    const ZKPass = await ethers.getContractFactory('ZKPass')
    const zkPass = await ZKPass.attach(ZKPASS_ADDRESS)

    //用户名密码
    let id = SAFEBOX_ADDRESS
    let pwd = '123456'

    //登录
    let nonce = s(await zkPass.nonceOf(SAFEBOX_ADDRESS))
    let datahash = '0'
    let p = await getProof(pwd, SAFEBOX_ADDRESS, nonce, datahash)

    if (p.pwdhash == s(await zkPass.pwdhashOf(SAFEBOX_ADDRESS))) {
        console.log('密码正确')

        const Safebox = await ethers.getContractFactory('SafeboxV2')
        const safebox = await Safebox.attach(SAFEBOX_ADDRESS)

        if (await safebox.pkAddr() == '0x0000000000000000000000000000000000000000') {
            //新用户，未绑定私钥，引导他绑定
            datahash = s(b(user))
            p = await getProof(pwd, safebox.address, nonce, datahash)
            await safebox.resetPk(user, p.proof, p.expiration, p.allhash)
            console.log('resetPk done, enter app..')
        } else {
            //老用户，已绑定私钥，直接进入app
            console.log('safebox had pk, enter app..')
        }
        
    } else {
        console.log('密码错误')
    }

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

login()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });