"use client";

import { memo } from "react";
import { styles } from "../styles";

type Props = {
  items: string[];
  activeItem: string;
};

function BottomNavComponent({ items, activeItem }: Props) {
  return (
    <nav style={styles.bottomNav}>
      {items.map((item) => (
        <span
          key={item}
          style={{
            ...styles.navItem,
            color: item === activeItem ? "#d1081f" : "var(--nav-inactive)",
            fontWeight: item === activeItem ? 700 : 500
          }}
        >
          {item}
        </span>
      ))}
    </nav>
  );
}

export const BottomNav = memo(BottomNavComponent);
