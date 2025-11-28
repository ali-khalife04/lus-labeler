import { useState } from "react";
import { LabelBadge } from "./LabelBadge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface HistoryEntry {
  id: number;
  patientId: string;
  sequenceId: string;
  previousLabel: "H-LUS" | "C-LUS" | "I-LUS";
  updatedLabel: "H-LUS" | "C-LUS" | "I-LUS";
  annotator: string;
  timestamp: string;
}

interface HistoryLogProps {
  entries: HistoryEntry[];
  onSelectEntry?: (entry: HistoryEntry) => void;
  onDeleteEntry?: (entry: HistoryEntry) => void;
}

export function HistoryLog({
  entries,
  onSelectEntry,
  onDeleteEntry,
}: HistoryLogProps) {
  const [openRowId, setOpenRowId] = useState<number | null>(
    null,
  );

  const handleRowClick = (entryId: number) => {
    setOpenRowId((current) =>
      current === entryId ? null : entryId,
    );
  };

  const handleShowSequence = (entry: HistoryEntry) => {
    onSelectEntry?.(entry);
    setOpenRowId(null);
  };

  const handleDelete = (entry: HistoryEntry) => {
    onDeleteEntry?.(entry);
    setOpenRowId(null);
  };

  return (
    <div className="overflow-y-auto h-full">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-3 py-1 text-left text-gray-600 text-sm">
              Sequence
            </th>
            <th className="px-3 py-1 text-left text-gray-600 text-sm w-28">
              Previous
            </th>
            <th className="px-3 py-1 text-left text-gray-600 text-sm w-28">
              Updated
            </th>
          </tr>
        </thead>

        <tbody>
          <TooltipProvider>
            {entries.map((entry) => (
              <FragmentWithOptions
                key={entry.id}
                entry={entry}
                isOpen={openRowId === entry.id}
                onRowClick={() => handleRowClick(entry.id)}
                onShowSequence={handleShowSequence}
                onDelete={handleDelete}
              />
            ))}
          </TooltipProvider>
        </tbody>
      </table>

      {entries.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          No corrections yet
        </div>
      )}
    </div>
  );
}

// Small helper component to keep JSX clean
function FragmentWithOptions({
  entry,
  isOpen,
  onRowClick,
  onShowSequence,
  onDelete,
}: {
  entry: HistoryEntry;
  isOpen: boolean;
  onRowClick: () => void;
  onShowSequence: (entry: HistoryEntry) => void;
  onDelete: (entry: HistoryEntry) => void;
}) {
  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <tr
            className="border-b border-gray-100 hover:bg-blue-50 transition-colors cursor-pointer"
            onClick={onRowClick}
          >
            <td className="px-3 py-2 text-gray-700">
              {entry.sequenceId}
            </td>
            <td className="px-3 py-2">
              <LabelBadge label={entry.previousLabel} />
            </td>
            <td className="px-3 py-2">
              <LabelBadge label={entry.updatedLabel} />
            </td>
          </tr>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>Click for options</p>
        </TooltipContent>
      </Tooltip>

      {isOpen && (
        <tr className="bg-gray-50">
          <td colSpan={3} className="px-3 py-2">
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => onShowSequence(entry)}
                className="px-3 py-1 text-xs rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
              >
                Show this sequence
              </button>
              <button
                type="button"
                onClick={() => onDelete(entry)}
                className="px-3 py-1 text-xs rounded-md bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
