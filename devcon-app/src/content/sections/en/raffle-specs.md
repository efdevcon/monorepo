---
title: Specs
pages:
  - raffle-auction
---
### Security

* The smart contracts for the Auction & Raffle can be viewed [here](https://github.com/TrueFiEng/devcon-raffle).
* The contracts were audited by Trail of Bits, and the Audit Report can be viewed [here](https://drive.google.com/file/d/1I3A0Kf-CrPdFRjZaZ8lOvbfN49moyki2/view?usp=sharing).
* The contract has been verified on Sourcify, [available here](https://repo.sourcify.dev/contracts/full_match/42161/0xF53d383525117d1f51BF234966E39bD1508a5948/).

### Randomness

The contract uses a series of random numbers to draw the raffle winners. As there is no secure random number generator on Arbitrum, those numbers will be provided to the contract in a transaction after the bidding window closes. Hashes of 10 future Ethereum mainnet blocks will be used as a source of randomness, with each of them drawing 8 raffle winners, thus 80 in total. To prevent miners tampering with the blocks in order to set the contest to their advantage, we’ll salt the hashes using a secret number **S**. This means that for the random numbers we’ll use the hashes of block hashes and the number **S**:

**random_number_1 = keccak256(block_hash_1, S)**

**random_number_2 = keccak256(block_hash_2, S)**

…

For transparency reasons, we commit to use a secret value **S** which hash equals to:
**keccak256(S) = 28902c742fcf74d7f6edce7c692e2be7e8c4befb8ec14a86e0422b24f714b01c**

The secret value **S** that we used was: *0x64323832333433643661653738623538303461623966386366356436343434343637343237653564363365353334386430376264373338343561313837623131.*

The following Ethereum mainnet blocks were used as a source of randomness:

*15138000
15138001
15138002
15138003
15138004
15138005
15138006
15138007
15138008
15138009*

Please read the Auction & Raffle Terms & Conditions prior to participating [here](https://docs.google.com/document/d/1pVU-G8mpPD33EwOwE96MTB_4AZrYa2TNWXLSfkOPCJQ/edit?usp=sharing).