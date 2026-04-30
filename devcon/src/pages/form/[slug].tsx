import type { GetStaticPaths, GetStaticProps } from 'next'
import { getFormConfigBySlug, isFormOpen, type NocodbFormConfig } from 'services/form-config'
import FormPage from 'components/domain/nocodb-form/FormPage'

interface Props {
  config: NocodbFormConfig
}

export default function SlugFormPage({ config }: Props) {
  return (
    <FormPage
      viewId={config.formViewId}
      requireOtp={config.requireOtp}
      closed={!isFormOpen(config)}
    />
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  return { paths: [], fallback: 'blocking' }
}

export const getStaticProps: GetStaticProps<Props> = async ({ params }) => {
  const slug = params?.slug as string | undefined
  if (!slug) return { notFound: true, revalidate: 60 }
  const config = await getFormConfigBySlug(slug)
  if (!config) return { notFound: true, revalidate: 60 }
  return { props: { config }, revalidate: 60 }
}
