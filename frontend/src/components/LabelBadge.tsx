import React from "react";

interface LabelBadgeProps {
  label: "H-LUS" | "C-LUS" | "I-LUS";
  showDescription?: boolean;
  dimmed?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const labelConfig = {
  "H-LUS": {
    color: "bg-blue-600 text-white",
    dimmedColor: "bg-blue-600/40 text-white/70",
    description: "Hidden LUS",
  },
  "C-LUS": {
    color: "bg-yellow-400 text-black",
    dimmedColor: "bg-yellow-400/40 text-black/50",
    description: "Contact LUS",
  },
  "I-LUS": {
    color: "bg-red-600 text-white",
    dimmedColor: "bg-red-600/40 text-white/70",
    description: "Inactive LUS",
  },
};

type SizeKey = "sm" | "md" | "lg";

const sizeConfig = {
  sm: {
    container: "px-3 py-1",
    label: "text-xs",
    description: "text-[10px]",
  },
  md: {
    container: "px-8 py-2",
    label: "text-sm",
    description: "text-xs",
  },
  },
  lg: {
    container: "",
    labelFontSize: 40, // increase if you want it even bigger
    descFontSize: 20,
  },
};

export function LabelBadge({
  label,
  showDescription = false,
  dimmed = false,
  className = "",
  size = "md",
}: LabelBadgeProps) {
  const config = labelConfig[label];
  const colorClass = dimmed ? config.dimmedColor : config.color;
  const sizeCfg = sizeConfig[size];

  const bigStyle =
    size === "lg"
      ? {
          padding: "16px 40px",
          minWidth: "200px",
          minHeight: "80px",
        }
      : undefined;

  return (
    <div
      className={`rounded-md ${colorClass} ${sizeCfg.container} inline-flex items-center justify-center ${className}`}
      style={bigStyle}
    >
      <div className="flex flex-col items-center gap-0.5">
        <span
          className="font-medium whitespace-nowrap"
          style={{ fontSize: sizeCfg.labelFontSize }}
        >
          {label}
        </span>
        {showDescription && (
          <span
            className="opacity-90 whitespace-nowrap"
            style={{ fontSize: sizeCfg.descFontSize }}
          >
            {config.description}
          </span>
        )}
      </div>
    </div>
  );
}

