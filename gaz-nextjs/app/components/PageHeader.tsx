type Props = { eyebrow?: string; title: React.ReactNode; subtitle?: string; action?: React.ReactNode };
export function PageHeader({ eyebrow, title, subtitle, action }: Props) { return <header className="page-header"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{subtitle && <p className="page-subtitle">{subtitle}</p>}</div>{action}</header>; }
