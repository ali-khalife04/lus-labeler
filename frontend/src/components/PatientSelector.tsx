import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface PatientSelectorProps {
  selectedPatient: string;
  patients: string[];
  onSelectPatient: (patientId: string) => void;
  // When true, all playback is active (Play or Repeat),
  // so the selector must be disabled.
  controlsLocked?: boolean;
}

export function PatientSelector({
  selectedPatient,
  patients,
  onSelectPatient,
  controlsLocked = false,
}: PatientSelectorProps) {
  return (
    <div className="space-y-1.5 p-3 bg-blue-50 rounded-md border border-blue-200">
      <Label htmlFor="patient-select" className="text-gray-700 font-medium">
        Select Patient
      </Label>
      <Select
        value={selectedPatient}
        onValueChange={onSelectPatient}
        disabled={controlsLocked}
      >
        <SelectTrigger
          id="patient-select"
          className="bg-white disabled:opacity-40 disabled:cursor-not-allowed border-blue-200"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {patients.map((patient) => (
            <SelectItem key={patient} value={patient}>
              {patient}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

