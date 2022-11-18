const { BigNumber, utils } = require('ethers')
const snarkjs = require("snarkjs")
const fs = require("fs")

describe('Safebox-withdraw', function () {
    let accounts
    let provider
    let zkPass
    let safeboxFactory
    let safebox
    let usdt
    let busd
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


        busd = await MockERC20.deploy('MockBUSD', 'BUSD')
        await busd.deployed()
        console.log('busd deployed:', busd.address)
		await busd.mint(accounts[0].address, m(1000, 18))
        console.log('busd mint to accounts[0]', d(await busd.balanceOf(accounts[0].address), 18))
		await busd.mint(accounts[1].address, m(1000, 18))
        console.log('busd mint to accounts[1]', d(await busd.balanceOf(accounts[1].address), 18))


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
        
        
        const SafeboxFactory = await ethers.getContractFactory('SafeboxFactory')
        safeboxFactory = await SafeboxFactory.deploy(zkPass.address)
        await safeboxFactory.deployed()
        console.log('safeboxFactory deployed:', safeboxFactory.address)
        

        let safeboxAddr = await safeboxFactory.getSafeboxAddr(accounts[0].address)
        console.log('safebox predictedAddress', safeboxAddr)
        const Safebox = await ethers.getContractFactory('Safebox')
        safebox = await Safebox.attach(safeboxAddr)
    })


    it('deposit', async function () {
        await usdt.transfer(safebox.address, m(100, 18))
        console.log('transfer ERC20 done')

        await nft.transferFrom(accounts[0].address, safebox.address, b('9988'))
        console.log('transfer ERC721 done')

        let gasLimit = await accounts[0].estimateGas({to: safebox.address, value: m(2, 18)})
        console.log('deposit ETH gasLimit', gasLimit)

        await accounts[0].sendTransaction({to: safebox.address, value: m(2, 18)})
        console.log('transfer ETH done')

        await print()
    })


    it('initPassword', async function () {
        let pwd = 'abc123'
        let nonce = '1'
        let datahash = '0'
        let p = await getProof(pwd, accounts[0].address, nonce, datahash)

        await zkPass.resetPassword(p.proof, 0, 0, p.proof, p.pwdhash, p.expiration, p.allhash)
        console.log('initPassword done')

        await print()
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


    it('withdrawERC20', async function () {
        let pwd = 'abc123'
        let nonce = s(await zkPass.nonceOf(accounts[0].address))
        let tokenAddr = usdt.address
        let amount = s(m(40, 18))
        let datahash = utils.solidityKeccak256(['address', 'uint256'], [tokenAddr, amount])
        datahash = s(b(datahash))
        let p = await getProof(pwd, accounts[0].address, nonce, datahash)

        await safebox.withdrawERC20(p.proof, tokenAddr, amount, p.expiration, p.allhash)
        console.log('withdrawERC20 done')

        await print()
    })


    it('withdrawETH', async function () {
        let pwd = 'abc123'
        let nonce = s(await zkPass.nonceOf(accounts[0].address))
        let amount = s(m(1, 18))
        let datahash = amount
        let p = await getProof(pwd, accounts[0].address, nonce, datahash)

        await safebox.withdrawETH(p.proof, amount, p.expiration, p.allhash)
        console.log('withdrawETH done')

        await print()
    })


    it('resetPassword', async function () {
        let oldpwd = 'abc123'
        let nonce = await zkPass.nonceOf(accounts[0].address)
        let datahash = '0'
        let oldZkp = await getProof(oldpwd, accounts[0].address, s(nonce), datahash)
   
        let newpwd = '123123'
        let newZkp = await getProof(newpwd, accounts[0].address, s(nonce.add(1)), datahash)

        await zkPass.resetPassword(oldZkp.proof, oldZkp.expiration, oldZkp.allhash, newZkp.proof, newZkp.pwdhash, newZkp.expiration, newZkp.allhash)
        console.log('resetPassword done')

        await print()
    })


    it('withdrawERC721', async function () {
        let pwd = '123123'
        let nonce = s(await zkPass.nonceOf(accounts[0].address))
        let tokenAddr = nft.address
        let tokenId = b('9988')
        let datahash = utils.solidityKeccak256(['address','uint256'], [tokenAddr, tokenId]);
        datahash = s(b(datahash))

        let p = await getProof(pwd, accounts[0].address, nonce, datahash)

        await safebox.withdrawERC721(p.proof, tokenAddr, tokenId, p.expiration, p.allhash)
        console.log('withdrawERC721 done')

        await print()
    })


    it('transferOwnership', async function () {
        let pwd = '123123'
        let nonce = s(await zkPass.nonceOf(accounts[0].address))
        let newOwner = accounts[2].address
        let datahash = s(b(newOwner))
        let p = await getProof(pwd, accounts[0].address, nonce, datahash)

        await safebox.transferOwnership(p.proof, newOwner, p.expiration, p.allhash)
        console.log('transferOwnership done')

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


    async function print() {
        console.log('')
        for (let i=0; i<=4; i++) {
            let safeboxAddr = await safeboxFactory.getSafeboxAddr(accounts[i].address)
            console.log('accounts[' + i + ']',
                'safeboxAddr', safeboxAddr,
                'usdt:', d(await usdt.balanceOf(accounts[i].address), 18), 
                'eth:', d(await provider.getBalance(accounts[i].address), 18),
                'safebox usdt:', d(await usdt.balanceOf(safeboxAddr), 18),
                'safebox eth:', d(await provider.getBalance(safeboxAddr), 18)
			)
		}
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
