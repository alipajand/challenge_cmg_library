import { useId, type ChangeEvent, type MouseEvent } from 'react';

interface LogFileInputProps {
  onFileSelect: (file: File) => void;
  onUseSample: () => void;
}

export function LogFileInput({ onFileSelect, onUseSample }: LogFileInputProps) {
  const inputId = useId();
  const hintId = useId();

  function handleClick(event: MouseEvent<HTMLInputElement>) {
    event.currentTarget.value = '';
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  }

  return (
    <div className="log-file-input">
      <label htmlFor={inputId}>Log file</label>
      <p id={hintId} className="hint">
        A plain-text .log or .txt file that starts with a reference line.
      </p>
      <input
        id={inputId}
        type="file"
        accept=".log,.txt,text/plain"
        aria-describedby={hintId}
        onClick={handleClick}
        onChange={handleChange}
      />
      <p className="sample-prompt">
        Don't have a log file?
        <button type="button" onClick={onUseSample}>
          Use sample log
        </button>
      </p>
    </div>
  );
}
