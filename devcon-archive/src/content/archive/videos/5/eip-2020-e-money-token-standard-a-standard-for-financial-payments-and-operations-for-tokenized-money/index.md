---
edition: 5
title: "EIP 2020, E-money Token Standard: A standard for financial payments and operations for tokenized money"
description: "The EM Token builds on Ethereum standards currently in use such as ERC20, but it extends them to provide few key additional pieces of functionality, needed in the regulated financial world: 
Compliance: EM Tokens implement a set of methods to check in advance whether user-initiated transactions can be done from a compliance point of view. Implementations must `require` that these methods return a positive answer before executing the transaction Clearing: In addition to the standard ERC20 `transfer` method, EM Token provides a way to submit transfers that need to be cleared by the token issuing authority offchain. These transfers are then executed in two steps:     1. transfers are ordered    1. after clearing them, transfers are executed or rejected by the operator of the token contract
Holds: token balances can be put on hold, which will make the held amount unavailable for further use until the hold is resolved (i.e. either executed or released). 
Funding requests: users can request for a wallet to be funded by calling the smart contract and attaching a debit instruction string. 
Payouts: users can request payouts by calling the smart contract and attaching a payment instruction string. https://emoneytokenstandard.org/"
youtubeUrl: "https://www.youtube.com/embed/aqy1u3hRtsY"
ipfsHash: "QmdJEPb2YWq9sKgKcTYEtchyEmfxHpxciR2mPmeDoVEqVw"
ethernaIndex: "https://etherna.io/embed/6344d5a5c02259b06a2ff9f2"
ethernaPermalink: "https://etherna.io/embed/b696ad10f92e8ff9c6562670f4c80a2d7813d1503f481e7a4415e2862d58eff5"
duration: 364
expertise: "Intermediate"
type: "Breakout"
track: "Developer Infrastructure"
keywords: ['technical']
tags: ['Developer Infrastructure']
speakers: ['Daniel Lehrner','Fernando Paris']
---
