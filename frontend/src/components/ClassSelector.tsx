interface ClassSelectorProps {
  selectedClass: "H-LUS" | "C-LUS" | "I-LUS";
  onSelectClass: (label: "H-LUS" | "C-LUS" | "I-LUS") => void;
  isPlaying?: boolean;
}

const labelConfig = {
  "H-LUS": {
    name: "H-LUS",
    description: "Hidden LUS",
    color: "#3B82F6",
    hoverColor: "#2563EB",
  },
  "C-LUS": {
    name: "C-LUS",
    description: "Contactless LUS",
    color: "#EAB308",
    hoverColor: "#CA8A04",
  },
  "I-LUS": {
    name: "I-LUS",
    description: "In-Contact LUS",
    color: "#EF4444",
    hoverColor: "#DC2626",
  },
};

export function ClassSelector({
  selectedClass,
  onSelectClass,
  isPlaying = false,
}: ClassSelectorProps) {
  return (
    <div className="flex flex-col gap-3">
      {(
        Object.keys(labelConfig) as Array<
          keyof typeof labelConfig
        >
      ).map((labelKey) => {
        const config = labelConfig[labelKey];
        const isSelected = selectedClass === labelKey;

        return (
          <button
            key={labelKey}
            onClick={() => onSelectClass(labelKey)}
            disabled={isPlaying}
            className="relative p-6 rounded-lg border-2 transition-all duration-200 text-left disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              borderColor: isSelected
                ? config.color
                : "#E5E7EB",
              backgroundColor: isSelected
                ? `${config.color}15`
                : "#fff",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all"
                style={{
                  borderColor: config.color,
                  backgroundColor: isSelected
                    ? config.color
                    : "#fff",
                }}
              >
                {isSelected && (
                  <div className="w-3 h-3 rounded-full bg-white"></div>
                )}
              </div>
              <div>
                <div
                  className="tracking-wide mb-1"
                  style={{ color: config.color }}
                >
                  {config.name}
                </div>
                <div className="text-gray-600">
                  {config.description}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}