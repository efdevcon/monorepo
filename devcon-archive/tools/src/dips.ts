import { Octokit } from '@octokit/rest';
const fs = require('fs');

const owner = 'efdevcon'
const repo = 'DIPs'
const path = 'DIPs'
const outDir = '../src/content/dips/'

console.log("GET DIPs");
GetDIPs();

interface Contributor { 
    name: string,
    avatarUrl: string,
    url: string
}

async function GetDIPs() {
    const octokit = new Octokit();
    const files = await octokit.repos.getContent({ owner, repo, path });

    if (Array.isArray(files.data)) { 
        const array = Array.from(files.data);

        if (!fs.existsSync(outDir)){
            fs.mkdirSync(outDir);
        }

        const allContributors = new Array<Contributor>();
        array.forEach(async i => {
            if (i.type === 'file') { 
                const file = await octokit.repos.getContent({ owner, repo, path: i.path });
                const commits = await octokit.repos.listCommits({ owner, repo, path: i.path });

                if (Array.isArray(commits.data)) { 
                    const arr = Array.from(commits.data);


                    arr.forEach(c => {
                        allContributors.push({
                            name: c.author ? c.author.login :c.commit.author.name,
                            url: c.author && c.author.url,
                            avatarUrl: c.author ? c.author.avatar_url : 'https://camo.githubusercontent.com/6e2f6de0032f63dd90d46812bcc47c1519ee78c4e095733ec35a964901b1274d/68747470733a2f2f302e67726176617461722e636f6d2f6176617461722f35316334663761346261326430393962326261396630343830333264643734613f643d68747470732533412532462532466769746875622e6769746875626173736574732e636f6d253246696d6167657325324667726176617461727325324667726176617461722d757365722d3432302e706e6726723d6726733d3634'
                        })
                    })
                }
                
                const buffer = Buffer.from(file.data.content, 'base64');
                const decoded = buffer.toString('utf-8');

                let formattedMarkdown = decoded;

                formattedMarkdown = formattedMarkdown.replace('---', `---\nGithub URL: ${file.data._links.html}`);

                // Finds the first section of the markdown body and extracts the text from it
                // Look for first occurence of ## (markdown header), keep going until a newline is found, collect all text until the next header, then sanitize and trim
                const matchSummary = formattedMarkdown.match(/##[^\n]*([^##]*)/);

                if (matchSummary && matchSummary[1]) formattedMarkdown = formattedMarkdown.replace('---', `---\nSummary: '${matchSummary[1].replace(/'/g, '"').trim()}'`)
                
                fs.writeFile(outDir + 'en/' + i.name, formattedMarkdown, function (err: any) {
                    if (err) return console.log(err);
                });

                const uniqueContributors = allContributors.filter((item: Contributor, index: number, array: Array<Contributor>) => 
                array.findIndex(i => i.name === item.name) === index);
                fs.writeFile(outDir + 'contributors.json', JSON.stringify(uniqueContributors, null, 2), function (err: any) {
                    if (err) return console.log(err);
                });
            }
        });
    }
}