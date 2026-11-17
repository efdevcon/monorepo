/**
 * NocoDB forms whose submitters can download a certificate once they have
 * submitted, keyed by form slug (the Form config table). The certificate
 * prints the person's chosen name and the role the team set on their row
 * (pages/api/nocodb/[viewId]/certificate.ts).
 */
export interface FormCertificate {
  /** Column with the name the person chose for the certificate (a form field). */
  nameField: string
  /** Column with the name on the invite list, printed while nameField is empty. */
  listNameField?: string
  /** Column the team fills with the person's role (hidden from the form), printed as is. */
  roleField: string
  /** Printed when the role is empty. */
  defaultRole: string
  /** Name of the downloaded file. */
  fileName: string
}

export const FORM_CERTIFICATES: Record<string, FormCertificate> = {
  'devcon-8-volunteer-wallet': {
    nameField: 'Preferred Name',
    listNameField: 'Name',
    roleField: 'Volunteer Role',
    defaultRole: 'General Volunteer',
    fileName: 'devcon-8-volunteer-certificate.png',
  },
}

export function formCertificate(formSlug?: string): FormCertificate | null {
  return (formSlug && FORM_CERTIFICATES[formSlug]) || null
}
