type Props = { label: string; value: string; detail?: string; status?: React.ReactNode; icon: string };
export function StatCard({ label, value, detail, status, icon }: Props) { return <article className="stat-card"><div className="stat-top"><span>{label}</span><span className="stat-icon">{icon}</span></div><strong>{value}</strong>{detail && <small>{detail}</small>}{status}</article>; }
