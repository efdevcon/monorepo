// "Why Devcon India" stat figures + citations, shared by the About page and the
// home page WhyDevconIndia section. Descriptions are locale-specific and live in
// each page's intl namespace (about.why_india.stats / home.why_india.stats),
// index-matched to this array.
export type StatMeta = {
  number: number
  prefix: string
  suffix: string
  decimals: number
  source: string
  url: string
}

export const STAT_META: StatMeta[] = [
  {
    number: 1,
    prefix: '#',
    suffix: '',
    decimals: 0,
    source: 'GitHub',
    url: 'https://github.blog/news-insights/octoverse/octoverse-a-new-developer-joins-github-every-second-as-ai-leads-typescript-to-1/',
  },
  {
    number: 76,
    prefix: '',
    suffix: '%',
    decimals: 0,
    source: 'Linux Foundation',
    url: 'https://www.prnewswire.com/news-releases/linux-foundation-research-finds-open-source-is-key-to-driving-indias-ai-market-302688143.html',
  },
  { number: 1, prefix: '# ', suffix: '', decimals: 0, source: 'Electric Capital', url: 'https://www.electriccapital.com/' },
  {
    number: 2021,
    prefix: '',
    suffix: '',
    decimals: 0,
    source: 'TechCrunch',
    url: 'https://techcrunch.com/2024/12/11/linux-foundation-sets-up-india-entity-to-boost-open-source-collaboration/',
  },
]
