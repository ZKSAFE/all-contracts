const hre = require('hardhat')
const fs = require('fs')
const { BigNumber, utils } = require('ethers')



// polygon mainnet 2022-11-8
// deployer:  0x50D8aD8e7CC0C9c2236Aac2D2c5141C164168da3
// ZKPass deployed: 0x72f3E7DdAe7f5B8859a230FE00f4214d582622fF
// SafeboxFactory deployed: 0xd9403569f3447121eb78d426Bb5eFC7D10316b50


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