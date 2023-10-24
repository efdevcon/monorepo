---
edition: 4
title: "Efficient and cryptoeconomically driven DKG as a smart contract"
description: "In the absence of a trusted party, Distributed Key Generation (DKG) protocols are essential for the initial setup of any type of threshold cryptosystem. The protocol results with each of the participants holding a valid key share. We use Ethereum as a decentralized trusted platform to run a DKG protocol for BLS signatures. We use precompiled contracts that were initially designed for fast (within the block gas limit) zkSNARKs verification to overcome the computational complexity of the protocol. We rely on a previously proven DKG protocol, but our version is specifically designed to be implemented as a smart contract over Ethereum. We prove the security of our DKG protocol in the random oracle model and other common cryptographic assumptions. To conclude the system, we give an efficient smart contract for signature verification. Our smart contract consumes reasonable gas and scales nicely (in terms of the number of participants). Only a dispute between two of the participants will invoke elliptic curve arithmetics or paring computations. Ethereum is used for three reasons: As a medium for (synchronous) communication, as a mediating authority in case of conflicts, and as a cryptoeconomic incentivization layer over the plain DKG protocol."
youtubeUrl: "https://youtu.be/OOk7fsoDoLk"
ipfsHash: "QmeyoWzim2uoqbKsQfma6yxmHR3FZBkpUTUvASFg3YSWZj"
ethernaIndex: "https://etherna.io/embed/6345e104080a54f6d733eb9b"
ethernaPermalink: "https://etherna.io/embed/719d1b2ef0c7c54ba5b34481b0d8387cb4200b5423621a4a087efd955905afa2"
duration: 439
expertise: "Intermediate"
type: "Talk"
track: "Security"
keywords: ['gas','gwei','scaling','incentives']
tags: ['Security']
speakers: ['David Yakira','Ido Grayevsky','Avi Asayag','Ido Zilberberg']
---
