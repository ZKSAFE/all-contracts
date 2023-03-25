const { BigNumber, utils } = require('ethers')
const snarkjs = require("snarkjs")
const fs = require("fs")

describe('SafeboxV2-test', function () {
    let accounts
    let provider
    let zkPass
    let safeboxFactory
    let safebox
    let usdt
    let token
    let nft

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
        
        token = await MockERC20.deploy('MockToken', 'Token')
        await token.deployed()
        console.log('token deployed:', token.address)
		await token.mint(accounts[0].address, m(1000, 18))
        console.log('token mint to accounts[0]', d(await token.balanceOf(accounts[0].address), 18))
		await token.mint(accounts[1].address, m(1000, 18))
        console.log('token mint to accounts[1]', d(await token.balanceOf(accounts[1].address), 18))


        const MockERC721 = await ethers.getContractFactory('MockERC721')
        nft = await MockERC721.deploy('MockNFT', 'NFT')
        await nft.deployed()
        console.log('nft deployed:', nft.address)
		await nft.mint(accounts[0].address, b('9988'))
        console.log('busd mint to accounts[0]', await nft.ownerOf(b('9988')))

        
        const ZKPass = await ethers.getContractFactory('ZKPass')
        zkPass = await ZKPass.deploy()
        await zkPass.deployed()
        console.log('zkPass deployed:', zkPass.address)
        
        
        const SafeboxFactory = await ethers.getContractFactory('SafeboxV2Factory')
        safeboxFactory = await SafeboxFactory.deploy([zkPass.address, usdt.address])
        await safeboxFactory.deployed()
        console.log('safeboxFactory deployed:', safeboxFactory.address)
        

        let safeboxAddr = await safeboxFactory.newSafeboxAddr(accounts[0].address)
        console.log('safebox predictedAddress', safeboxAddr)
        const Safebox = await ethers.getContractFactory('SafeboxV2')
        safebox = await Safebox.attach(safeboxAddr)
    })


    it('deposit', async function () {
        await usdt.transfer(safebox.address, m(100, 18))
        console.log('transfer USDT done')

        await token.transfer(safebox.address, m(100, 18))
        console.log('transfer Token done')

        await nft.transferFrom(accounts[0].address, safebox.address, b('9988'))
        console.log('transfer NFT done')

        // let gasLimit = await accounts[0].estimateGas({to: safebox.address, value: m(2, 18)})
        // console.log('deposit ETH gasLimit', gasLimit)

        await accounts[0].sendTransaction({to: safebox.address, value: m(200, 18)})
        console.log('transfer ETH done')

        await print()
    })


    it('createSafebox', async function () {
        let pwd = 'abc123'
        let nonce = '1'
        let datahash = '0'
        let p = await getProof(pwd, safebox.address, nonce, datahash)

        let tx = await safeboxFactory.createSafebox(p.proof, p.pwdhash, p.expiration, p.allhash)
        console.log('submited')

        let receipt = await tx.wait()
        console.log('submited done')

        console.log('createSafebox, address:', b(receipt.logs[2].topics[2]).toHexString())
    })


    it('resetPk', async function () {
        let pwd = 'abc123'
        let nonce = s(await zkPass.nonceOf(safebox.address))
        let datahash = s(b(accounts[0].address))
        let p = await getProof(pwd, safebox.address, nonce, datahash)

        await safebox.resetPk(accounts[0].address, p.proof, p.expiration, p.allhash)
        console.log('resetPk done')

        console.log('safebox pkAddr:', await safebox.pkAddr())
    })


    it('withdraw NFT with pk', async function () {
        let to = nft.address
        let value = m(0, 18)
        const ERC = await ethers.getContractFactory('MockERC721')
        let data = ERC.interface.encodeFunctionData('transferFrom(address,address,uint256)', [safebox.address, accounts[1].address, '9988'])

        await safebox.call(to, value, data)
        console.log('withdraw NFT done')

        await print()
        await printWithdrawLimit()
    })


    it('withdraw Token with pk', async function () {
        let to = token.address
        let value = m(0, 18)
        const ERC = await ethers.getContractFactory('MockERC20')
        let data = ERC.interface.encodeFunctionData('approve(address,uint256)', [accounts[1].address, m(1, 18)])

        await safebox.call(to, value, data)
        console.log('withdraw Token done')
        
        await print()
        await printWithdrawLimit()
    })


    it('withdraw USDT with pk', async function () {
        let to = usdt.address
        let value = m(0, 18)
        const ERC = await ethers.getContractFactory('MockERC20')
        let data = ERC.interface.encodeFunctionData('transfer(address,uint256)', [accounts[1].address, m(9, 18)])

        await safebox.call(to, value, data)
        console.log('withdraw USDT done')
        
        await print()
        await printWithdrawLimit()
    })


    it('withdraw USDT with pk', async function () {
        await delay(5)

        let to = usdt.address
        let value = m(0, 18)
        const ERC = await ethers.getContractFactory('MockERC20')
        let data = ERC.interface.encodeFunctionData('transfer(address,uint256)', [accounts[1].address, m(3, 18)])

        await safebox.call(to, value, data)
        console.log('withdraw USDT done')
        
        await print()
        await printWithdrawLimit()
    })


    it('withdraw ETH with pk', async function () {
        let to = accounts[1].address
        let value = m(9, 18)
        let data = []

        await safebox.call(to, value, data)
        console.log('withdraw ETH done')
        
        await print()
        await printWithdrawLimit()
    })


    it('withdraw ETH with pk', async function () {
        await delay(5)
        
        let to = accounts[1].address
        let value = m(2, 18)
        let data = []

        await safebox.call(to, value, data)
        console.log('withdraw ETH done')
        
        await print()
        await printWithdrawLimit()
    })


    it('withdraw ETH with pwd+pk', async function () {
        let to = accounts[1].address
        let value = m(11, 18)
        let data = []

        let pwd = 'abc123'
        let nonce = s(await zkPass.nonceOf(safebox.address))
        let datahash = utils.solidityKeccak256(['address','uint256','bytes'], [to, value, data])
        
        let p = await getProof(pwd, safebox.address, nonce, datahash)

        await safebox.call2(to, value, data, p.proof, p.expiration, p.allhash)
        console.log('withdraw ETH done')

        await print()
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


    async function printWithdrawLimit() {
        console.log('')
        let arr = await safebox.getWithdrawLimit()
        console.log('safebox withdrawLimit: ethFree:', d(arr[0], 18), ' usdFree:', d(arr[1], 18))
        console.log('')
    }


    async function print() {
        console.log('')
        for (let i=0; i<=4; i++) {
            console.log('accounts[' + i + ']', accounts[i].address,
                'usdt:', d(await usdt.balanceOf(accounts[i].address), 18), 
                'eth:', d(await provider.getBalance(accounts[i].address), 18),
			)
		}
        console.log('safeboxAddr', safebox.address,
            'usdt:', d(await usdt.balanceOf(safebox.address), 18),
            'eth:', d(await provider.getBalance(safebox.address), 18)
        )
        console.log('nft#9988 owner:', await nft.ownerOf(b('9988')))
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
})
