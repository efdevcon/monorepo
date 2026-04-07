import React from 'react'

interface Props {
  email: string
  voucherCode: string
  onLogout: () => void
}

export default function VoucherStep({ email, voucherCode, onLogout }: Props) {
  return (
    <>
      <h2>Your Student Discount Voucher</h2>

      <div
        style={{
          padding: '10px 14px',
          backgroundColor: '#ecfdf5',
          border: '1px solid #6ee7b7',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#065f46',
          marginTop: '1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>Approved: <strong>{email}</strong></span>
        <button onClick={onLogout} style={{ background: 'none', border: 'none', color: '#065f46', textDecoration: 'underline', cursor: 'pointer', fontSize: '13px', padding: 0 }}>
          Switch email
        </button>
      </div>

      <p>
        Your application has been approved! Use the voucher code below when purchasing your Devcon ticket to receive
        the student discount.
      </p>

      <div
        style={{
          background: '#f2f1f4',
          borderRadius: '12px',
          padding: '20px',
          textAlign: 'center',
          margin: '1.5rem 0',
        }}
      >
        <p style={{ margin: '0 0 4px', fontSize: '12px', fontWeight: 600, color: '#594d73', textTransform: 'uppercase', letterSpacing: '1px' }}>
          VOUCHER CODE
        </p>
        <p style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: '#7235ed', letterSpacing: '1px' }}>
          {voucherCode}
        </p>
      </div>

      <p style={{ fontSize: '0.9rem', color: '#594d73' }}>
        Keep this code safe — you will need it during checkout.
      </p>
    </>
  )
}
