import { useState } from 'react';

export interface UseExportFormatQualityReturn {
  format: string;
  setFormat: (format: string) => void;
  quality: number;
  setQuality: (quality: number) => void;
  driveUploadEnabled: boolean;
  setDriveUploadEnabled: (enabled: boolean) => void;
}

export function useExportFormatQuality(): UseExportFormatQualityReturn {
  const [format, setFormat] = useState('png');
  const [quality, setQuality] = useState(90);
  const [driveUploadEnabled, setDriveUploadEnabled] = useState(false);

  return {
    format,
    setFormat,
    quality,
    setQuality,
    driveUploadEnabled,
    setDriveUploadEnabled,
  };
}

export default useExportFormatQuality;
