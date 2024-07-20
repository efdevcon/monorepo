import fs from 'fs'

const sinceDate = '2022-10-11T00:00:00Z'
const qualityScore = 10

fetchProjectOwners().then(projects => {
    console.log('Filtered Projects:', projects.length);
    const uniqueAddresses = Array.from(new Set(projects.map(i => i.adminUser.walletAddress)))

    fs.writeFileSync('outputs/pg-projects-giveth.json', JSON.stringify(uniqueAddresses, null, 2));
});

async function fetchProjectOwners(limit = 50, skip = 0, allProjects = []) {
    console.log('Fetch verified Giveth projects', limit, skip);
    
    const endpoint = 'https://mainnet.serve.giveth.io/graphql';
    const targetDate = new Date(sinceDate).getTime();
    const projectsQuery = `
        query {
            allProjects(limit: ${limit}, skip: ${skip}, sortingBy: QualityScore, filters: Verified) {
                projects {
                    id
                    title
                    qualityScore
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
    const projects = projectsData.data.allProjects.projects.filter(project => project.qualityScore >= qualityScore);

    for (const project of projects) {
        await new Promise((r) => setTimeout(r, 250))
        const updatesAndDonationsQuery = `
            query {
                getProjectUpdates(projectId: ${project.id}) {
                    title
                    createdAt
                }
                donationsByProjectId(projectId: ${project.id}) {
                    totalCount
                    totalUsdBalance
                    donations {
                        valueUsd
                        createdAt
                    }
                }
            }
        `;

        const updatesAndDonationsResponse = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: updatesAndDonationsQuery })
        });

        if (!updatesAndDonationsResponse.ok) {
            console.error(`Error fetching updates and donations for project ${project.id}: ${updatesAndDonationsResponse.statusText}`);
            continue;
        }

        const updatesAndDonationsData = await updatesAndDonationsResponse.json();
        const updates = updatesAndDonationsData.data.getProjectUpdates;
        const donations = updatesAndDonationsData.data.donationsByProjectId.donations;

        const hasRecentUpdate = updates.some(update => new Date(update.createdAt).getTime() > targetDate);
        const hasRecentDonation = donations.some(donation => new Date(donation.createdAt).getTime() > targetDate);

        if (hasRecentUpdate || hasRecentDonation) {
            allProjects.push(project);
        }
    }

    if (projects.length === limit) {
        return fetchProjectOwners(limit, skip + limit, allProjects);
    } else {
        return allProjects;
    }
}