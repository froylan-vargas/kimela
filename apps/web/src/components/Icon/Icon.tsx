"use client";

import type { ReactElement, SVGProps } from "react";

type IconName =
  | "bell"
  | "caret-down"
  | "caret-up"
  | "check-circle"
  | "plus"
  | "sign-out"
  | "trophy"
  | "user"
  | "x"
  | "x-circle";

interface IconProps {
  name: IconName;
  className?: string;
  title?: string;
}

function TrophyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path
        d="M8 4h8v3a4 4 0 0 1-8 0V4Zm0 0H5v2a3 3 0 0 0 3 3m8-5h3v2a3 3 0 0 1-3 3M12 11v4m-3 5h6m-5-2h4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BellIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path
        d="M9 18h6m-5 2a2 2 0 0 0 4 0m5-2H5l1.5-2.5V11a5.5 5.5 0 1 1 11 0v4.5L19 18Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SignOutIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path
        d="M14 16l4-4-4-4m4 4H9m5 7h-7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CaretDownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CaretUpIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="m18 15-6-6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckCircleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.2 2.2 4.8-4.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function XCircleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6m0-6-6 6" strokeLinecap="round" />
    </svg>
  );
}

function UserIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <circle cx="12" cy="8" r="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M12 5v14m-7-7h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function XIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="m8 8 8 8m0-8-8 8" strokeLinecap="round" />
    </svg>
  );
}

const icons: Record<IconName, (props: SVGProps<SVGSVGElement>) => ReactElement> = {
  bell: BellIcon,
  "caret-down": CaretDownIcon,
  "caret-up": CaretUpIcon,
  "check-circle": CheckCircleIcon,
  plus: PlusIcon,
  "sign-out": SignOutIcon,
  trophy: TrophyIcon,
  user: UserIcon,
  x: XIcon,
  "x-circle": XCircleIcon,
};

export default function Icon({ name, className, title }: IconProps) {
  const Svg = icons[name];

  return (
    <span
      className={className}
      data-icon={name}
      aria-hidden={title ? undefined : "true"}
      title={title}
      style={{ display: "inline-flex", lineHeight: 0 }}
    >
      <Svg width="1em" height="1em" />
    </span>
  );
}
