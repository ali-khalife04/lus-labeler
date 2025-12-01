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
  lg: {
    container: "",
    label: "text-5xl",         // was text-3xl
    description: "text-5xl",   // was text-lg
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
  const sizeClasses = sizeConfig[size];

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
      className={`rounded-md ${colorClass} ${sizeClasses.container} inline-flex items-center justify-center ${className}`}
      style={bigStyle}
    >
      <div className="flex flex-col items-center gap-0.5">
        <span className={`${sizeClasses.label} font-medium whitespace-nowrap`}>
          {label}
        </span>
        {showDescription && (
          <span
            className={`${sizeClasses.description} opacity-90 whitespace-nowrap`}
          >
            {config.description}
          </span>
        )}
      </div>
    </div>
  );
}

