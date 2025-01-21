const { BigNumber, utils } = require('ethers')
const { m, d, b, n, s } = require('./help/BigNumberHelp')
const snarkjs = require("snarkjs")
const fs = require("fs")

describe('SafeboxV2-withdraw', function () {
    let accounts
    let provider
    let zkPass
    let factory
    let safebox
    let usdt
    let busd
    let nft
    let wallet
    let bundler
    let bundlerManager

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
        
        const SafeboxV2Factory = await ethers.getContractFactory('SafeboxV2Factory')
        factory = await SafeboxV2Factory.deploy(zkPass.address)
        await factory.deployed()
        console.log('factory deployed:', factory.address)

        const BundlerManager = await ethers.getContractFactory('BundlerManager')
        bundlerManager = await BundlerManager.deploy()
        await bundlerManager.deployed()
        console.log('bundlerManager deployed:', bundlerManager.address)

        const Bundler = await ethers.getContractFactory('Bundler')
        bundler = Bundler.attach(await bundlerManager.bundler())
        console.log('bundler deployed:', bundler.address)

        const SmartWallet = await ethers.getContractFactory('SmartWallet')
        wallet = await SmartWallet.deploy(accounts[0].address, bundler.address)
        await wallet.deployed()
        console.log('wallet deployed:', wallet.address)

        let safeboxAddr = await factory.getSafeboxAddr(wallet.address)
        console.log('safebox predictedAddress', safeboxAddr)
        const SafeboxV2 = await ethers.getContractFactory('SafeboxV2')
        safebox = await SafeboxV2.attach(safeboxAddr)
    })


    it('deposit', async function () {
        await usdt.transfer(safebox.address, m(100, 18))
        console.log('transfer ERC20 done')

        await nft.transferFrom(accounts[0].address, safebox.address, b('9988'))
        console.log('transfer ERC721 done')

        await accounts[0].sendTransaction({to: safebox.address, value: m(2, 18)})
        console.log('transfer ETH done')

        await print()
    })


    it('initPassword & createSafebox', async function () {
        let callArr = []
        let to = '0x'
        let value = 0
        let data = '0x'

        let pwd = 'abc123'
        let nonce = '1'
        let datahash = '0'
        let p = await getProof(pwd, wallet.address, nonce, datahash)

        to = zkPass.address
        value = 0
        const ZKPass = await ethers.getContractFactory('ZKPass')
        data = ZKPass.interface.encodeFunctionData('resetPassword(uint[8],uint,uint,uint[8],uint,uint,uint)', 
                        [p.proof, 0, 0, p.proof, p.pwdhash, p.expiration, p.allhash])
        callArr.push({to, value, data})

        to = factory.address
        value = 0
        const SafeboxV2Factory = await ethers.getContractFactory('SafeboxV2Factory')
        data = SafeboxV2Factory.interface.encodeFunctionData('createSafebox()', [])
        callArr.push({to, value, data})

        let atomSignParmas = await atomSign(accounts[0], wallet.address, callArr)
        console.log('atomSign done')

        //bundler executeOperation
        await executeOperation(wallet.address, atomSignParmas)

        let safeboxAddr = await factory.getSafeboxAddr(wallet.address)
        console.log('getSafeboxAddr:', safeboxAddr)

        await print()
    })


    it('withdrawERC20', async function () {
        let callArr = []
        let to = '0x'
        let value = 0
        let data = '0x'

        let pwd = 'abc123'
        let nonce = s(await zkPass.nonceOf(wallet.address))
        let tokenAddr = usdt.address
        let amount = s(m(40, 18))
        let datahash = utils.solidityKeccak256(['address', 'uint256'], [tokenAddr, amount])
        datahash = s(b(datahash))
        let p = await getProof(pwd, wallet.address, nonce, datahash)

        to = safebox.address
        value = 0
        const SafeboxV2 = await ethers.getContractFactory('SafeboxV2')
        data = SafeboxV2.interface.encodeFunctionData('withdrawERC20(uint[8],address,uint,uint,uint)', 
                            [p.proof, tokenAddr, amount, p.expiration, p.allhash])
        callArr.push({to, value, data})

        let atomSignParmas = await atomSign(accounts[0], wallet.address, callArr)
        console.log('atomSign done')

        //bundler executeOperation
        await executeOperation(wallet.address, atomSignParmas)

        await print()
    })


    it('resetPassword', async function () {
        let callArr = []
        let to = '0x'
        let value = 0
        let data = '0x'

        let oldpwd = 'abc123'
        let nonce = await zkPass.nonceOf(wallet.address)
        let datahash = '0'
        let oldZkp = await getProof(oldpwd, wallet.address, s(nonce), datahash)
   
        let newpwd = '123123'
        let newZkp = await getProof(newpwd, wallet.address, s(nonce.add(1)), datahash)

        to = zkPass.address
        value = 0
        const ZKPass = await ethers.getContractFactory('ZKPass')
        data = ZKPass.interface.encodeFunctionData('resetPassword(uint[8],uint,uint,uint[8],uint,uint,uint)', 
                [oldZkp.proof, oldZkp.expiration, oldZkp.allhash, newZkp.proof, newZkp.pwdhash, newZkp.expiration, newZkp.allhash])
        callArr.push({to, value, data})

        let atomSignParmas = await atomSign(accounts[0], wallet.address, callArr)
        console.log('atomSign done')

        //bundler executeOperation
        await executeOperation(wallet.address, atomSignParmas)
    })


    it('withdrawERC721', async function () {
        let callArr = []
        let to = '0x'
        let value = 0
        let data = '0x'

        let pwd = '123123'
        let nonce = s(await zkPass.nonceOf(wallet.address))
        let tokenAddr = nft.address
        let tokenId = b('9988')
        let datahash = utils.solidityKeccak256(['address','uint256'], [tokenAddr, tokenId])
        datahash = s(b(datahash))
        let p = await getProof(pwd, wallet.address, nonce, datahash)

        to = safebox.address
        value = 0
        const SafeboxV2 = await ethers.getContractFactory('SafeboxV2')
        data = SafeboxV2.interface.encodeFunctionData('withdrawERC721(uint[8],address,uint,uint,uint)', 
                            [p.proof, tokenAddr, tokenId, p.expiration, p.allhash])
        callArr.push({to, value, data})

        let atomSignParmas = await atomSign(accounts[0], wallet.address, callArr)
        console.log('atomSign done')

        //bundler executeOperation
        await executeOperation(wallet.address, atomSignParmas)

        await print()
    })


    it('withdrawETH', async function () {
        let callArr = []
        let to = '0x'
        let value = 0
        let data = '0x'

        let pwd = '123123'
        let nonce = s(await zkPass.nonceOf(wallet.address))
        let amount = s(m(1, 18))
        let datahash = amount
        let p = await getProof(pwd, wallet.address, nonce, datahash)

        to = safebox.address
        value = 0
        const SafeboxV2 = await ethers.getContractFactory('SafeboxV2')
        data = SafeboxV2.interface.encodeFunctionData('withdrawETH(uint[8],uint,uint,uint)', 
                            [p.proof, amount, p.expiration, p.allhash])
        callArr.push({to, value, data})

        let atomSignParmas = await atomSign(accounts[0], wallet.address, callArr)
        console.log('atomSign done')

        //bundler executeOperation
        await executeOperation(wallet.address, atomSignParmas)

        await print()
    })


    async function executeOperation(walletAddr, atomSignParmas) {
        //bundler executeOperation
        const SmartWallet = await ethers.getContractFactory('SmartWallet')
        let a = atomSignParmas
        let calldata = SmartWallet.interface.encodeFunctionData('atomSignCall', [a.atomCallbytes, a.deadline, a.signature])

        await bundler.executeOperation(walletAddr, calldata)
        console.log('bundler.executeOperation done')
    }


    //util
    async function atomSign(signer, fromWallet, callArr) {
        let atomCallbytes = '0x'
        for (let i=0; i<callArr.length; i++) {
            let to = callArr[i].to
            let value = callArr[i].value
            let data = callArr[i].data
            
            let len = utils.arrayify(data).length
            atomCallbytes = utils.hexConcat([atomCallbytes, to, utils.hexZeroPad(value, 32), utils.hexZeroPad(len, 32), data])
        }

        let deadline = parseInt(Date.now() / 1000) + 600;
        let chainId = (await provider.getNetwork()).chainId
        let SmartWallet = await ethers.getContractFactory('SmartWallet')
        let wallet = await SmartWallet.attach(fromWallet)
        let valid = await wallet.valid()

        let calldata = SmartWallet.interface.encodeFunctionData('atomSignCall', [atomCallbytes, deadline, '0x'])
        calldata = utils.hexConcat([calldata, utils.hexZeroPad(chainId, 31), fromWallet, utils.hexZeroPad(valid, 4)])

        let hash = utils.keccak256(calldata)
        let signature = await signer.signMessage(utils.arrayify(hash))

        return { atomCallbytes, deadline, chainId, fromWallet, valid, signature }
    }


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


    async function print() {
        console.log('')
        for (let i=0; i<=4; i++) {
            console.log('accounts[' + i + ']',
                accounts[i].address,
                'usdt:', d(await usdt.balanceOf(accounts[i].address), 18), 
                'eth:', d(await provider.getBalance(accounts[i].address), 18)
			)
		}

        console.log('SmartWalet',
                wallet.address,
                'usdt:', d(await usdt.balanceOf(wallet.address), 18), 
                'eth:', d(await provider.getBalance(wallet.address), 18)
			)

        console.log('Safebox',
                safebox.address,
                'usdt:', d(await usdt.balanceOf(safebox.address), 18), 
                'eth:', d(await provider.getBalance(safebox.address), 18)
			)

        console.log('nft#9988 owner:', await nft.ownerOf(b('9988')))
        console.log('')
    }
})
