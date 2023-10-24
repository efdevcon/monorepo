import { Category } from 'src/types/Category'
import { FAQ } from 'src/types/FAQ'

export function ToFaqData(data: any): Array<Category> {
  return data.categories ? data.categories.nodes.map((i: any) => ToCategory(i, data)) : []
}

export function ToCategory(node: any, data: any): Category {
  return {
    id: node.fields.id,
    title: node.frontmatter.title,
    questions: data ? ToFAQs(data, { id: node.fields.id, title: node.frontmatter.title, questions: [] }) : [],
  } as Category
}

export function ToFAQs(data: any, category: Category): Array<FAQ> {
  return data.faqs
    ? data.faqs.nodes.filter((i: any) => i.frontmatter.category === category.id).map((i: any) => ToFAQ(i, category))
    : []
}

export function ToFAQ(node: any, category: Category): FAQ {
  return {
    id: node.fields.id,
    title: node.frontmatter.title,
    body: node.html,
    order: node.frontmatter.order,
    category: category,
  }
}
