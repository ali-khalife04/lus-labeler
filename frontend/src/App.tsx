import React, { useEffect, useState, useRef } from "react";
import { API_BASE_URL } from "./api/config";

import { VideoPlayer } from "./components/VideoPlayer";
import { ClassFilter } from "./components/ClassFilter";
import { NavigationControls } from "./components/NavigationControls";
import { VideoControls } from "./components/VideoControls";
import { CorrectionSelector } from "./components/CorrectionSelector";
import { HistoryLog } from "./components/HistoryLog";
import { LoginScreen } from "./components/LoginScreen";
import { PatientSelector } from "./components/PatientSelector";

type LabelType = "H-LUS" | "C-LUS" | "I-LUS";

interface UserAccount {
  id: number | string;
  name: string;
}

interface Patient {
  patient_id: string;
  display_name?: string | null;
}

interface Sequence {
  id: number; // 1-based index inside this patient + class
  class: LabelType;
  originalLabel: LabelType;
  userCorrections: Record<string, LabelType>;
  fileName: string;
  videoUrl: string;
}

interface HistoryEntry {
  id: number;
  patientId: string;
  sequenceId: string; // display string like "1-H-001"
  previousLabel: LabelType;
  updatedLabel: LabelType;
  annotator: string;
  timestamp: string;
  class: LabelType;
  sequenceNumber: number;
  originalClass: LabelType;
}

// Map backend history entry into frontend HistoryEntry
function mapBackendHistoryEntry(e: any): HistoryEntry {
  const patientId = String(e.patient_id || "");

  // Extract patient number from patientId (e.g. "Patient_1" -> 1)
  const m = patientId.match(/\d+/);
  const patientNumber = m ? parseInt(m[0], 10) || 1 : 1;

  const parts = String(e.sequence_id || "").split("-");
  const classInitial = parts[0] || "H";
  const seqNum = parseInt(parts[1] || "1", 10) || 1;

  const classMap: Record<string, LabelType> = {
    H: "H-LUS",
    C: "C-LUS",
    I: "I-LUS",
  };
  const originalClass = classMap[classInitial] || "H-LUS";

  // Display string: "1-H-001"
  const displaySequenceId = `${patientNumber}-${e.sequence_id}`;

  return {
    id: e.id,
    patientId,
    sequenceId: displaySequenceId,
    previousLabel: e.previous_label as LabelType,
    updatedLabel: e.updated_label as LabelType,
    annotator: e.annotator,
    timestamp: e.timestamp,
    class: originalClass,
    sequenceNumber: seqNum,
    originalClass,
  };
}

type PlaybackMode = "idle" | "play-all" | "repeat";

