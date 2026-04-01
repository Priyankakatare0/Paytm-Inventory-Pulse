import { useEffect, useMemo, useState } from 'react'
import { getSocket } from '../lib/socket'

function formatMoney(amount) {
	const n = Number(amount)
	if (!Number.isFinite(n)) return String(amount ?? '')
	return `₹${n.toFixed(0)}`
}

export default function PaymentFeed() {
	const [payments, setPayments] = useState([])

	const socket = useMemo(() => getSocket(), [])

	useEffect(() => {
		function onNewPayment(payload) {
			setPayments((prev) => [payload, ...prev].slice(0, 20))
		}

		socket.on('new_payment', onNewPayment)
		return () => {
			socket.off('new_payment', onNewPayment)
		}
	}, [socket])

	return (
		<div style={{ textAlign: 'left', padding: 16 }}>
			<h2 style={{ margin: '0 0 12px' }}>Live Payments</h2>
			{payments.length === 0 ? (
				<p style={{ margin: 0 }}>No payments yet. Trigger `/api/webhook/paytm` to see updates.</p>
			) : (
				<div style={{ display: 'grid', gap: 8 }}>
					{payments.map((p) => (
						<div
							key={p.id ?? `${p.merchantId}-${p.createdAt}-${Math.random()}`}
							style={{
								border: '1px solid var(--border)',
								borderRadius: 8,
								padding: 12,
								background: 'var(--social-bg)',
							}}
						>
							<div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
								<div>
									<div style={{ fontWeight: 600, color: 'var(--text-h)' }}>{formatMoney(p.amount)}</div>
									<div style={{ fontSize: 14, opacity: 0.8 }}>{p.type}</div>
								</div>
								<div style={{ fontSize: 12, opacity: 0.7, textAlign: 'right' }}>
									<div>Merchant: {p.merchantId}</div>
									{p.createdAt ? <div>{new Date(p.createdAt).toLocaleString()}</div> : null}
								</div>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	)
}

