const hre = require('hardhat')
const fs = require('fs')
const { BigNumber, utils } = require('ethers')



// polygon mainnet 2022-9-27
// EthereumPasswordService deployed: 0x555DE00394cEBb92f49e9DC4399372c81F5360e4
// SafeboxFactory deployed: 0xEF6b7A04BF73f8674b5B7BcDd460778862dd5b90


async function main() {
	const accounts = await hre.ethers.getSigners()
	const feeTo = '0x50D8aD8e7CC0C9c2236Aac2D2c5141C164168da3'

	const EthereumPasswordService = await ethers.getContractFactory('EthereumPasswordService')
	const eps = await EthereumPasswordService.deploy()
	await eps.deployed()
	console.log('EthereumPasswordService deployed:', eps.address)

	const SafeboxFactory = await ethers.getContractFactory('SafeboxFactory')
	const safeboxFactory = await SafeboxFactory.deploy(eps.address)
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