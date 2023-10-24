# Devcon Website 🛣️

Devcon.org will be the primary online resource for anything related to Devcon. The annual conference for all Ethereum developers, researchers, thinkers, and makers.

# Archive

Devcon’s impact goes beyond just the physical event, and with that in mind, we’ve completely revamped the Devcon Archive. Changes include an improved UX, better discoverability of content, reduced reliance on YouTube, more decentralized content via IPFS, and community involvement in curation. 

Through all of this, we hope Devcon can continue to be an unparalleled educational resource to learn about the past, present, and future of the ecosystem.

## Speaker profiles

If you are a speaker featured on the Devcon archive and would like to help improve the content description (or wish to edit your speaker biography) please find or add your profile to our [profiles folders](./src/content/profiles). Please include all relevant fields and use any existing profile as an example to submit a PR.

## Pinning 

To help make accessibility to the content more censorship resistant and decentralized, we hope to see a lot more of the Devcon content pinned by the users utilizing the Archive. To ensure that content persists on IPFS, and is not deleted during garbage collection (process to remove stale content), data can be pinned to one or more IPFS nodes. Pinning gives you control over disk space and data retention. Users can use that control to pin any content you wish to help keep on IPFS indefinitely.

## Community curated playlists

Community participants should be provided an equal opportunity to help curate the content on the Devcon Archive. We are encouraging all interested parties to submit curated playlists that provide insight into a core subject area or craft a historical narrative that can be easily discerned by newcomers or individuals looking to dig deeper into a specific topic. 

Here are some examples of curated playlists: [The Emergence of Smart Contract Languages](./src/content/archive/playlists/smart-contract-languages.md), [Execution Layer](./src/content/archive/playlists/execution-layer.md). You can craft your own playlists and submit a PR. If your playlist is chosen, you will be granted a unique POAP as a part of the Road to Devcon Quests.

Please include all relevant fields and use any existing playlist as an example to submit a PR.

# Development
## 🚀 Quick start

- `yarn start` starts the site in development mode.

  Default url at [http://localhost:8000](http://localhost:8000)!

  \_Note: You'll also see a second link: [http://localhost:8000/\_\_\_graphql](http://localhost:8000/___graphql). This is a tool you can use to experiment with querying your data. Learn more about using this tool in the [Gatsby tutorial](https://www.gatsbyjs.com/tutorial/part-five/#introducing-graphiql).\_

- `yarn test` launches the test runner in the interactive watch mode.
- `yarn format` formats the code using prettier.
- `yarn build` builds the app for production to the build folder.

## 🎓 Learning Gatsby

Looking for more guidance? Full documentation for Gatsby lives [on the website](https://www.gatsbyjs.com/). Here are some places to start:

- **For most developers, we recommend starting with our [in-depth tutorial for creating a site with Gatsby](https://www.gatsbyjs.com/tutorial/).** It starts with zero assumptions about your level of ability and walks through every step of the process.

- **To dive straight into code samples, head [to our documentation](https://www.gatsbyjs.com/docs/).** In particular, check out the _Guides_, _API Reference_, and _Advanced Tutorials_ sections in the sidebar.
