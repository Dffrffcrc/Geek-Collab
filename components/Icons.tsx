import { Platform, View } from 'react-native';

// Inline SVGs render directly via react-native-web on the web target. On
// native we render an empty box of the right size as a placeholder until we
// swap in react-native-svg.

type IconProps = { size?: number; color?: string };

function SvgWrap({
  size,
  children,
}: {
  size: number;
  children: React.ReactNode;
}) {
  if (Platform.OS !== 'web') return <View style={{ width: size, height: size }} />;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export function HomeIcon({ size = 18, color = '#fff' }: IconProps) {
  return (
    <SvgWrap size={size}>
      <path
        stroke={color}
        d="M3 12L12 3l9 9v9a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z"
      />
    </SvgWrap>
  );
}

export function ClockIcon({ size = 18, color = '#fff' }: IconProps) {
  return (
    <SvgWrap size={size}>
      <circle stroke={color} cx="12" cy="12" r="9" />
      <polyline stroke={color} points="12 7 12 12 15 14" />
    </SvgWrap>
  );
}

export function MenuIcon({ size = 18, color = '#fff' }: IconProps) {
  return (
    <SvgWrap size={size}>
      <line stroke={color} x1="3" y1="6" x2="21" y2="6" />
      <line stroke={color} x1="3" y1="12" x2="21" y2="12" />
      <line stroke={color} x1="3" y1="18" x2="21" y2="18" />
    </SvgWrap>
  );
}

export function HeartIcon({
  size = 18,
  color = '#fff',
  filled = false,
}: IconProps & { filled?: boolean }) {
  return (
    <SvgWrap size={size}>
      <path
        stroke={color}
        fill={filled ? color : 'none'}
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
      />
    </SvgWrap>
  );
}

export function CommentIcon({ size = 18, color = '#fff' }: IconProps) {
  return (
    <SvgWrap size={size}>
      <path
        stroke={color}
        d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
      />
    </SvgWrap>
  );
}

export function InfoIcon({ size = 18, color = '#fff' }: IconProps) {
  return (
    <SvgWrap size={size}>
      <circle stroke={color} cx="12" cy="12" r="9" />
      <line stroke={color} x1="12" y1="11" x2="12" y2="16" />
      <line stroke={color} x1="12" y1="8" x2="12" y2="8.01" />
    </SvgWrap>
  );
}

export function PlusIcon({ size = 18, color = '#fff' }: IconProps) {
  return (
    <SvgWrap size={size}>
      <line stroke={color} x1="12" y1="5" x2="12" y2="19" />
      <line stroke={color} x1="5" y1="12" x2="19" y2="12" />
    </SvgWrap>
  );
}

export function ImageIcon({ size = 18, color = '#fff' }: IconProps) {
  return (
    <SvgWrap size={size}>
      <rect stroke={color} x="3" y="3" width="18" height="18" rx="2" />
      <circle stroke={color} cx="8.5" cy="8.5" r="1.5" />
      <polyline stroke={color} points="21 15 16 10 5 21" />
    </SvgWrap>
  );
}

export function XIcon({ size = 18, color = '#fff' }: IconProps) {
  return (
    <SvgWrap size={size}>
      <line stroke={color} x1="6" y1="6" x2="18" y2="18" />
      <line stroke={color} x1="18" y1="6" x2="6" y2="18" />
    </SvgWrap>
  );
}

export function MoreIcon({ size = 18, color = '#fff' }: IconProps) {
  return (
    <SvgWrap size={size}>
      <circle stroke={color} fill={color} cx="5" cy="12" r="1.4" />
      <circle stroke={color} fill={color} cx="12" cy="12" r="1.4" />
      <circle stroke={color} fill={color} cx="19" cy="12" r="1.4" />
    </SvgWrap>
  );
}

export function EditIcon({ size = 18, color = '#fff' }: IconProps) {
  return (
    <SvgWrap size={size}>
      <path stroke={color} d="M12 20h9" />
      <path stroke={color} d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z" />
    </SvgWrap>
  );
}

export function FlagIcon({ size = 18, color = '#fff' }: IconProps) {
  return (
    <SvgWrap size={size}>
      <path stroke={color} d="M4 21V4h13l-2 4 2 4H4" />
    </SvgWrap>
  );
}

export function ShieldIcon({ size = 18, color = '#fff' }: IconProps) {
  return (
    <SvgWrap size={size}>
      <path stroke={color} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </SvgWrap>
  );
}

export function TrashIcon({ size = 18, color = '#fff' }: IconProps) {
  return (
    <SvgWrap size={size}>
      <polyline stroke={color} points="3 6 5 6 21 6" />
      <path stroke={color} d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path stroke={color} d="M10 11v6" />
      <path stroke={color} d="M14 11v6" />
      <path stroke={color} d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </SvgWrap>
  );
}

// Paper-plane style send icon — used as the submit affordance inside the
// comment / reply composer, replacing the standalone "Comment" button.
export function SendIcon({ size = 18, color = '#fff' }: IconProps) {
  return (
    <SvgWrap size={size}>
      <path stroke={color} d="M22 2L11 13" />
      <path stroke={color} d="M22 2L15 22l-4-9-9-4z" />
    </SvgWrap>
  );
}
