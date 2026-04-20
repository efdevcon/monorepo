import { useRouter } from 'next/router'
import { getConfigByViewId } from 'config/nocodb-forms'
import FormPage from 'components/domain/nocodb-form/FormPage'

export default function DynamicFormPage() {
  const router = useRouter()
  const viewId = router.query.viewId as string | undefined

  if (!viewId) return null

  // Check if this viewId has a config entry (e.g. for OTP)
  const config = getConfigByViewId(viewId)

  return <FormPage viewId={viewId} requireOtp={config?.requireOtp ?? false} />
}

export async function getStaticPaths() {
  return { paths: [], fallback: 'blocking' }
}

export async function getStaticProps() {
  return { props: {}, revalidate: 86400 }
}
