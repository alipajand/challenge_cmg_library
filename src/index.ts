import { LogParser } from './LogParser.ts';
import type { Classification } from './types.ts';

export type { Classification } from './types.ts';

export function evaluateLogFile(logContentsStr: string): Record<string, Classification> {
  const parser = new LogParser();
  parser.push(logContentsStr);
  return parser.finish();
}

export async function evaluateLogStream(
  stream: ReadableStream<string>,
): Promise<Record<string, Classification>> {
  const parser = new LogParser();
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      return parser.finish();
    }
    try {
      parser.push(value);
    } catch (error) {
      await reader.cancel();
      throw error;
    }
  }
}
