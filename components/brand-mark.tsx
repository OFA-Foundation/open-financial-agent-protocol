import { useId } from "react";

/**
 * The OFAP mark: an ink ring, an "O" for Open, with the orange point of the
 * agent on it. The ring takes `--ink` and the point `--accent`, so the mark
 * follows the theme.
 */
export function BrandMark({ size = 28 }: { size?: number }) {
  const gap = `ofap-gap-${useId().replace(/:/g, "")}`;
  return (
    <svg className="brand-mark" viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
      <defs>
        <mask id={gap} maskUnits="userSpaceOnUse" x="0" y="0" width="32" height="32">
          <rect width="32" height="32" fill="#fff" />
          <circle cx="23.78" cy="8.22" r="5.3" fill="#000" />
        </mask>
      </defs>
      <circle cx="16" cy="16" r="11" fill="none" stroke="var(--ink)" strokeWidth="3.4" mask={`url(#${gap})`} />
      <circle cx="23.78" cy="8.22" r="3.1" fill="var(--accent)" />
    </svg>
  );
}
