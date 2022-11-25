const { BigNumber, utils } = require('ethers')
const snarkjs = require("snarkjs")
const fs = require("fs")

describe('crack-estimate', function () {

    //Filcoin Poseidon: RTX3070:47.17Mhash/s, Ryzen5900X:7.41Mhash/s  [https://xilinx.eetrend.com/content/2022/100563236.html]
    //ETH SHA3: RTX3090:120Mhash/s, Mac M1:1Mhash/s  [https://new.qq.com/rain/a/20210429A0BVTS00] [https://zhuanlan.zhihu.com/p/433295256]
    //Ours: Mac M1 1thread:0.1Mhash/s
    //Our estimate: Poseidon: RTX3090:100Mhash/s

    const HashRate = 100000000

    before(async function () {
    })

    it('6 chars', async function () {
        //6 number
        let sec = b(10).pow(6).div(HashRate)
        console.log(s(sec) + 'sec', s(sec.div(86400)) + 'day', s(sec.div(86400).div(365)) + 'year')

        //6 number+english
        sec = b(10+26+26).pow(6).div(HashRate)
        console.log(s(sec) + 'sec', s(sec.div(86400)) + 'day', s(sec.div(86400).div(365)) + 'year')

        //6 number+english+symbol
        sec = b(10+26+26+30).pow(6).div(HashRate)
        console.log(s(sec) + 'sec', s(sec.div(86400)) + 'day', s(sec.div(86400).div(365)) + 'year')
    })

    it('8 chars', async function () {
        //8 number
        let sec = b(10).pow(8).div(HashRate)
        console.log(s(sec) + 'sec', s(sec.div(86400)) + 'day', s(sec.div(86400).div(365)) + 'year')

        //8 number+english
        sec = b(10+26+26).pow(8).div(HashRate)
        console.log(s(sec) + 'sec', s(sec.div(86400)) + 'day', s(sec.div(86400).div(365)) + 'year')

        //8 number+english+symbol
        sec = b(10+26+26+30).pow(8).div(HashRate)
        console.log(s(sec) + 'sec', s(sec.div(86400)) + 'day', s(sec.div(86400).div(365)) + 'year')
    })

    it('10 chars', async function () {
        //10 number
        let sec = b(10).pow(10).div(HashRate)
        console.log(s(sec) + 'sec', s(sec.div(86400)) + 'day', s(sec.div(86400).div(365)) + 'year')

        //10 number+english
        sec = b(10+26+26).pow(10).div(HashRate)
        console.log(s(sec) + 'sec', s(sec.div(86400)) + 'day', s(sec.div(86400).div(365)) + 'year')

        //10 number+english+symbol
        sec = b(10+26+26+30).pow(10).div(HashRate)
        console.log(s(sec) + 'sec', s(sec.div(86400)) + 'day', s(sec.div(86400).div(365)) + 'year')
    })

    it('12 chars', async function () {
        //12 number
        let sec = b(10).pow(12).div(HashRate)
        console.log(s(sec) + 'sec', s(sec.div(86400)) + 'day', s(sec.div(86400).div(365)) + 'year')

        //12 number+english
        sec = b(10+26+26).pow(12).div(HashRate)
        console.log(s(sec) + 'sec', s(sec.div(86400)) + 'day', s(sec.div(86400).div(365)) + 'year')

        //12 number+english+symbol
        sec = b(10+26+26+30).pow(12).div(HashRate)
        console.log(s(sec) + 'sec', s(sec.div(86400)) + 'day', s(sec.div(86400).div(365)) + 'year')
    })

    it('password vs privatekey', async function () {
        let sec = b(92).pow(40).div(HashRate)
        console.log(s(sec) + 'sec', s(sec.div(86400)) + 'day', s(sec.div(86400).div(365)) + 'year')

        sec = b(2).pow(256).div(HashRate)
        console.log(s(sec) + 'sec', s(sec.div(86400)) + 'day', s(sec.div(86400).div(365)) + 'year')
    })



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
