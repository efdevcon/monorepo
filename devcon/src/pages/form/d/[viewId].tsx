import type { GetStaticPaths, GetStaticProps } from 'next'
import { getFormConfigByViewId, isFormOpen, type NocodbFormConfig } from 'services/form-config'
import FormPage from 'components/domain/nocodb-form/FormPage'

interface Props {
  viewId: string
  config: NocodbFormConfig | null
}

export default function DynamicFormPage({ viewId, config }: Props) {
  return (
    <FormPage
      viewId={viewId}
      requireOtp={config?.requireOtp ?? false}
      closed={!isFormOpen(config ?? undefined)}
    />
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  return { paths: [], fallback: 'blocking' }
}

export const getStaticProps: GetStaticProps<Props> = async ({ params }) => {
  const viewId = params?.viewId as string | undefined
  if (!viewId) return { notFound: true, revalidate: 60 }
  const config = await getFormConfigByViewId(viewId)
  return { props: { viewId, config: config ?? null }, revalidate: 60 }
}
