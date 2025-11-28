import { ChevronRight } from "lucide-react";

interface ClassBoxProps {
  label: "H-LUS" | "C-LUS" | "I-LUS";
  description: string;
  isSelected: boolean;
  dimmed?: boolean;
  className?: string;
}

const labelConfig = {
  "H-LUS": {
    color: "bg-blue-600 text-white",
    dimmedColor: "bg-blue-600/40 text-white/70",
  },
  "C-LUS": {
    color: "bg-yellow-400 text-black",
    dimmedColor: "bg-yellow-400/40 text-black/50",
  },
  "I-LUS": {
    color: "bg-red-600 text-white",
    dimmedColor: "bg-red-600/40 text-white/70",
  },
};

export function ClassBox({
  label,
  description,
  isSelected,
  dimmed = false,
  className = "",
}: ClassBoxProps) {
  const config = labelConfig[label];
  const colorClass = dimmed ? config.dimmedColor : config.color;

  return (
    <div
      className={`relative rounded-md ${colorClass} px-3 py-1.5 ${className}`}
    >
      {/* Centered text block */}
      <div className="flex flex-col items-center text-center gap-0.5">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs opacity-90">
          {description}
        </span>
      </div>

      {/* Chevron on the right, not affecting centering */}
      {isSelected && (
        <ChevronRight className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2" />
      )}
    </div>
  );
}