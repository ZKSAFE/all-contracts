const hre = require('hardhat')
const fs = require('fs')
const { BigNumber, utils } = require('ethers')



// polygon mainnet 2022-11-8 BETA
// deployer:  0x50D8aD8e7CC0C9c2236Aac2D2c5141C164168da3
// ZKPass deployed: 0x72f3E7DdAe7f5B8859a230FE00f4214d582622fF
// SafeboxFactory deployed: 0xd9403569f3447121eb78d426Bb5eFC7D10316b50

// polygon mainnet 2022-11-20 V1
// deployer:  0xb42466f1c2B0d878ff14E76477f8AF016E5dBe26
// ZKPass deployed: 0xCDc902C17985f5d66A857F67a2BD6f5A29cE225d
// SafeboxFactory deployed: 0x5a93D9a81F1ee8368BaD0EEb0f653bB45bFc6329

// bsc mainnet 2022-11-21 V1
// deployer:  0xb42466f1c2B0d878ff14E76477f8AF016E5dBe26
// ZKPass deployed: 0x930Db107c074E3f66C923180100F74fF4AABEaa5
// SafeboxFactory deployed: 0xA4260E6f2532c29B69ac6015108c11434831eb14


async function main() {
	const accounts = await hre.ethers.getSigners()
	console.log('deployer: ', accounts[0].address)

	const ZKPass = await ethers.getContractFactory('ZKPass')
	const zkPass = await ZKPass.deploy()
	await zkPass.deployed()
	console.log('ZKPass deployed:', zkPass.address)

	const SafeboxFactory = await ethers.getContractFactory('SafeboxFactory')
	const safeboxFactory = await SafeboxFactory.deploy(zkPass.address)
	await safeboxFactory.deployed()
	console.log('SafeboxFactory deployed:', safeboxFactory.address)

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