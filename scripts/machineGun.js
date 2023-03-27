const hre = require('hardhat')
const fs = require('fs')
const { BigNumber, utils } = require('ethers')



// scroll_alpha 2023-3-27
// MachineGunWallet deployed: 0x072777f02Ad827079F188D8175FB155b0e75343D
// USDC address: 0x67aE69Fd63b4fc8809ADc224A9b82Be976039509
// SyncSwap address: 0xC458eED598eAb247ffc19d15F19cf06ae729432c


async function deploy() {
	const accounts = await hre.ethers.getSigners()
	console.log('deployer:', accounts[0].address)

	const MachineGunWallet = await ethers.getContractFactory('MachineGunWallet')
	const wallet = await MachineGunWallet.deploy()
	await wallet.deployed()
	console.log('MachineGunWallet deployed:', wallet.address)

	console.log('done')
}


async function machineGunWalletInfo() {
    const accounts = await ethers.getSigners()
    const provider = accounts[0].provider

    const MockERC20 = await ethers.getContractFactory('MockERC20')
    const usdc = await MockERC20.attach('0x67aE69Fd63b4fc8809ADc224A9b82Be976039509')

	const MachineGunWallet = await ethers.getContractFactory('MachineGunWallet')
	const machineGunWallet = await MachineGunWallet.attach('0x072777f02Ad827079F188D8175FB155b0e75343D')


    console.log('owner', await machineGunWallet.owner())
	console.log('usdc:', d(await usdc.balanceOf(machineGunWallet.address), 6), 
                'eth:', d(await provider.getBalance(machineGunWallet.address), 18),
	    )
}


async function batchCall() {
    // calls info
    // let json = {
    //     rpc: {
    //         name: 'scroll_alpha',
	// 		url: 'https://alpha-rpc.scroll.io/l2',
	// 		chainId: 534353,
	// 		account: '0x072777f02Ad827079F188D8175FB155b0e75343D'
	// 	},
    //     calls: [
    //         {
    //             to: '0x67aE69Fd63b4fc8809ADc224A9b82Be976039509',
    //             value: '0',
    //             functionName: 'transfer',
    //             params: [
    //                 {
    //                     type: 'address',
    //                     value: '0xE44081Ee2D0D4cbaCd10b44e769A14Def065eD4D'
    //                 },
    //                 {
    //                     type: 'uint256',
    //                     value: s(m(1, 6))
    //                 }
    //             ]
    //         },
    //         {
    //             to: '0xE44081Ee2D0D4cbaCd10b44e769A14Def065eD4D',
    //             value: s(m(1, 16)),
    //             functionName: '',
    //             params: []
    //         }
    //     ]
    // }
    let json = {
        rpc: {
            name: 'scroll_alpha',
			url: 'https://alpha-rpc.scroll.io/l2',
			chainId: 534353,
			account: '0x072777f02Ad827079F188D8175FB155b0e75343D'
		},
        calls: [
            {
                to: '0x67aE69Fd63b4fc8809ADc224A9b82Be976039509',
                value: '0',
                functionName: 'transfer',
                params: [
                    {
                        type: 'address',
                        value: '0xE44081Ee2D0D4cbaCd10b44e769A14Def065eD4D'
                    },
                    {
                        type: 'uint256',
                        value: s(m(1, 6))
                    }
                ]
            },
            {
                to: '0xE44081Ee2D0D4cbaCd10b44e769A14Def065eD4D',
                value: s(m(1, 16)),
                functionName: '',
                params: []
            }
        ]
    }


	const accounts = await hre.ethers.getSigners()
	console.log('caller: ', accounts[0].address)

	const MachineGunWallet = await ethers.getContractFactory('MachineGunWallet')
	const machineGunWallet = await MachineGunWallet.attach(json.rpc.account)

    let toArr = []
    let valueArr = []
    let dataArr = []
    for (let call of json.calls) {
        call.data = getData(call.functionName, call.params)
        toArr.push(call.to)
        valueArr.push(call.value)
        dataArr.push(call.data)
    }

    await machineGunWallet.batchCall(toArr, valueArr, dataArr)
    console.log('batchCall done')

	console.log('done')
}


function getData(functionName, params) {
    if (functionName == '') return []

    let typeArr = []
    let valueArr = []
    let funcctionType = functionName + '('
    for (let param of params) {
        typeArr.push(param.type)
        valueArr.push(param.value)
        funcctionType += param.type + ','
    }

    if (params.length > 0) {
        funcctionType = funcctionType.substring(0, funcctionType.length - 1)
    }
    funcctionType += ')'

    console.log(funcctionType)

    let codedParam = utils.defaultAbiCoder.encode(typeArr, valueArr)
    let selector = utils.hexDataSlice(utils.keccak256(stringToHex(funcctionType)), 0, 4)
    console.log('selector:', selector)
    let data = utils.hexConcat([selector, codedParam])
    return data
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

machineGunWalletInfo()
	.then(() => process.exit(0))
	.catch(error => {
		console.error(error);
		process.exit(1);
	});