export default function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  // Users
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);

  // Patients
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [patientsError, setPatientsError] = useState<string | null>(null);

  // Selection + playback
  const [currentPatientId, setCurrentPatientId] = useState<string | null>(null);
  const [currentClass, setCurrentClass] = useState<LabelType>("H-LUS");
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [currentSequenceIndex, setCurrentSequenceIndex] = useState(0);
  const [mode, setMode] = useState<PlaybackMode>("idle");
  const [jumpHighlight, setJumpHighlight] = useState(false);
  const [pendingHistoryJump, setPendingHistoryJump] = useState<number | null>(
    null,
  );

  const isPlaying = mode !== "idle";
  const isRepeating = mode === "repeat";

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const modeRef = useRef<PlaybackMode>("idle");
  const hasSequencesRef = useRef<boolean>(false);

  // Change-password UI
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [cpOld, setCpOld] = useState("");
  const [cpNew, setCpNew] = useState("");
  const [cpConfirm, setCpConfirm] = useState("");
  const [cpError, setCpError] = useState<string | null>(null);
  const [cpSuccess, setCpSuccess] = useState<string | null>(null);
  const [cpLoading, setCpLoading] = useState(false);

  // History per user
  const [userHistory, setUserHistory] = useState<Record<string, HistoryEntry[]>>(
    {},
  );
  const [isHistoryVisible, setIsHistoryVisible] = useState(true);

  // Keep refs in sync
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    hasSequencesRef.current = sequences.length > 0;
  }, [sequences.length]);

  // ===========================
  // Fetch users
  // ===========================
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/users`);
        if (!res.ok) {
          throw new Error(`Failed to fetch users: ${res.status}`);
        }

        const raw = await res.json();
        const data = raw as Array<any>;

        const mapped: UserAccount[] = data.map((u, index) => {
          const name =
            (typeof u.username === "string" && u.username) ||
            (typeof u.name === "string" && u.name) ||
            (typeof u.user_name === "string" && u.user_name) ||
            `User ${index + 1}`;
          const id = u.id ?? name ?? index;
          return { id, name };
        });

        setUsers(mapped);
        setUsersError(null);
      } catch (err) {
        console.error("Error fetching users", err);
        setUsersError("Unable to load users from the server.");
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, []);

  // ===========================
  // Fetch patients
  // ===========================
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/patients`);
        if (!res.ok) {
          throw new Error(`Failed to fetch patients: ${res.status}`);
        }
        const data = (await res.json()) as Array<any>;
        const mapped: Patient[] = data.map((p) => ({
          patient_id: String(p.patient_id),
          display_name: p.display_name ?? p.patient_id,
        }));
        setPatients(mapped);
        setPatientsError(null);

        // Default to first patient
        if (!currentPatientId && mapped.length > 0) {
          setCurrentPatientId(mapped[0].patient_id);
        }
      } catch (err) {
        console.error("Error fetching patients", err);
        setPatientsError("Unable to load patients from the server.");
      } finally {
        setLoadingPatients(false);
      }
    };

    fetchPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patientIds = patients.map((p) => p.patient_id);

  // ===========================
  // Fetch videos when patient/class changes
  // ===========================
  useEffect(() => {
    const loadVideos = async () => {
      if (!currentPatientId) return;

      try {
        const res = await fetch(
          `${API_BASE_URL}/api/patients/${encodeURIComponent(
            currentPatientId,
          )}/classes/${encodeURIComponent(currentClass)}/videos`,
        );
        if (!res.ok) {
          throw new Error(`Failed to fetch videos: ${res.status}`);
        }
        const data = (await res.json()) as Array<{
          file_name: string;
          url: string;
        }>;

        const newSequences: Sequence[] = data.map((v, index) => ({
          id: index + 1,
          class: currentClass,
          originalLabel: currentClass,
          userCorrections: {},
          fileName: v.file_name,
          videoUrl: `${API_BASE_URL}${v.url}`,
        }));

        setSequences(newSequences);
        setCurrentSequenceIndex(0);
        setMode("idle");
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.currentTime = 0;
        }
      } catch (err) {
        console.error("Error fetching videos", err);
        setSequences([]);
        setCurrentSequenceIndex(0);
        setMode("idle");
      }
    };

    loadVideos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPatientId, currentClass]);

  const hasSequences = sequences.length > 0;
  const safeSequenceIndex = hasSequences
    ? Math.min(currentSequenceIndex, sequences.length - 1)
    : 0;
  const currentSequence = hasSequences ? sequences[safeSequenceIndex] : null;
  const totalSequences = sequences.length;

  const currentUserCorrection =
    currentUser && currentSequence
      ? currentSequence.userCorrections[currentUser]
      : undefined;

  // ===========================
  // Keyboard shortcuts
  // ===========================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        if (!hasSequencesRef.current) return;

        if (modeRef.current === "idle") {
          setMode("play-all");
        } else {
          setMode("idle");
          if (videoRef.current) {
            videoRef.current.pause();
          }
        }
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        if (!hasSequencesRef.current) return;

        if (modeRef.current === "repeat") {
          setMode("idle");
          if (videoRef.current) {
            videoRef.current.pause();
          }
        } else {
          setMode("repeat");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ===========================
  // Login + history loading
  // ===========================
  const handleLogin = (userName: string) => {
    setCurrentUser(userName);

    if (!userHistory[userName]) {
      setUserHistory((prev) => ({ ...prev, [userName]: [] }));
    }

    fetch(`${API_BASE_URL}/history?annotator=${encodeURIComponent(userName)}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        const mapped: HistoryEntry[] = (data || []).map((e: any) =>
          mapBackendHistoryEntry(e),
        );
        setUserHistory((prev) => ({
          ...prev,
          [userName]: mapped,
        }));
      })
      .catch((err) => {
        console.error("Failed to load history from backend", err);
      });
  };

  // ===========================
  // Selection handlers
  // ===========================
  const handlePatientChange = (patientId: string) => {
    setCurrentPatientId(patientId);
    setCurrentSequenceIndex(0);
    setMode("idle");
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const handleClassFilter = (classType: LabelType) => {
    setCurrentClass(classType);
    setCurrentSequenceIndex(0);
    setMode("idle");
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const handleSequenceChange = (sequenceNum: number) => {
    if (!hasSequences) return;
    if (sequenceNum < 1 || sequenceNum > totalSequences) return;

    setCurrentSequenceIndex(sequenceNum - 1);
    setMode("idle");
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  // ===========================
  // Playback handlers
  // ===========================
  const handlePlay = () => {
    if (!hasSequences) return;
    setMode("play-all");
  };

  const handlePause = () => {
    setMode("idle");
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  const handleToggleRepeat = () => {
    if (!hasSequences || !currentSequence) return;

    if (mode === "repeat") {
      setMode("idle");
      if (videoRef.current) {
        videoRef.current.pause();
      }
    } else {
      setMode("repeat");
    }
  };

  const handlePrevSequence = () => {
    if (!hasSequences) return;
    if (safeSequenceIndex > 0) {
      setCurrentSequenceIndex((prev) => prev - 1);
      setMode("idle");
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    }
  };

  const handleNextSequence = () => {
    if (!hasSequences) return;
    if (safeSequenceIndex < totalSequences - 1) {
      setCurrentSequenceIndex((prev) => prev + 1);
      setMode("idle");
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    }
  };

  const handleVideoEnded = () => {
    if (!hasSequences) return;

    if (mode === "play-all") {
      if (safeSequenceIndex < totalSequences - 1) {
        setCurrentSequenceIndex((prev) => prev + 1);
      } else {
        // Last video of the class, stop
        setMode("idle");
      }
    }
  };

  // ===========================
  // Corrections + history
  // ===========================
  const handleCorrectionSelect = (label: LabelType) => {
    if (!currentUser || !currentSequence || !currentPatientId) return;

    const previousLabel =
      currentSequence.userCorrections[currentUser] ||
      currentSequence.originalLabel;

    if (previousLabel === label) return;

    // Update corrections in local sequence list
    setSequences((prev) => {
      if (!prev.length) return prev;
      const copy = [...prev];
      const idx = safeSequenceIndex;
      const seq = { ...copy[idx] };
      seq.userCorrections = {
        ...seq.userCorrections,
        [currentUser]: label,
      };
      copy[idx] = seq;
      return copy;
    });

    const now = new Date();
    const timeString = now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const classInitialMap: Record<LabelType, string> = {
      "H-LUS": "H",
      "C-LUS": "C",
      "I-LUS": "I",
    };

    // Raw sequence id stored in DB, e.g. "H-001"
    const rawSequenceId = `${classInitialMap[currentSequence.originalLabel]}-${String(
      currentSequence.id,
    ).padStart(3, "0")}`;

    // Extract patient number from currentPatientId, e.g. "Patient_1" -> 1
    const m = currentPatientId.match(/\d+/);
    const patientNumber = m ? parseInt(m[0], 10) || 1 : 1;

    // Display sequence id in history: "1-H-001"
    const displaySequenceId = `${patientNumber}-${rawSequenceId}`;

    const tempId = Date.now();

    const newEntry: HistoryEntry = {
      id: tempId,
      patientId: currentPatientId,
      sequenceId: displaySequenceId,
      previousLabel,
      updatedLabel: label,
      annotator: currentUser,
      timestamp: timeString,
      class: currentClass,
      sequenceNumber: currentSequence.id,
      originalClass: currentSequence.originalLabel,
    };

    setUserHistory((prev) => ({
      ...prev,
      [currentUser]: [newEntry, ...(prev[currentUser] || [])],
    }));

    // Persist to backend with the RAW sequence id (without patient number)
    fetch(`${API_BASE_URL}/history`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        patient_id: currentPatientId,
        sequence_id: rawSequenceId,
        previous_label: previousLabel,
        updated_label: label,
        annotator: currentUser,
      }),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((saved) => {
        setUserHistory((prev) => {
          const entries = prev[currentUser] || [];
          const updatedEntries = entries.map((e) =>
            e.id === tempId
              ? {
                  ...e,
                  id: saved.id,
                  timestamp: saved.timestamp,
                }
              : e,
          );
          return { ...prev, [currentUser]: updatedEntries };
        });
      })
      .catch((err) => {
        console.error("Failed to save history to backend", err);
      });
  };

  const handleHistoryEntryClick = (entry: HistoryEntry) => {
    // Set target patient + class, then jump to sequence when videos load
    setCurrentPatientId(entry.patientId);
    setCurrentClass(entry.originalClass);
    setPendingHistoryJump(entry.sequenceNumber);
    setMode("idle");

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  // When we have a pending history jump and sequences are loaded, jump to the right index
  useEffect(() => {
    if (pendingHistoryJump == null) return;
    if (!hasSequences) return;

    const targetIndex = Math.min(
      Math.max(pendingHistoryJump - 1, 0),
      sequences.length - 1,
    );
    setCurrentSequenceIndex(targetIndex);
    setPendingHistoryJump(null);
    setJumpHighlight(true);
  }, [pendingHistoryJump, hasSequences, sequences.length]);

  useEffect(() => {
    if (jumpHighlight) {
      const timer = setTimeout(() => {
        setJumpHighlight(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [jumpHighlight]);

  const handleDeleteHistoryEntry = (entry: HistoryEntry) => {
    if (!currentUser) return;

    setUserHistory((prev) => ({
      ...prev,
      [currentUser]:
        prev[currentUser]?.filter((e) => e.id !== entry.id) || [],
    }));

    // If the deleted entry refers to the currently loaded patient + class,
    // also drop the userCorrection locally for that sequence.
    if (
      currentPatientId === entry.patientId &&
      currentClass === entry.originalClass
    ) {
      setSequences((prev) => {
        const copy = [...prev];
        const idx = copy.findIndex((s) => s.id === entry.sequenceNumber);
        if (idx !== -1) {
          const seq = { ...copy[idx] };
          const updatedCorrections = { ...seq.userCorrections };
          delete updatedCorrections[currentUser];
          seq.userCorrections = updatedCorrections;
          copy[idx] = seq;
        }
        return copy;
      });
    }

    fetch(`${API_BASE_URL}/history/${entry.id}`, {
      method: "DELETE",
    }).catch((err) => {
      console.error("Failed to delete history on backend", err);
    });
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setShowChangePassword(false);
    setCpOld("");
    setCpNew("");
    setCpConfirm("");
    setCpError(null);
    setCpSuccess(null);
  };

  // ===========================
  // Password change
  // ===========================
  const handleChangePasswordSubmit = async () => {
    if (!currentUser) return;

    setCpError(null);
    setCpSuccess(null);

    if (!cpOld || !cpNew || !cpConfirm) {
      setCpError("Please fill in all fields.");
      return;
    }

    if (cpNew !== cpConfirm) {
      setCpError("New password and confirmation do not match.");
      return;
    }

    setCpLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: currentUser,
          old_password: cpOld,
          new_password: cpNew,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const detail =
          (data && (data.detail || data.message)) ||
          "Failed to change password.";
        setCpError(detail);
        return;
      }

      setCpSuccess("Password updated successfully.");
      setCpOld("");
      setCpNew("");
      setCpConfirm("");
    } catch (err) {
      console.error("Change password error", err);
      setCpError("Server error. Please try again.");
    } finally {
      setCpLoading(false);
    }
  };

  // ===========================
  // Login gate
  // ===========================
  if (!currentUser) {
    if (loadingUsers) {
      return (
        <div className="h-screen flex items-center justify-center bg-white">
          <div className="text-gray-600">Loading users...</div>
        </div>
      );
    }

    if (usersError) {
      return (
        <div className="h-screen flex items-center justify-center bg-white">
          <div className="text-red-600">{usersError}</div>
        </div>
      );
    }

    if (users.length === 0) {
      return (
        <div className="h-screen flex flex-col items-center justify-center bg-white gap-4">
          <div className="text-gray-600">
            No users found in the database.
          </div>
          <div className="text-sm text-gray-500">
            Create users via POST /users in the backend.
          </div>
        </div>
      );
    }

    return <LoginScreen onLogin={handleLogin} users={users} />;
  }

  const currentUserHistory = userHistory[currentUser] || [];

  // If patients failed to load
  if (patientsError) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white gap-4">
        <div className="text-gray-600">
          Unable to load patients from the server.
        </div>
        <div className="text-sm text-gray-500">
          Please check the backend and the Data folder.
        </div>
      </div>
    );
  }

  // If still loading patients
  if (loadingPatients || !currentPatientId) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="text-gray-600">Loading patients and data...</div>
      </div>
    );
  }

  // ===========================
  // Main layout
  // ===========================
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 px-4 py-2 flex-none">
        <div className="flex items-center justify-between">
          <h1 className="text-gray-800 text-sm md:text-base">
            ICRA 2026 Paper Data Validation for LUS Contact Detection
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowChangePassword((prev) => !prev);
                setCpError(null);
                setCpSuccess(null);
              }}
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-md text-blue-700 text-xs md:text-sm transition-colors"
            >
              {showChangePassword ? "Close password panel" : "Change password"}
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 text-xs md:text-sm transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Change password panel */}
      {showChangePassword && (
        <div className="border-b border-gray-200 px-4 py-3 bg-gray-50 flex-none">
          <div className="max-w-xl">
            <h2 className="text-sm font-medium text-gray-800 mb-2">
              Change password for {currentUser}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
              <input
                type="password"
                placeholder="Current password"
                value={cpOld}
                onChange={(e) => setCpOld(e.target.value)}
                className="border border-gray-300 rounded-md px-2 py-1.5 text-sm w-full"
              />
              <input
                type="password"
                placeholder="New password"
                value={cpNew}
                onChange={(e) => setCpNew(e.target.value)}
                className="border border-gray-300 rounded-md px-2 py-1.5 text-sm w-full"
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={cpConfirm}
                onChange={(e) => setCpConfirm(e.target.value)}
                className="border border-gray-300 rounded-md px-2 py-1.5 text-sm w-full"
              />
            </div>
            {cpError && (
              <div className="text-xs text-red-600 mb-1">{cpError}</div>
            )}
            {cpSuccess && (
              <div className="text-xs text-green-600 mb-1">{cpSuccess}</div>
            )}
            <button
              onClick={handleChangePasswordSubmit}
              disabled={cpLoading}
              className="mt-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm rounded-md transition-colors"
            >
              {cpLoading ? "Updating..." : "Update password"}
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left panel */}
        <div className="w-50 border-r border-gray-200 p-2.5 flex-shrink-0 h-full overflow-y-auto space-y-2.5">
          <PatientSelector
            selectedPatient={currentPatientId}
            patients={patientIds}
            onSelectPatient={handlePatientChange}
            isPlaying={isPlaying}
          />
          <div className="pt-1.5 border-t border-gray-200">
            <ClassFilter
              selectedClass={currentClass}
              onSelectClass={handleClassFilter}
              isPlaying={isPlaying}
            />
          </div>
        </div>

        {/* Center panel */}
        <div className="flex-1 min-w-0 min-h-0 px-3 py-2 flex flex-col relative overflow-hidden">
          {jumpHighlight && (
            <div className="absolute top-3 left-1/2 transform -translate-x-1/2 z-20 bg-green-600 text-white px-6 py-2 rounded-md shadow-lg animate-pulse-subtle">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                </span>
                <span>Jumped to Sequence</span>
              </div>
            </div>
          )}

          {hasSequences ? (
            <div className="flex-1 min-h-0 flex flex-col justify-center space-y-1">
              <VideoPlayer
                originalLabel={currentSequence!.originalLabel}
                userCorrection={currentUserCorrection}
                isPlaying={isPlaying}
                isRepeating={isRepeating}
                videoUrl={currentSequence!.videoUrl}
                jumpHighlight={jumpHighlight}
                onVideoRef={(ref) => {
                  videoRef.current = ref;
                }}
                onEnded={handleVideoEnded}
              />

              <NavigationControls
                currentSequence={safeSequenceIndex + 1}
                totalSequences={totalSequences}
                isPlaying={isPlaying}
                onSequenceChange={handleSequenceChange}
                jumpHighlight={jumpHighlight}
              />

              <VideoControls
                isPlaying={isPlaying}
                isRepeating={isRepeating}
                onPlay={handlePlay}
                onPause={handlePause}
                onToggleRepeat={handleToggleRepeat}
                currentSequence={safeSequenceIndex + 1}
                totalSequences={totalSequences}
                onPrevious={handlePrevSequence}
                onNext={handleNextSequence}
              />

              <CorrectionSelector
                originalLabel={currentSequence!.originalLabel}
                userCorrection={currentUserCorrection}
                onSelectCorrection={handleCorrectionSelect}
                isPlaying={isPlaying}
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <p className="text-lg">No sequences in this class</p>
                <p className="text-sm mt-2">
                  Select a different class or patient to continue
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right panel - history */}
        {isHistoryVisible && (
          <div className="w-80 border-l border-gray-200 flex flex-col flex-shrink-0">
            <div className="p-2.5 border-b border-gray-200 flex-none flex items-center justify-between">
              <p className="text-gray-700 font-medium">{currentUser}</p>
              <button
                onClick={() => setIsHistoryVisible(false)}
                className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-600 transition-colors font-medium"
              >
                Hide History
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <HistoryLog
                entries={currentUserHistory}
                onSelectEntry={handleHistoryEntryClick}
                onDeleteEntry={handleDeleteHistoryEntry}
              />
            </div>
          </div>
        )}

        {!isHistoryVisible && (
          <button
            onClick={() => setIsHistoryVisible(true)}
            className="fixed top-1/2 right-4 transform -translate-y-1/2 px-3 py-8 bg-blue-600 hover:bg-blue-700 text-white rounded-l-md shadow-lg transition-colors z-10 font-medium"
            style={{ writingMode: "vertical-rl" }}
          >
            Show History
          </button>
        )}
      </div>
    </div>
  );
}

