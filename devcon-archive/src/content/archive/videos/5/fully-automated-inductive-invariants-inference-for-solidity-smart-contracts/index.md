---
edition: 5
title: "Fully automated inductive invariants inference for Solidity smart contracts"
description: "One of the hardest challenges in formal verification is handling loops in a fully automated way. A common approach is to compute inductive loop invariants, properties that formally capture the essence of the loop independent of the rest of the program. These sound loop summaries are then used to check further desired properties from a specification. In the context of Solidity smart contracts, properties over state variables can also be seen as loop invariants where one loop iteration is one transaction.
We developed a technique using systems of Horn clauses to infer state and loop inductive invariants at compile-time in a fully automated way, while proving safety properties. The algorithms are released as part of the SMTChecker module inside the Solidity compiler. Thus, the process is seamless to the developer and requires nothing more than the source code. The generated inductive invariants can be used by the compiler and other tools to check properties more easily, to confirm/correct external specifications, and to provide potentially hidden program logic insights to the developer.
The goal of the talk is to present the technicalities and use cases of our approach, and to continue discussions around formal verification and inductive invariants."
youtubeUrl: "https://www.youtube.com/embed/q40OrUZoG40"
ipfsHash: "QmeeyHQ33Z6kBdnNtuECfxE196szFZPtAEKaDpP8y2sEQH"
ethernaIndex: "https://etherna.io/embed/6344fff8080a54f6d733eac9"
ethernaPermalink: "https://etherna.io/embed/3d8187ba9c5ecc5116c3d4ae0f556a444bd31544cd2b6e89728ea77419f2325f"
duration: 1481
expertise: "Advanced"
type: "Breakout"
track: "Security"
keywords: ['technical']
tags: ['Security']
speakers: ['Leo Alt','Matteo Marescotti']
---
