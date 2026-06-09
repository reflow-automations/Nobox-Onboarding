"use client";

import { ReactNode } from "react";

export function KickerDot({
  children,
  dotColor = "green",
  className = "",
}: {
  children: ReactNode;
  dotColor?: "green" | "purple" | "text" | "yellow";
  className?: string;
}) {
  const color = {
    green: "bg-nbx-green",
    purple: "bg-nbx-purple",
    text: "bg-nbx-text",
    yellow: "bg-nbx-yellow",
  }[dotColor];
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className={`w-2 h-2 rounded-full ${color} flex-shrink-0`} aria-hidden />
      <span className="nbx-kicker">{children}</span>
    </div>
  );
}

export function ArrowSlideButton({
  children,
  type = "button",
  onClick,
  disabled = false,
  variant = "primary",
  className = "",
}: {
  children: ReactNode;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "green";
  className?: string;
}) {
  const base = variant === "green" ? "nbx-btn-primary-green" : "nbx-btn-primary";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} nbx-btn-arrow ${className}`}
    >
      <span className="nbx-arrow-slot nbx-arrow-slot-left" aria-hidden>
        <ArrowRight />
      </span>
      <span className="whitespace-nowrap">{children}</span>
      <span className="nbx-arrow-slot nbx-arrow-slot-right" aria-hidden>
        <ArrowRight />
      </span>
    </button>
  );
}

export function ArrowSlideLink({
  children,
  href,
  external = false,
  variant = "primary",
  className = "",
}: {
  children: ReactNode;
  href: string;
  external?: boolean;
  variant?: "primary" | "green";
  className?: string;
}) {
  const base = variant === "green" ? "nbx-btn-primary-green" : "nbx-btn-primary";
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className={`${base} nbx-btn-arrow ${className}`}
    >
      <span className="nbx-arrow-slot nbx-arrow-slot-left" aria-hidden>
        <ArrowRight />
      </span>
      <span className="whitespace-nowrap">{children}</span>
      <span className="nbx-arrow-slot nbx-arrow-slot-right" aria-hidden>
        <ArrowRight />
      </span>
    </a>
  );
}

export function ArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3 8H13M13 8L8.5 3.5M13 8L8.5 12.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ArrowLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M13 8H3M3 8L7.5 3.5M3 8L7.5 12.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function InfoDropdown({
  title,
  children,
  className = "",
}: {
  title: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <details
      className={`group rounded-xl border border-nbx-text/10 bg-nbx-bg/60 ${className}`}
    >
      <summary className="flex cursor-pointer select-none items-center justify-between gap-3 px-4 py-2.5 text-sm font-medium text-nbx-text/80 transition-colors hover:text-nbx-text list-none [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden
          className="flex-shrink-0 text-nbx-text/45 transition-transform duration-200 group-open:rotate-180"
        >
          <path
            d="M4 6L8 10L12 6"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </summary>
      <div className="px-4 pb-4 pt-0.5 text-sm leading-relaxed text-nbx-text/70">
        {children}
      </div>
    </details>
  );
}
