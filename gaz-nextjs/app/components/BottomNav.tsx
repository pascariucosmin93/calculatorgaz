"use client";

import { memo } from "react";
import { styles } from "../styles";

type Props = {
  items: string[];
  activeItem: string;
};

function BottomNavComponent({ items, activeItem }: Props) {
  return (
    <nav style={styles.bottomNav} aria-label="Navigare principală">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          aria-current={item === activeItem ? "page" : undefined}
          style={{
            ...styles.navItem,
            color: item === activeItem ? "#d1081f" : "var(--nav-inactive)",
            fontWeight: item === activeItem ? 700 : 500
          }}
        >
          {item}
        </button>
      ))}
    </nav>
  );
}

export const BottomNav = memo(BottomNavComponent);
