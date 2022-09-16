<div align="center"><img src="./images/zkSafe-logo.svg"></div>
<br>
<br>


## Ethereum Password Service
#### EPS contract binding password hash to wallet address.
<br>
<div align="center"><img src="./images/eps-1.png"></div>
<br>

### How it works
<p>User input password to EPS ZK Circuit (running at frontend), it output hash + proof, it proving that the hash is generate from the password, EPS contract can verify it, if the hash equals the one in EPS contract, that means the user input the right password.</p>
<br>
<br>
<br>
<div align="center"><img src="./images/eps-2.png"></div>
<br>
<p>ZK circuit hides inputs, include password, the output is verified in EPS contract. when pwdhash equals the one in EPS contract, it proves that all output values are signed with password.</p>
<p>The pwdhash is generate from password and wallet address, make sure that everyone's pwdhash is different.<br>
The all hash make (ZK) Password to sign data as PrivateKey.<br>
The nonce, proof can't be reused again, to avoid Double Spent.<br>
</p>
<br>
<br>



## FAQ
<ul>
<li>Where is the password store?
<p>In your mind. EPS just stores password hash.</p>
</li>
<li>When the proof is verified, can it be reuse again?
<p>No, the next nonce will be +1, so the used proof is invalid.</p>
</li>
<li>Can the password be cracked?
<p>6 chars password need 70 years to crack, or 70 top computers in 1 year.<br>
8 chars, hundreds years.</p>
</li>
<li>Can the password verify off chain?
<p>Of course, it dons't cost gas off chain. <br>
But on chain verify, it costs a little bit gas.</p>
</li>
<li>If I forget my password, can it be recover?
<p>No. but you can retry many times.</p>
</li>
</ul>
<br>
<br>