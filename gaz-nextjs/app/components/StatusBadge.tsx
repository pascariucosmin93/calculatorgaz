type Props = { children: React.ReactNode; tone?: "success" | "warning" | "neutral" | "danger" };
export function StatusBadge({ children, tone = "neutral" }: Props) { return <span className={`status-badge status-${tone}`}><span className="status-dot" />{children}</span>; }
