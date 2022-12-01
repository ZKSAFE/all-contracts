const hre = require('hardhat')
const fs = require('fs')
const { BigNumber, utils } = require('ethers')



// polygon mainnet 2022-11-20 V1
// deployer:  0xb42466f1c2B0d878ff14E76477f8AF016E5dBe26
// ZKPass deployed: 0xCDc902C17985f5d66A857F67a2BD6f5A29cE225d
// SafeboxFactory deployed: 0x5a93D9a81F1ee8368BaD0EEb0f653bB45bFc6329

// bsc mainnet 2022-11-21 V1
// deployer:  0xb42466f1c2B0d878ff14E76477f8AF016E5dBe26
// ZKPass deployed: 0x930Db107c074E3f66C923180100F74fF4AABEaa5
// SafeboxFactory deployed: 0xA4260E6f2532c29B69ac6015108c11434831eb14

const MATIC_ZKPASS_ADDRESS = '0xCDc902C17985f5d66A857F67a2BD6f5A29cE225d'
const MATIC_SAFEBOXFACTORY_ADDRESS = '0x5a93D9a81F1ee8368BaD0EEb0f653bB45bFc6329'
const MATIC_USDT_ADDRESS = '0xc2132d05d31c914a87c6611c10748aeb04b58e8f'

async function main() {
    const accounts = await hre.ethers.getSigners()
    console.log('deployer: ', accounts[0].address)

    const ZKPass = await ethers.getContractFactory('ZKPass')
    const zkPass = await ZKPass.attach(MATIC_ZKPASS_ADDRESS)

    const SafeboxFactory = await ethers.getContractFactory('SafeboxFactory')
    const safeboxFactory = await SafeboxFactory.attach(MATIC_SAFEBOXFACTORY_ADDRESS)

    const MockERC20 = await ethers.getContractFactory('MockERC20')
    const usdt = await MockERC20.attach(MATIC_USDT_ADDRESS)

    let userArr = [
        '0x77831A5427A36fF9F198419600B026f4BC0139e5',
        '0x486206182BB5012A9eAa36ba2286198CE2e14d25',
        '0x52c635f0c85f2b40f8206a5afca7ec7091b945b9',
        '0xfd89bB8676BC56810529FAc947A8CEC90864F19D',
        '0xF761826F369530e50530051E3290d8F44fE70249',
        '0x0C75E985d78a8dFBb369a0054DB158b6ED9C46f4',
        '0x558891740CBfF30832443BC93AE5076CdB48ECFB',
        '0x031f1E3ebed54bD68cBD0C523191Da792CEB2CD6',
        '0xB966D3d1a3AC0D735cacc22A35eD19A12E903E1E',
        '0x3d7963191205Dc8Aea6AB7ad85fa7105f2B806DA',
    ]

    for (let user of userArr) {
        let safeboxAddr = await safeboxFactory.getSafeboxAddr(user)
        // let tx = await usdt.transfer(safeboxAddr, m(1, 6))
        let u = await usdt.balanceOf(safeboxAddr)
        console.log('user address:', user, 'safebox address:', safeboxAddr, 'safebox usdt:', d(u, 6))
    }

    console.log('done')
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

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });