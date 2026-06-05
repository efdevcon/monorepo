import fs from 'fs'

// Keep active, community-backed Giveth projects: Verified + GIVbacks-eligible,
// with at least MIN_DONORS unique donors and a project update since SINCE_DATE.
// All signals come from the bulk allProjects query, so no per-project calls.
const SINCE_DATE = '2024-11-01T00:00:00Z'
const MIN_DONORS = 5

const endpoint = 'https://mainnet.serve.giveth.io/graphql'

fetchProjectOwners().then(projects => {
    console.log('Filtered Projects:', projects.length);
    const uniqueAddresses = Array.from(new Set(
        projects
            .map(i => i.adminUser?.walletAddress)
            .filter(a => /^0x[0-9a-fA-F]{40}$/.test(a)) // EVM addresses only (drops Solana/Stellar wallets)
            .map(a => a.toLowerCase())
    ))
    console.log('Unique EVM addresses:', uniqueAddresses.length);

    fs.writeFileSync('outputs/pg-projects-giveth.json', JSON.stringify(uniqueAddresses, null, 2));
});

async function fetchProjectOwners(limit = 50, skip = 0, allProjects = []) {
    const sinceTime = new Date(SINCE_DATE).getTime();
    const projectsQuery = `
        query {
            allProjects(limit: ${limit}, skip: ${skip}, sortingBy: MostFunded, filters: [Verified, IsGivbackEligible]) {
                projects {
                    id
                    title
                    countUniqueDonors
                    latestUpdateCreationDate
                    adminUser {
                        firstName
                        walletAddress
                    }
                }
            }
        }
    `;

    const projectsResponse = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: projectsQuery })
    });

    if (!projectsResponse.ok) {
        throw new Error(`Error fetching projects: ${projectsResponse.statusText}`);
    }

    const projectsData = await projectsResponse.json();
    const projects = projectsData.data.allProjects.projects;

    for (const project of projects) {
        const hasEnoughDonors = (project.countUniqueDonors || 0) >= MIN_DONORS;
        const recentlyUpdated = project.latestUpdateCreationDate
            && new Date(project.latestUpdateCreationDate).getTime() >= sinceTime;

        if (hasEnoughDonors && recentlyUpdated) {
            allProjects.push(project);
        }
    }

    console.log('Fetched verified Giveth projects', skip, '->', skip + projects.length, '| kept so far:', allProjects.length);

    if (projects.length === limit) {
        return fetchProjectOwners(limit, skip + limit, allProjects);
    } else {
        return allProjects;
    }
}
