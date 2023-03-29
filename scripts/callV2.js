const hre = require('hardhat')
const fs = require('fs')
const { BigNumber, utils } = require('ethers')
const snarkjs = require('snarkjs')


const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
const ZKPASS_ADDRESS = '0x6009234967B1c7872de00BB3f3e77610b8D6dc9e'
const SAFEBOXFACTORY_ADDRESS = '0xa877a2247b318b40935E102926Ba5ff4F3b0E8b1'
const USDC_ADDRESS = '0x67aE69Fd63b4fc8809ADc224A9b82Be976039509'
const USDT_ADDRESS = '0xf2719572e4E9369cDC061Ef602D0F20f8a42234d'
const ZKID_ADDRESS = '0xeE4D10619E64049102752f5646352943771a3203'
const ERC721_ADDRESS = '0x95de0825D32ce33CbA665E259fE4597E6be0Db27'


var provider

async function create() {
    const accounts = await hre.ethers.getSigners()
    provider = accounts[0].provider
    const delayer = accounts[0].address
    console.log('caller: ', delayer)

    const SafeboxFactory = await ethers.getContractFactory('SafeboxV2Factory')
    const safeboxFactory = await SafeboxFactory.attach(SAFEBOXFACTORY_ADDRESS)

    // 创建保险箱
    let predictedAddress = await safeboxFactory.newSafeboxAddr(delayer)
    console.log('safebox predictedAddress', predictedAddress)
    let pwd = '123456'
    let nonce = '1'
    let datahash = '0'
    let p = await getProof(pwd, predictedAddress, nonce, datahash)
    let tx = await safeboxFactory.createSafebox(p.proof, p.pwdhash, p.expiration, p.allhash)
    console.log('createSafebox submitted')
    let receipt = await tx.wait()
    let safeboxAddr = b(receipt.logs[2].topics[2]).toHexString()
    console.log('createSafebox confirmed, safebox address is:', safeboxAddr)

    // 把id绑定到保险箱地址
    const MockZKID = await ethers.getContractFactory('MockZKID')
    const zkID = await MockZKID.attach(ZKID_ADDRESS)
    let bindingID = s(await zkID.onSaleID())
    await zkID.mint(safeboxAddr)
    console.log('mint zkID to safebox, zkID is:', bindingID)

    //空投NFT
    let tokenId = bindingID
    let tokenURI = 'https://i.seadn.io/gcs/files/92ed2c565f294ec77736abb5a0066050.png'
    const MockERC721 = await ethers.getContractFactory('MockERC721')
    const mockERC721 = await MockERC721.attach(ERC721_ADDRESS)
	await mockERC721.mintURI(safeboxAddr, tokenId, tokenURI)
    console.log('mint NFT to safebox, tokenId is:', tokenId)
    
    //需要区块确认后才能读出来
    // await delay(6)
    // console.log('to address:', await zkID.ownerOf(bindingID))
	// console.log('NFT owner is:', await mockERC721.ownerOf(tokenId), ' tokenURL is:', await mockERC721.tokenURI(tokenId))

    console.log('create done')
}


async function login() {
    const accounts = await hre.ethers.getSigners()
    provider = accounts[0].provider
    const user = accounts[0].address
    console.log('caller: ', user)

    const ZKPass = await ethers.getContractFactory('ZKPass')
    const zkPass = await ZKPass.attach(ZKPASS_ADDRESS)

    const MockZKID = await ethers.getContractFactory('MockZKID')
    const zkID = await MockZKID.attach(ZKID_ADDRESS)

    //id可以是zkID，也可以是safebox address
    let id = '100205'
    // let id = '0x3e44c4f7353b53b9446573617a2a833a4fb9b1c1'
    let pwd = '123456'

    let safeboxAddr
    if (utils.isAddress(id)) {
        //id是safebox address
        safeboxAddr = id
    } else {
        //id是zkID
        safeboxAddr = await zkID.ownerOf(id)
    }
    console.log('safebox address is:', safeboxAddr)
    if (safeboxAddr == ZERO_ADDRESS) {
        console.log('wrong id')
        return
    }

    //登录
    let nonce = s(await zkPass.nonceOf(safeboxAddr))
    let datahash = '0'
    let p = await getProof(pwd, safeboxAddr, nonce, datahash)

    if (p.pwdhash == s(await zkPass.pwdhashOf(safeboxAddr))) {
        console.log('password correct')

        const Safebox = await ethers.getContractFactory('SafeboxV2')
        const safebox = await Safebox.attach(safeboxAddr)

        let pkAddr = await safebox.pkAddr()
        if (pkAddr == ZERO_ADDRESS) {
            //新用户，未绑定私钥，引导他绑定
            datahash = s(b(user))
            p = await getProof(pwd, safebox.address, nonce, datahash)
            await safebox.resetPk(user, p.proof, p.expiration, p.allhash)
            console.log('resetPk done, enter app..')
            await enter(safebox.address, user)

        } else if(pkAddr == user) {
            //老用户，已绑定私钥，直接进入app
            console.log('safebox had pk, enter app..')
            await enter(safebox.address, user)

        } else {
            //密码正确，但是不是safebox绑定的私钥
            console.log('not the safebox owner, only owner can enter')
        }
        
    } else {
        console.log('wrong password')
    }

    console.log('login done')
}


