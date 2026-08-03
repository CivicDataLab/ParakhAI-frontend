"use client";

import {
  forwardRef,
  type CSSProperties,
  type HTMLAttributes,
} from "react";

type ProgressBarSize = "small" | "medium" | "large";
type ProgressBarColor = "highlight" | "interactive" | "success" | "critical";

type ProgressBarProps = HTMLAttributes<HTMLDivElement> & {
  value: number;
  max?: number;
  size?: ProgressBarSize;
  color?: ProgressBarColor;
  animated?: boolean;
  customColor?: {
    backgroundColor: string;
    indicatorColor: string;
  };
  ariaLabelledBy?: string;
};

const SIZE_HEIGHT: Record<ProgressBarSize, number> = {
  small: 12,
  medium: 24,
  large: 36,
};

// Use tokens that are defined in styles/tokens/_variables.css.
// opub-ui maps highlight indicator to --action-primary-basic-default, which
// references an undefined --orange-secondary-color in this project.
const COLOR_VARS: Record<
  ProgressBarColor,
  { background: string; indicator: string }
> = {
  highlight: {
    background: "var(--base-violet-solid-4)",
    indicator: "var(--base-violet-solid-9)",
  },
  interactive: {
    background: "var(--base-blue-solid-2)",
    indicator: "var(--base-blue-solid-9)",
  },
  success: {
    background: "var(--base-green-solid-2)",
    indicator: "var(--base-green-solid-9)",
  },
  critical: {
    background: "var(--base-red-solid-2)",
    indicator: "var(--base-red-solid-9)",
  },
};

const ProgressBar = forwardRef<HTMLDivElement, ProgressBarProps>(
  (
    {
      value,
      max = 100,
      size = "medium",
      color = "highlight",
      animated = true,
      customColor,
      ariaLabelledBy,
      className = "",
      style,
      ...rest
    },
    ref
  ) => {
    const clampedMax = max > 0 ? max : 100;
    const percent = Math.min(100, Math.max(0, (value / clampedMax) * 100));
    const colors = customColor
      ? {
          background: customColor.backgroundColor,
          indicator: customColor.indicatorColor,
        }
      : COLOR_VARS[color];

    const rootStyle: CSSProperties = {
      height: SIZE_HEIGHT[size],
      backgroundColor: colors.background,
      ...style,
    };

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={clampedMax}
        aria-labelledby={ariaLabelledBy}
        className={`relative w-full overflow-hidden rounded-full ${className}`.trim()}
        style={rootStyle}
        {...rest}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${percent}%`,
            backgroundColor: colors.indicator,
            transitionProperty: "width",
            transitionDuration: animated ? "500ms" : "0ms",
            transitionTimingFunction: "ease-in-out",
          }}
        />
      </div>
    );
  }
);

ProgressBar.displayName = "ProgressBar";

export default ProgressBar;
