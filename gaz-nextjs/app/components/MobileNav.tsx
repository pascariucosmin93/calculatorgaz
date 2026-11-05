"use client";
import Link from "next/link";
const items = [["⌂", "Acasă", "/"], ["◒", "Consum", "/consum"], ["⌁", "Autocitire", "/autocitire"], ["?", "Suport", "/support"], ["◎", "Cont", "/cont"]];
export function MobileNav({ active }: { active: string }) { return <nav className="mobile-nav" aria-label="Navigare principală">{items.map(([icon, label, href]) => <Link key={href} href={href} className={active === href ? "active" : ""}><span>{icon}</span>{label}</Link>)}</nav>; }
