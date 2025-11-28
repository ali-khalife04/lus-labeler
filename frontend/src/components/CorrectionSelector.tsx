import { Label } from './ui/label';
import { LabelBadge } from './LabelBadge';

type LabelType = 'H-LUS' | 'C-LUS' | 'I-LUS';

interface CorrectionSelectorProps {
  originalLabel: LabelType;
  userCorrection?: LabelType;
  onSelectCorrection: (label: LabelType) => void;
  isPlaying?: boolean;
}

export function CorrectionSelector({ 
  originalLabel, 
  userCorrection,
  onSelectCorrection,
  isPlaying = false
}: CorrectionSelectorProps) {
  // Current label (either corrected or original)
  const currentLabel = userCorrection || originalLabel;
  
  // Logical transition rules:
  // H-LUS → can only change to C-LUS
  // C-LUS → can change to H-LUS or I-LUS
  // I-LUS → can only change to C-LUS
  const getValidTransitions = (label: LabelType): LabelType[] => {
    switch (label) {
      case 'H-LUS':
        return ['C-LUS'];
      case 'C-LUS':
        return ['H-LUS', 'I-LUS'];
      case 'I-LUS':
        return ['C-LUS'];
      default:
        return [];
    }
  };
  
  const correctionOptions = getValidTransitions(currentLabel);

  return (
    <div className="border-t border-gray-200 pt-1.5 pb-1 bg-gray-50">
      <div className="space-y-1">
        <Label className="text-gray-700">Click to Correct the Label</Label>
        <div className="flex gap-3 flex-wrap items-center">
          {correctionOptions.map((option) => (
            <button
              key={option}
              onClick={() => onSelectCorrection(option)}
              disabled={isPlaying}
              className="disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:opacity-80"
            >
            
              <div className="scale-1000 origin-center inline-block">
                 <LabelBadge label={option} size="lg"/>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
