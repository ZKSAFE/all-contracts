const hre = require('hardhat')
const fs = require('fs')
const { BigNumber, utils } = require('ethers')



// scroll_alpha 2023-3-26
// ZKPass deployed: 0x6009234967B1c7872de00BB3f3e77610b8D6dc9e
// SafeboxV2Factory deployed: 0xa877a2247b318b40935E102926Ba5ff4F3b0E8b1
// MockZKID deployed: 0xeE4D10619E64049102752f5646352943771a3203
// USDC address: 0x67aE69Fd63b4fc8809ADc224A9b82Be976039509


async function main() {
	const accounts = await hre.ethers.getSigners()
	console.log('deployer: ', accounts[0].address)

	// const ZKPass = await ethers.getContractFactory('ZKPass')
	// const zkPass = await ZKPass.deploy()
	// await zkPass.deployed()
	// console.log('ZKPass deployed:', zkPass.address)

	// const SafeboxFactory = await ethers.getContractFactory('SafeboxV2Factory')
	// const safeboxFactory = await SafeboxFactory.deploy(['0x6009234967B1c7872de00BB3f3e77610b8D6dc9e', '0x67aE69Fd63b4fc8809ADc224A9b82Be976039509'])
	// await safeboxFactory.deployed()
	// console.log('SafeboxV2Factory deployed:', safeboxFactory.address)

	
	const MockZKID = await ethers.getContractFactory('MockZKID')
	const zkID = await MockZKID.deploy()
	await zkID.deployed()
	console.log('MockZKID deployed:', zkID.address)

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