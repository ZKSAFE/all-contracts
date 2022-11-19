const { BigNumber, utils } = require('ethers')
const snarkjs = require("snarkjs")
const fs = require("fs")

describe('SimpleWallet2-test', function () {
    let accounts
    let provider
    let simpleWallet
    let zkID
    let zkPass
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
        await usdt.mint(accounts[1].address, m(1000, 18))
        console.log('usdt mint to accounts[1]', d(await usdt.balanceOf(accounts[1].address), 18))

        const ZKID = await ethers.getContractFactory('ZKID')
        zkID = await ZKID.deploy()
        await zkID.deployed()
        console.log('zkID deployed:', zkID.address)

        const ZKPass = await ethers.getContractFactory('ZKPass')
        zkPass = await ZKPass.deploy()
        await zkPass.deployed()
        console.log('zkPass deployed:', zkPass.address)
    })


    it('deploy SimpleWallet', async function () {
        const SimpleWallet = await ethers.getContractFactory('SimpleWallet2')
        simpleWallet = await SimpleWallet.deploy(zkPass.address, zkID.address)
        await simpleWallet.deployed()
        console.log('simpleWallet deployed:', simpleWallet.address)
    })


    it('initPassword', async function () {
        let pwd = 'abc123'
        let nonce = '1'
        let datahash = '0'
        let p = await getProof(pwd, simpleWallet.address, nonce, datahash)

        await simpleWallet.resetPassword(p.proof, 0, 0, p.proof, p.pwdhash, p.expiration, p.allhash)
        console.log('initPassword done')
    })


    it('mint ZKID', async function () {
        await zkID.mint(simpleWallet.address, 2022)
        console.log('mint ZKID done')
    })


    it('deposit', async function () {
        let addr = await zkID.ownerOf(2022)
        await usdt.transfer(addr, m(100, 18))
        console.log('deposit ERC20 to', addr)

        await print()
    })


    it('withdraw', async function () {
        let pwd = 'abc123'
        let nonce = s(await zkPass.nonceOf(simpleWallet.address))
        let contractAddr = usdt.address
        const ERC = await ethers.getContractFactory('MockERC20')
        let sigData = ERC.interface.encodeFunctionData('transfer(address,uint256)', [accounts[1].address, m(40, 18)])

        let datahash = utils.solidityKeccak256(['address', 'bytes'], [contractAddr, sigData])
        datahash = s(b(datahash))
        let p = await getProof(pwd, simpleWallet.address, nonce, datahash)

        //any EOA wallet can call the simpleWallet, but only with the correct password can be excuted
        await simpleWallet.connect(accounts[1]).call(p.proof, contractAddr, sigData, p.expiration, p.allhash)
        console.log('withdraw ERC20 done')

        await print()
    })

    it('batch withdraw', async function () {
        let pwd = 'abc123'
        let nonce = s(await zkPass.nonceOf(simpleWallet.address))
        let contractAddr = usdt.address
        const ERC = await ethers.getContractFactory('MockERC20')
        let sigData1 = ERC.interface.encodeFunctionData('transfer(address,uint256)', [accounts[1].address, m(40, 18)])
        let sigData2 = ERC.interface.encodeFunctionData('transfer(address,uint256)', [accounts[0].address, m(10, 18)])

        let datahash = utils.solidityKeccak256(['address', 'bytes', 'address', 'bytes'], [contractAddr, sigData1, contractAddr, sigData2])
        datahash = s(b(datahash))
        let p = await getProof(pwd, simpleWallet.address, nonce, datahash)

        await simpleWallet.connect(accounts[1]).batchCall(p.proof, [contractAddr, contractAddr], [sigData1, sigData2], p.expiration, p.allhash)
        console.log('batch withdraw ERC20 done')

        await print()
    })


    //util
    async function getProof(pwd, address, nonce, datahash) {

        let expiration = parseInt(Date.now() / 1000 + 600)
        let chainId = (await provider.getNetwork()).chainId
        let fullhash = utils.solidityKeccak256(['uint256', 'uint256', 'uint256', 'uint256'], [expiration, chainId, nonce, datahash])
        fullhash = s(b(fullhash).div(8)) //must be 254b, not 256b

        let input = [stringToHex(pwd), address, fullhash]
        let data = await snarkjs.groth16.fullProve({ in: input }, "./zk/main9/circuit_js/circuit.wasm", "./zk/main9/circuit_final.zkey")

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

            return { proof, pwdhash, address, expiration, chainId, nonce, datahash, fullhash, allhash }

        } else {
            console.log("Invalid proof")
        }
    }

    async function print() {
        console.log('')

        console.log('account0 usdt:', d(await usdt.balanceOf(accounts[0].address), 18))
        console.log('account1 usdt:', d(await usdt.balanceOf(accounts[1].address), 18))
        console.log('simpleWallet usdt:', d(await usdt.balanceOf(simpleWallet.address), 18))

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
