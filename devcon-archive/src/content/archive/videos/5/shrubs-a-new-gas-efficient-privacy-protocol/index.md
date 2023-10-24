---
edition: 5
title: "Shrubs - A New Gas Efficient Privacy Protocol"
description: "ERC20 tokens that offer high levels of privacy to their users have been a longtime goal in the Ethereum ecosystem. To implement a privacy protocol that offers very strong privacy guarantees such as those of Zcash, it's necessary to maintain a large Merkle tree of commitments. Unfortunately, doing so in a smart contract can be expensive. For example, to support the same number of total transactions as Zerocash (2^64), one would require a tree depth of 64, and thus 64 storage updates per transaction, which is prohibitively expensive gas-wise. 
In this work, we introduce a new Merkle tree variant, which is defined not by the root, but by the path to the rightmost non-empty leaf node (or frontier), in a tree filled from left to right. This allows commitments to be inserted with O(1) amortized updates, at the expense of a slightly more complicated zk-SNARK proof, used to prove that the commitment is in the tree. 
We use this new data structure to create ShrubsToken, a new gas efficient privacy token, with Zcash-like privacy. Based on our experiments, we estimate that Shrubs will use around 500,000 gas per transaction, after the next Ethereum hard fork."
youtubeUrl: "https://www.youtube.com/embed/_tqwCBrw1Xc"
ipfsHash: "QmS9PgsiNqUY7bbeYMPxmCAJq4zWy8vpyLqhqeL5Vz3ybr"
ethernaIndex: "https://etherna.io/embed/63457326080a54f6d733eb35"
ethernaPermalink: "https://etherna.io/embed/ff7c82affa56de482ca12b8d9566c3d7f7261ad3711be2b6ce7c1c0b14892fd3"
duration: 1464
expertise: "advanced"
type: "Breakout"
track: "Privacy"
keywords: ['technical']
tags: ['Privacy']
speakers: ['Alex Gluchowski','Kobi Gurkan','Marek Olszewski','Eran Tromer','Alexander Vlasov']
---
