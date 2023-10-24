---
edition: 5
title: "Catching exceptions in Solidity"
description: "When a revert happens in solidity, all the state changes done in that transaction are rolled back. All the changes done in sub calls are also rolled back. If a contract A tries to do a token transfer in contract B but contract B reverts, all the changes done by contract A will also be rolled back. This is fine for some cases but sometimes there might be a need to ignore or handle this revert in the smart contract itself.
The talk will demonstrate how reverts and other exceptions can be caught in Solidity."
youtubeUrl: "https://www.youtube.com/embed/z7NruBa2yFc"
ipfsHash: "QmVGHQEefFH2fSseHHap6ayckceBWunECzGfqieGCfiiGA"
ethernaIndex: "https://etherna.io/embed/6344b0af080a54f6d733ea7f"
ethernaPermalink: "https://etherna.io/embed/5bf6e64bc609753f0651cfe965e793f62a43c7e06099cf9068caac6e9cf3f1a9"
duration: 208
expertise: "Intermediate"
type: "Talk"
track: "Developer Infrastructure"
keywords: ['technical']
tags: ['Developer Infrastructure']
speakers: ['Mudit Gupta']
---
