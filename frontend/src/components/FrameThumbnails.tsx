import { ImageWithFallback } from './figma/ImageWithFallback';

interface Frame {
  id: number;
  thumbnail: string;
  label: 'H-LUS' | 'C-LUS' | 'I-LUS';
}

interface FrameThumbnailsProps {
  frames: Frame[];
  selectedFrame: number;
  onSelectFrame: (frameId: number) => void;
  isPlaying?: boolean;
}

const labelColors = {
  'H-LUS': '#3B82F6',
  'C-LUS': '#EAB308',
  'I-LUS': '#EF4444'
};

export function FrameThumbnails({ frames, selectedFrame, onSelectFrame, isPlaying = false }: FrameThumbnailsProps) {
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-3 min-w-max">
        {frames.map((frame) => (
          <button
            key={frame.id}
            onClick={() => onSelectFrame(frame.id)}
            disabled={isPlaying}
            className="flex-shrink-0 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div 
              className="w-28 rounded overflow-hidden border-2 transition-all"
              style={{
                borderColor: selectedFrame === frame.id ? labelColors[frame.label] : '#E5E7EB'
              }}
            >
              <ImageWithFallback
                src={frame.thumbnail}
                alt={`Frame ${frame.id}`}
                className="w-full h-16 object-cover"
              />
            </div>
            <div 
              className="mt-1.5 text-center px-2 py-0.5 rounded text-white"
              style={{ 
                backgroundColor: labelColors[frame.label],
                color: frame.label === 'C-LUS' ? '#000' : '#fff',
                fontSize: '0.75rem'
              }}
            >
              {frame.label}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
