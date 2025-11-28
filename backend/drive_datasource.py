from __future__ import annotations

import io
from dataclasses import dataclass
from functools import lru_cache
from typing import List, Dict, Any, Optional, Iterable

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload

from settings import settings

# Scopes: read-only is enough
DRIVE_SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]


@dataclass
class DriveVideo:
  patient_id: str           # e.g. "Patient_1"
  class_id: str             # "H-LUS" | "C-LUS" | "I-LUS"
  file_id: str              # Drive file id
  file_name: str            # e.g. "class0_window0.mp4"


class DriveDataSource:
  def __init__(self, root_folder_id: str, creds_path: str):
    self.root_folder_id = root_folder_id
    self.creds_path = creds_path
    self.service = self._build_service()

  def _build_service(self):
    creds = service_account.Credentials.from_service_account_file(
      self.creds_path,
      scopes=DRIVE_SCOPES,
    )
    return build("drive", "v3", credentials=creds)

  def _list_children_folders(self, parent_id: str) -> List[Dict[str, Any]]:
    """List child folders under a parent folder."""
    query = (
      f"'{parent_id}' in parents and mimeType = 'application/vnd.google-apps.folder' "
      "and trashed = false"
    )
    children: List[Dict[str, Any]] = []
    page_token: Optional[str] = None

    try:
      while True:
        resp = (
          self.service.files()
          .list(
            q=query,
            spaces="drive",
            fields="nextPageToken, files(id, name)",
            pageToken=page_token,
          )
          .execute()
        )
        children.extend(resp.get("files", []))
        page_token = resp.get("nextPageToken")
        if not page_token:
          break
    except Exception as e:
      # Network / SSL / transient Drive error.
      # Log and return what we have (or empty list).
      print(f"[Drive] folder listing error for parent {parent_id}: {e}")
      return []

    return children


  def _list_children_files(self, parent_id: str, mime_type: Optional[str] = None) -> List[Dict[str, Any]]:
    """List child files (not folders) under a parent folder, optionally filtering by mimeType."""
    q_parts = [f"'{parent_id}' in parents", "trashed = false", "mimeType != 'application/vnd.google-apps.folder'"]
    if mime_type:
      q_parts.append(f"mimeType = '{mime_type}'")
    query = " and ".join(q_parts)

    files: List[Dict[str, Any]] = []
    page_token: Optional[str] = None

    try:
      while True:
        resp = (
          self.service.files()
          .list(
            q=query,
            spaces="drive",
            fields="nextPageToken, files(id, name, mimeType)",
            pageToken=page_token,
          )
          .execute()
        )
        files.extend(resp.get("files", []))
        page_token = resp.get("nextPageToken")
        if not page_token:
          break
    except Exception as e:
      print(f"[Drive] file listing error for parent {parent_id}: {e}")
      return []

    return files


  # =============================
  # Public API used by FastAPI
  # =============================

  def list_patients(self) -> List[str]:
    """
    Each direct subfolder of the root folder is a patient.
    Returns the folder names, which we treat as patient IDs.
    """
    folders = self._list_children_folders(self.root_folder_id)
    # e.g. "Patient_1", "Patient_2", etc.
    return sorted(f["name"] for f in folders)

  def list_classes(self, patient_id: str) -> List[str]:
    """
    Assumes patient_id is the folder name of a direct child of root.
    Inside each patient folder, we expect exactly three folders:
    H-LUS, C-LUS, I-LUS.
    """
    patient_folder = self._find_child_folder_by_name(self.root_folder_id, patient_id)
    if not patient_folder:
      return []

    class_folders = self._list_children_folders(patient_folder["id"])
    class_names = [f["name"] for f in class_folders]
    # We only keep H-LUS, C-LUS, I-LUS in predictable order
    valid = ["H-LUS", "C-LUS", "I-LUS"]
    return [c for c in valid if c in class_names]

  def list_videos(self, patient_id: str, class_id: str) -> List[DriveVideo]:
    """
    Inside patient folder, inside class folder, list all .mp4 files.
    """
    patient_folder = self._find_child_folder_by_name(self.root_folder_id, patient_id)
    if not patient_folder:
      return []

    class_folder = self._find_child_folder_by_name(patient_folder["id"], class_id)
    if not class_folder:
      return []

    # mp4 files
    files = self._list_children_files(class_folder["id"])
    videos: List[DriveVideo] = []

    for f in files:
      name = f["name"]
      if not name.lower().endswith(".mp4"):
        continue
      videos.append(
        DriveVideo(
          patient_id=patient_id,
          class_id=class_id,
          file_id=f["id"],
          file_name=name,
        )
      )

    # Sort by name so sequences play in order
    videos.sort(key=lambda v: v.file_name)
    return videos

  def download_video_stream(self, file_id: str, chunk_size: int = 1024 * 1024):
    """
    Generator that yields chunks of the video file from Drive.

    We wrap the chunk download in a try/except so that if the client
    disconnects (or an SSL error occurs mid-stream), we simply stop
    iterating instead of crashing the response.
    """
    request = self.service.files().get_media(fileId=file_id)
    fh = io.BytesIO()
    downloader = MediaIoBaseDownload(fh, request, chunksize=chunk_size)
    done = False

    try:
      while not done:
        status, done = downloader.next_chunk()
        data = fh.getvalue()
        if data:
          yield data
          fh.seek(0)
          fh.truncate(0)
    except Exception as e:
      # Most often this happens when the client closes the connection
      # (user navigates away, switches class, etc.), or a transient SSL issue.
      # We just stop streaming and let the response end gracefully.
      print(f"[Drive] streaming error for file {file_id}: {e}")
      return


  # =============================
  # Helpers
  # =============================

  def _find_child_folder_by_name(self, parent_id: str, name: str) -> Optional[Dict[str, Any]]:
    folders = self._list_children_folders(parent_id)
    for f in folders:
      if f["name"] == name:
        return f
    return None


# Provide a shared singleton for FastAPI
@lru_cache(maxsize=1)
def get_drive_datasource() -> DriveDataSource:
  root_id = settings.drive_data_root_id
  creds_path = settings.google_application_credentials
  return DriveDataSource(root_folder_id=root_id, creds_path=creds_path)
