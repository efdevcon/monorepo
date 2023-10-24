import { distinctVideoTagsResolver } from './create-schema-customization/resolvers/archive'

export const createResolvers = ({ createResolvers }) => {
  const resolvers = {
    Query: {
      distinctVideoTags: distinctVideoTagsResolver,
    },
  }

  createResolvers(resolvers)
}
