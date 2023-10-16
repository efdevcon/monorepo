import fs from 'fs'
import fetch from 'cross-fetch'

require('dotenv').config()

Run()

// @ts-ignore
const deterministicReplacer = (_, v) =>
  typeof v !== 'object' || v === null || Array.isArray(v) ? v :
    Object.fromEntries(Object.entries(v).sort(([ka], [kb]) => 
      ka < kb ? -1 : ka > kb ? 1 : 0));

async function Run() {
    console.log('Run Twitter importer..')
    //  -is:quote
    const response = await fetch(`https://api.twitter.com/2/tweets/search/recent?max_results=20&tweet.fields=created_at&query=(from:efdevcon) -is:retweet -is:reply`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${process.env.TWITTER_API_KEY_NEWS}`
        },
    })

    const body = await response.json()

    if (body.status !== 200) {
        fs.writeFile("./src/content/news-tweets.json", JSON.stringify(body.data, deterministicReplacer, 2), function (err) {
            if (err) {
                console.log(err)
            }
        })
    }
}