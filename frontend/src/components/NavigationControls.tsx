import { Slider } from './ui/slider';

interface NavigationControlsProps {
  currentSequence: number;
  totalSequences: number;
  isPlaying?: boolean;
  onSequenceChange: (sequence: number) => void;
  jumpHighlight?: boolean;
}

export function NavigationControls({ 
  currentSequence, 
  totalSequences, 
  isPlaying,
  onSequenceChange,
  jumpHighlight = false
}: NavigationControlsProps) {
  const handleSliderChange = (value: number[]) => {
    onSequenceChange(value[0]);
  };

  return (
    <div className={`transition-all ${jumpHighlight ? 'jump-highlight-pulse' : ''}`}>
      {/* Slider with light green styling */}
      <div className="slider-green">
        <Slider
          value={[currentSequence]}
          onValueChange={handleSliderChange}
          min={1}
          max={totalSequences}
          step={1}
          disabled={isPlaying}
          className="w-full"
        />
      </div>
    </div>
  );
}