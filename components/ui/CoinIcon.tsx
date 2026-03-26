interface Props { size?: number; }

export function CoinIcon({ size = 16 }: Props) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 24 24"
      style={{ flexShrink: 0, display: 'block' }}
    >
      {/* Coin edge (gives 3-D depth) */}
      <circle cx="12" cy="13" r="10" fill="#b45309" />
      {/* Coin face */}
      <circle cx="12" cy="11" r="10" fill="#f59e0b" />
      {/* Radial highlight */}
      <ellipse cx="9" cy="8" rx="4" ry="2.5" fill="#fef3c7" opacity="0.45" transform="rotate(-20 9 8)" />
      {/* Inner rim */}
      <circle cx="12" cy="11" r="7" fill="none" stroke="#fbbf24" strokeWidth="1.2" opacity="0.55" />
      {/* Q mark */}
      <text
        x="12" y="15.5"
        textAnchor="middle"
        fill="#78350f"
        fontSize="9"
        fontWeight="900"
        fontFamily="system-ui, sans-serif"
      >Q</text>
    </svg>
  );
}
