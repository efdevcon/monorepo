export interface ContentSections {
  [key: string]: ContentSection
}

export interface ContentSection {
  id: string
  title: string
  body: string
  data: { [key: string]: any }
}
