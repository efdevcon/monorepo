---
edition: 5
title: "Demystifying libp2p gossipsub: a scalable and extensible p2p gossip protocol"
description: "ETH2.0 is evaluating libp2p gossipsub as a decentralized, peer-to-peer publish/subscribe mechanism for validators, proposers and attesters to quickly disseminate data throughout the entire network.
This talk covers the technical design, tradeoffs and functionality of gossipsub, aiming to deliver foundational knowledge to everyone interested in learning more about this potential building block of the ETH2.0 network.
Gossipsub was incubated in the libp2p project as a replacement for the naïve floodsub pubsub router (which simply broadcasts messages to all peers we know are interested in a topic). It maintains stable reciprocal meshes via explicit link grafting, while preserving random gossip to disseminate metadata, and to provide cues to aid message deliverability. It also features a piggybacking algorithm to minimise the overhead of control messages; allows developers to attach custom per-topic validator functions; and more.
Come to learn more about how gossipsub works, and to hear about the state of the art of p2p pubsub protocols!"
youtubeUrl: "https://www.youtube.com/embed/b8AZBVdrCC0"
ipfsHash: "QmW573KHSccTou96QAtPwJSEhfVgC1hzkPog8jnFLcTuD9"
ethernaIndex: "https://etherna.io/embed/6344cfb4080a54f6d733eaa1"
ethernaPermalink: "https://etherna.io/embed/b9fefca926d54e09c5d813678476421bec152f6008a69a2b443e6bd6f55630bd"
duration: 1527
expertise: "intermediate"
type: "Breakout"
track: "Staking & Validator Experience"
keywords: ['technical']
tags: ['Staking & Validator Experience']
speakers: ['Raúl Kripalani']
---
