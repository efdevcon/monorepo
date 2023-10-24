import { DIP } from 'src/types/DIP'

export function ToDIPData(source: any): Array<DIP> {
  return source.dips ? source.dips.nodes.map((dip: DIP) => ToDIP(dip)) : []
}

export function ToDIP(source: any): DIP {
  return {
    github: source.frontmatter.Github_URL,
    // summary: source.frontmatter.Summary,
    summary: source.excerpt,
    number: source.frontmatter.DIP,
    title: source.frontmatter.Title,
    status: source.frontmatter.Status,
    themes: source.frontmatter.Themes ? source.frontmatter.Themes.split(',') : [],
    tags: source.frontmatter.Tags ? source.frontmatter.Tags.split(',') : [],
    authors: source.frontmatter.Authors ? source.frontmatter.Authors.split(',') : [],
    resources: source.frontmatter.Resources,
    discussion: source.frontmatter.Discussion,
    created: new Date(source.frontmatter.Created),
    next_dip: source.frontmatter.next_dip,
    prev_dip: source.frontmatter.prev_dip,
    // body: source.html,
    slug: source.fields?.slug,
  }
}
