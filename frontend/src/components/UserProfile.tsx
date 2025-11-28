import { User } from 'lucide-react';

interface UserProfileProps {
  userName: string;
}

export function UserProfile({ userName }: UserProfileProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
      <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center">
        <User className="w-3.5 h-3.5 text-blue-600" />
      </div>
      <div className="text-left">
        <p className="text-gray-500 text-xs">Annotator</p>
        <p className="text-gray-800">{userName}</p>
      </div>
    </div>
  );
}