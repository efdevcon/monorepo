---
edition: 6
sourceId: "DKHHHJ"
title: "The Right Way to Hash a Merkle Tree"
description: "We shill an assembly SHA256 library that is optimized to compute the hash tree root of a Merkle tree. It consists of reusing two publicly available methods: 1. Hardcoding padding block. This method is used in Bitcoin's core client hashing algo.  2. Use CPU-vectorization to hash different branches in parallell. This is Intel's \"multi-buffer\" method. 
Initial benchmarks show up to 1200% improvement on hashing of large lists on AVX512. 
A GoAssembly version is used by prysm."
youtubeUrl: "https://youtu.be/NfK4np15E64"
ipfsHash: ""
ethernaIndex: "https://etherna.io/embed/634a617ac02259b06a2ffd29"
ethernaPermalink: "https://etherna.io/embed/e7a4f15561bbdcdb2c0071b4554ac895f0e88df53e3775bf08f08b44ff8e2a26"
duration: 1426
expertise: "Advanced"
type: "Talk"
track: "Developer Infrastructure"
tags: ["Developer Infrastructure"]
keywords: ["Assembly","sha256","vectorization"]
speakers: ["Potuz"]
slidesUrl: "/resources/6/the-right-way-to-hash-a-merkle-tree.pdf"
---
