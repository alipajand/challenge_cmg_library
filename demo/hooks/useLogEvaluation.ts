import { useCallback, useEffect, useRef, useState } from 'react';
import { evaluateLogStream, type Classification } from '../../src/index.ts';

export type LogEvaluation =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; fileName: string; results: Record<string, Classification> }
  | { status: 'error'; fileName: string; message: string };

const SAMPLE_LOG_NAME = 'sample.log';

async function fetchSampleLog(): Promise<File> {
  const response = await fetch(`${import.meta.env.BASE_URL}${SAMPLE_LOG_NAME}`);
  if (!response.ok) {
    throw new Error(`The request failed with HTTP ${response.status}.`);
  }
  return new File([await response.blob()], SAMPLE_LOG_NAME, { type: 'text/plain' });
}

export function useLogEvaluation() {
  const [state, setState] = useState<LogEvaluation>({ status: 'idle' });
  const currentRun = useRef<AbortController>(null);

  useEffect(() => () => currentRun.current?.abort(), []);

  const run = useCallback(async (fileName: string, getFile: () => Promise<File>) => {
    currentRun.current?.abort();
    const controller = new AbortController();
    currentRun.current = controller;
    setState({ status: 'loading' });

    try {
      const file = await getFile();
      const text = file.stream().pipeThrough(new TextDecoderStream(), {
        signal: controller.signal,
      });
      const results = await evaluateLogStream(text);
      if (!controller.signal.aborted) {
        setState({ status: 'success', fileName, results });
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        const message = error instanceof Error ? error.message : String(error);
        setState({ status: 'error', fileName, message });
      }
    }
  }, []);

  const evaluate = useCallback((file: File) => run(file.name, async () => file), [run]);
  const evaluateSample = useCallback(() => run(SAMPLE_LOG_NAME, fetchSampleLog), [run]);

  return { state, evaluate, evaluateSample };
}
