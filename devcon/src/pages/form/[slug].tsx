import { useRouter } from 'next/router'
import { nocodbForms } from 'config/nocodb-forms'
import FormPage from 'components/domain/nocodb-form/FormPage'

export default function SlugFormPage() {
  const router = useRouter()
  const slug = router.query.slug as string | undefined
  const config = slug ? nocodbForms[slug] : undefined

  if (!slug || !config) return null

  return <FormPage viewId={config.formViewId} requireOtp={config.requireOtp ?? false} />
}

export async function getStaticPaths() {
  return { paths: [], fallback: 'blocking' }
}

export async function getStaticProps({ params }: any) {
  const slug = params?.slug as string
  if (!nocodbForms[slug]) return { notFound: true }
  return { props: {}, revalidate: 86400 }
}
