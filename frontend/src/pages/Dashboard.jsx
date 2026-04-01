import React from 'react'

import PaymentFeed from '../components/PaymentFeed'

export default function Dashboard() {
  return (
    <div style={{ width: '100%', padding: 16 }}>
      <h1 style={{ marginTop: 12 }}>Inventory Pulse Dashboard</h1>
      <PaymentFeed />
    </div>
  )
}
