---
edition: 5
title: "Yul, eWasm, Solidity: Progress and Future Plans"
description: "Over the last months, the Yul language has matured and proved its flexibility. The Solidity team has implemented an optimizer and an eWasm dialect and is now full steam working on rewriting the Solidity code generator to produce Yul code to replace sequences of EVM instructions.The Yul optimizer now matches the old EVM optimizer and already surpasses it with features like function inlining and cross-function optimization. This is also the main reason why the new code generator can be written in a super-modular way. Furthermore, it can equally operate on EVM- and eWasm-flavoured Yul code, which is important to cope with the 256- to 64-bit translation.Through this, the Solidity compiler can now output eWasm code, which makes efficient use of 64 bit types. Furthermore, the new code generator includes automated overflow checks everywhere, again something that would have destroyed the old optimizer.
Future work:We plan to use a more intricate formal system to remove redundant operations and checks based on range-relations between variables.
The introduction of memory area types will help optimizing memory allocation.
Finally, a super-optimizer could prove useful, since it is worth spending extra time on compilation to save gas."
youtubeUrl: "https://www.youtube.com/embed/xThLb7I-bhg"
ipfsHash: "QmS7Jmcp5bibia7UC31TPdEtbVGxjgTaWQBcbxbk6RCmir"
ethernaIndex: "https://etherna.io/embed/6345bf2ac02259b06a2ffac4"
ethernaPermalink: "https://etherna.io/embed/4530eb8d274086fc51466308720c7b9d6e42bbb8ae727c55ebc64185997faa1e"
duration: 1171
expertise: "Advanced"
type: "Breakout"
track: "Layer 1 Protocol"
keywords: ['technical']
tags: ['Layer 1 Protocol']
speakers: ['Christian Reitwiessner']
---
