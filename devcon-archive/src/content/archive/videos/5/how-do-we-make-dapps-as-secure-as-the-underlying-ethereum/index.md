---
edition: 5
title: "How do we make dapps as secure as the underlying Ethereum?"
description: "Web3.js is a Javascript API for web applications (dapps) to access Ethereum blockchain. However, its security assumption inherited the security assumption of an Ethereum node, which is entirely open to the node's owner. The privacy and security consequences of that assumption are two-fold.
First, a web application can learn sensitive information about the user.
Second, the web application can feign a representation of blockchain data to be another or even tricking users to signing obfuscate transactions. A website which simply draws a crypto kitty would look no different than another which reads the user’s kitty from Ethereum smart contracts.
Much makeshift work has been down for this underdesigned infrastructure. For example, MetaMask resorted to hardcoding CryptoKitty and requesting permission to read the user's address. However, only so much patches could do. Furthermore, such patches weren’t designed with abstraction to accommodate next-generation blockchains with privacy and efficiency improvements. For example, failing to find truth quickly using the low-level interfaces provided by web3.js, many dapp browsers resorted to relying on a centralised token status database.
The speaker presents a design which abstracts token interface away from low-level Eth-node interface, remodels the basic web code trust inheritance for practicality and security. It involves high-level API for web applications and a secure, WebAssembly based sandbox running signed code designed to embed in the Web itself."
youtubeUrl: "https://www.youtube.com/embed/caBSufgaj4Q"
ipfsHash: "QmWTPm4om3narsoEw8hi97SAvzTm8QrJJv2Rvu7tcLCt13"
ethernaIndex: "https://etherna.io/embed/63451710c02259b06a2ffa22"
ethernaPermalink: "https://etherna.io/embed/64f6bc8da032dc95d0ab5adf6c030443a195bda651b46fc07e086d4bc3bf5a6f"
duration: 1222
expertise: "intermediate"
type: "Breakout"
track: "Security"
keywords: ['technical']
tags: ['Security']
speakers: ['Weiwu Zhang']
---