async function enter(safeboxAddr, walletAddr) {
    const accounts = await hre.ethers.getSigners()
    provider = accounts[0].provider

    console.log('ETH balance in safebox:', d(await provider.getBalance(safeboxAddr), 18), ' in wallet:', d(await provider.getBalance(walletAddr), 18))
    
    const MockERC20 = await ethers.getContractFactory('MockERC20')
    const usdc = await MockERC20.attach(USDC_ADDRESS)
    console.log('USDC balance in safebox:', d(await usdc.balanceOf(safeboxAddr), 6), ' in wallet:', d(await usdc.balanceOf(walletAddr), 6))

    const usdt = await MockERC20.attach(USDT_ADDRESS)
    console.log('USDT balance in safebox:', d(await usdt.balanceOf(safeboxAddr), 6), ' in wallet:', d(await usdt.balanceOf(walletAddr), 6))

    const MockERC721 = await ethers.getContractFactory('MockERC721')
    const mockERC721 = await MockERC721.attach(ERC721_ADDRESS)
    let tokenId = '100205'
    let nftOwner = await mockERC721.ownerOf(tokenId)
	if (nftOwner == safeboxAddr) {
        console.log('NFT in safebox')
    } else if (nftOwner == walletAddr) {
        console.log('NFT in wallet')
    } else {
        console.log('not own NFT')
    }
    console.log(await mockERC721.symbol() + ' #' + tokenId + ' owner is:', nftOwner, ' tokenURL is:', await mockERC721.tokenURI(tokenId)) 

    console.log('enter done')
}


async function deposit() {
    const accounts = await hre.ethers.getSigners()
    provider = accounts[0].provider
    const user = accounts[0].address
    console.log('caller: ', user)

    let safeboxAddr = '0x3e44c4f7353b53b9446573617a2a833a4fb9b1c1'
    let amount = s(m(20, 6)) //充值金额20U USDC\USDT都是6位小数

    const MockERC20 = await ethers.getContractFactory('MockERC20')
    const usdc = await MockERC20.attach(USDC_ADDRESS)
    await usdc.transfer(safeboxAddr, amount)
    console.log('deposit USDC done')
    
    const usdt = await MockERC20.attach(USDT_ADDRESS)
    await usdt.transfer(safeboxAddr, amount)
    console.log('deposit USDT done')
}


async function withdraw() {
    const accounts = await hre.ethers.getSigners()
    provider = accounts[0].provider
    const user = accounts[0].address
    console.log('caller: ', user)

    let safeboxAddr = '0x3e44c4f7353b53b9446573617a2a833a4fb9b1c1'
    const Safebox = await ethers.getContractFactory('SafeboxV2')
    const safebox = await Safebox.attach(safeboxAddr)

    //user input
    let amount = m(11, 6) //提款金额20U USDC\USDT都是6位小数
    let receiver = user //提款给谁

    //检查safebox免密提取的额度，注意稳定币是按18位小数来算
    let arr = await safebox.getWithdrawLimit()
    let ethFree = d(arr[0], 18)
    let usdFree = d(arr[0], 18)
    console.log('safebox withdrawLimit: ethFree:', ethFree, ' usdFree:', usdFree)

    let to = USDC_ADDRESS
    let value = m(0, 18) //ETH数量，0
    const ERC = await ethers.getContractFactory('MockERC20')
    let data = ERC.interface.encodeFunctionData('transfer(address,uint256)', [receiver, amount])

    if (usdFree >= d(amount, 6)) { //小额免密
        await safebox.call(to, value, data)
        console.log('withdraw small USDT done')
    
    } else { //大额需要密码
        let pwd = '123456' //user input

        const ZKPass = await ethers.getContractFactory('ZKPass')
        const zkPass = await ZKPass.attach(ZKPASS_ADDRESS)
        let nonce = s(await zkPass.nonceOf(safebox.address))
        let datahash = utils.solidityKeccak256(['address','uint256','bytes'], [to, value, data])
        let p = await getProof(pwd, safebox.address, nonce, datahash)
        await safebox.call2(to, value, data, p.proof, p.expiration, p.allhash)
        console.log('withdraw big USDT done')
    }
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
    return bn.mul(BigNumber.from(10000)).div(BigNumber.from(10).pow(decimals)).toNumber() / 10000
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