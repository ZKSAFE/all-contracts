<div align="center"><img src="./images/zkSafe-logo.svg"></div>
<br>
<br>


## Ethereum Password Service
#### EPS contract binding password hash to wallet address.
<br>
<div align="center"><img src="./images/eps.png"></div>
<br>

### How it works
<p>User input password to EPS ZK Circuit (running at frontend), it output hash + proof, it proving that the hash is generate from the password, EPS contract can verify it, if the hash equals the one binging in EPS contract, that means the user input the right password.</p>

<p>Advanced, used proofs is recorded in EPS contract, to avoid Double Spent.<br>
And, datahash\expiration\chainId are added to ZK Circuit, make (ZK) Password to sign data as PrivateKey.</p>
<br>
<br>


## FAQ
<ul>
<li>Where is the password store?
<p>In your mind. EPS store password hash.</p>
</li>
</ul>
<br>
<br>