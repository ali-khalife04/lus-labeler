import { Button } from './ui/button';
import { Label } from './ui/label';
import { ClassBox } from './ClassBox';

type ClassType = 'H-LUS' | 'C-LUS' | 'I-LUS';

interface ClassFilterProps {
  selectedClass: ClassType;
  onSelectClass: (classType: ClassType) => void;
  isPlaying?: boolean;
}

const classDescriptions = {
  'H-LUS': 'Hidden LUS',
  'C-LUS': 'Contactless LUS',
  'I-LUS': 'In-Contact LUS'
};

export function ClassFilter({ selectedClass, onSelectClass, isPlaying = false }: ClassFilterProps) {
  const classes: ClassType[] = ['H-LUS', 'C-LUS', 'I-LUS'];
  
  return (
    <div className="space-y-2">
      <Label className="text-gray-700">Choose Class to Watch</Label>
      <div className="space-y-2">
        {classes.map((classType) => {
          const isSelected = selectedClass === classType;
          return (
            <button
              key={classType}
              onClick={() => onSelectClass(classType)}
              disabled={isPlaying}
              className="w-full disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ClassBox 
                label={classType} 
                description={classDescriptions[classType]}
                isSelected={isSelected}
                dimmed={!isSelected}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}