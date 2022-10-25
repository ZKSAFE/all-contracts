const { BigNumber, utils } = require('ethers')
const snarkjs = require("snarkjs")
const fs = require("fs")

/**
 * withdraw 10000 times, can the EPS still work well?
 */
describe('Safebox-10k-withdraw', function () {
    let accounts
    let provider
    let eps
    let safeboxFactory
    let safebox
    let usdt
    let fee
    let pwd = 'abc123'

    before(async function () {
        accounts = await ethers.getSigners()
        provider = accounts[0].provider
    })

    it('deploy', async function () {
        const MockERC20 = await ethers.getContractFactory('MockERC20')
        usdt = await MockERC20.deploy('MockUSDT', 'USDT')
        await usdt.deployed()
        console.log('usdt deployed:', usdt.address)
		await usdt.mint(accounts[0].address, m(20000, 18))
        console.log('usdt mint to accounts[0]', d(await usdt.balanceOf(accounts[0].address), 18))


        const EthereumPasswordService = await ethers.getContractFactory('EthereumPasswordService')
        eps = await EthereumPasswordService.deploy()
        await eps.deployed()
        console.log('eps deployed:', eps.address)
        
        
        const SafeboxFactory = await ethers.getContractFactory('SafeboxFactory')
        safeboxFactory = await SafeboxFactory.deploy(eps.address)
        await safeboxFactory.deployed()
        console.log('safeboxFactory deployed:', safeboxFactory.address)
        fee = await safeboxFactory.fee()
        console.log('safeboxFactory fee(Ether)', utils.formatEther(fee))


        let safeboxAddr = await safeboxFactory.getSafeboxAddr(accounts[0].address)
        console.log('safebox predictedAddress', safeboxAddr)
        const Safebox = await ethers.getContractFactory('Safebox')
        safebox = await Safebox.attach(safeboxAddr)
    })


    it('deposit', async function () {
        await usdt.transfer(safebox.address, m(20000, 18))
        console.log('transfer ERC20 done')
    })


    it('initPassword', async function () {
        let nonce = '1'
        let datahash = '0'
        let p = await getProof(pwd, accounts[0].address, nonce, datahash)

        await eps.resetPassword(p.proof, 0, 0, p.proof, p.pwdhash, p.expiration, p.allhash)
        console.log('initPassword done')
    })


    it('createSafebox', async function () {
        let tx = await safeboxFactory.createSafebox()
        console.log('submited')

        let receipt = await tx.wait()
        console.log('submited done')

        console.log('createSafebox, address:', b(receipt.logs[1].topics[2]).toHexString())

        let safeboxAddr = await safeboxFactory.getSafeboxAddr(accounts[0].address)
        console.log('getSafeboxAddr:', safeboxAddr)
    })


    it('withdrawERC20-10K', async function () {
        this.timeout(0)
        await print()

        let nonce = await eps.nonceOf(accounts[0].address)
        let tokenAddr = usdt.address
        let amount = s(m(1, 18))
        let datahash = utils.solidityKeccak256(['address', 'uint256'], [tokenAddr, amount])
        datahash = s(b(datahash))

        for (let i=0; i<10; i++) {
            let p = await getProof(pwd, accounts[0].address, s(nonce), datahash)
            
            await safebox.withdrawERC20(p.proof, tokenAddr, amount, p.expiration, p.allhash)
            console.log('withdrawERC20 done', i)

            nonce = nonce.add(1)
        }

        await print()
    })


    it('resetPassword-10K', async function () {
        this.timeout(0)
        let nonce = await eps.nonceOf(accounts[0].address)

        for (let i=0; i<10; i++) {
            let datahash = '0'
            let oldZkp = await getProof(pwd, accounts[0].address, s(nonce), datahash)
    
            pwd = i.toString()
            let newZkp = await getProof(pwd, accounts[0].address, s(nonce.add(1)), datahash)

            await eps.resetPassword(oldZkp.proof, oldZkp.expiration, oldZkp.allhash, newZkp.proof, newZkp.pwdhash, newZkp.expiration, newZkp.allhash)
            console.log('resetPassword done', i, pwd)

            nonce = nonce.add(2)
        }
    })


    it('withdrawERC20', async function () {
        let nonce = await eps.nonceOf(accounts[0].address)
        let tokenAddr = usdt.address
        let amount = s(m(1, 18))
        let datahash = utils.solidityKeccak256(['address', 'uint256'], [tokenAddr, amount])
        datahash = s(b(datahash))

        let p = await getProof(pwd, accounts[0].address, s(nonce), datahash)
        
        await safebox.withdrawERC20(p.proof, tokenAddr, amount, p.expiration, p.allhash)
        console.log('withdrawERC20 done')

        await print()
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
        // const res = await snarkjs.groth16.verify(vKey, data.publicSignals, data.proof)

        // if (res === true) {
        //     console.log("Verification OK")

            let pwdhash = data.publicSignals[0]
            // let fullhash = data.publicSignals[1]
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

        // } else {
        //     console.log("Invalid proof")
        // }
    }


    async function print() {
        console.log('')
        for (let i=0; i<=1; i++) {
            let safeboxAddr = await safeboxFactory.getSafeboxAddr(accounts[i].address)
            console.log('accounts[' + i + ']',
                'safeboxAddr', safeboxAddr,
                'usdt:', d(await usdt.balanceOf(accounts[i].address), 18), 
                'eth:', d(await provider.getBalance(accounts[i].address), 18),
                'safebox usdt:', d(await usdt.balanceOf(safeboxAddr), 18),
                'safebox eth:', d(await provider.getBalance(safeboxAddr), 18)
			)
		}
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
