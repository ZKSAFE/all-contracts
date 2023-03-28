const hre = require('hardhat')
const fs = require('fs')
const { BigNumber, utils } = require('ethers')



// scroll_alpha 2023-3-27
const MachineGunWallet_ADDRESS = '0x072777f02Ad827079F188D8175FB155b0e75343D'
const WETH_ADDRESS = '0x7160570BB153Edd0Ea1775EC2b2Ac9b65F1aB61B'
const USDC_ADDRESS = '0x67aE69Fd63b4fc8809ADc224A9b82Be976039509'
const POOL_ADDRESS = '0x8B4fa55f84a83Ff6E73Dc9803518006b3c5e785d' // SyncSwap USDC/WETH Classic LP
const ROUTER_ADDRESS = '0xC458eED598eAb247ffc19d15F19cf06ae729432c'
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'


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
    const usdc = await MockERC20.attach(USDC_ADDRESS)

	const MachineGunWallet = await ethers.getContractFactory('MachineGunWallet')
	const machineGunWallet = await MachineGunWallet.attach('0x072777f02Ad827079F188D8175FB155b0e75343D')


    console.log('owner', await machineGunWallet.owner())
	console.log('usdc:', await usdc.balanceOf(machineGunWallet.address), 
                'eth:', await provider.getBalance(machineGunWallet.address)
	    )
}


async function batchCall() {
    const accounts = await ethers.getSigners()
    const provider = accounts[0].provider
	console.log('caller: ', accounts[0].address)

    // calls info
    let json = {
        rpc: {
            name: 'Scroll_Alpha',
			url: 'https://alpha-rpc.scroll.io/l2',
			chainId: 534353
		},
        calls: [
            {
                to: '0x67aE69Fd63b4fc8809ADc224A9b82Be976039509',
                value: '0',
                function: 'function transfer(address to, uint256 amount)',
                param: [
                    '0xE44081Ee2D0D4cbaCd10b44e769A14Def065eD4D',
                    s(m(1, 6))
                ]
            },
            {
                to: '0xE44081Ee2D0D4cbaCd10b44e769A14Def065eD4D',
                value: s(m(1, 16)),
                function: '',
                param: []
            }
        ]
    }

    // let swapData = utils.defaultAbiCoder.encode(
    //     ['address', 'address', 'uint8'],
    //     [USDC_ADDRESS, MachineGunWallet_ADDRESS, 1] // tokenIn, to, withdraw mode
    // )

    // let json = {
    //     rpc: {
    //         name: 'Scroll_Alpha',
	// 		url: 'https://alpha-rpc.scroll.io/l2',
	// 		chainId: 534353
	// 	},
    //     calls: [
    //         {
    //             to: USDC_ADDRESS,
    //             value: '0',
    //             function: 'function approve(address spender, uint256 amount)',
    //             param: [
    //                 ROUTER_ADDRESS, 
    //                 s(m(1, 6))
    //             ]
    //         },
    //         {
    //             to: ROUTER_ADDRESS,
    //             value: '0',
    //             function: 'function swap(tuple(tuple(address pool, bytes data, address callback, bytes callbackData)[] steps, address tokenIn, uint256 amountIn)[] paths, uint amountOutMin, uint deadline) returns (uint amountOut)',
    //             param: [
    //                 [{
    //                     steps: [{
    //                         pool: POOL_ADDRESS,
    //                         data: swapData,
    //                         callback: ZERO_ADDRESS,
    //                         callbackData: '0x',
    //                     }],
    //                     tokenIn: USDC_ADDRESS,
    //                     amountIn: s(m(1, 6)),
    //                 }],    
    //                 0,
    //                 b(Math.floor(Date.now() / 1000)).add(1800)
    //             ]
    //         }
    //     ]
    // }


	const MachineGunWallet = await ethers.getContractFactory('MachineGunWallet')
	const machineGunWallet = await MachineGunWallet.attach(MachineGunWallet_ADDRESS)

    let toArr = []
    let valueArr = []
    let dataArr = []
    for (let call of json.calls) {
        toArr.push(call.to)
        valueArr.push(call.value)

        if (call.function != '') {
            let interface = new utils.Interface([call.function])
            let funcName = call.function.slice(9, call.function.indexOf('('))
            let data = interface.encodeFunctionData(funcName, call.param)
            dataArr.push(data)
        } else {
            dataArr.push('0x')
        }
    }

    await machineGunWallet.batchCall(toArr, valueArr, dataArr)
    console.log('batchCall done')
    
	console.log('done')
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

batchCall()
	.then(() => process.exit(0))
	.catch(error => {
		console.error(error);
		process.exit(1);
	});