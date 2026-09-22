import { readFileSync } from 'node:fs';
import { evaluateLogFile, evaluateLogStream } from './index.ts';

const sampleLog = readFileSync(new URL('../demo/public/sample.log', import.meta.url), 'utf8');

const sampleOutput = {
  'temp-1': 'precise',
  'temp-2': 'ultra precise',
  'hum-1': 'keep',
  'hum-2': 'discard',
  'mon-1': 'keep',
  'mon-2': 'discard',
};

function streamOf(chunks: string[]): ReadableStream<string> {
  return new ReadableStream({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(chunk));
      controller.close();
    },
  });
}

test('evaluateLogFile returns the sample output from the brief', () => {
  expect(Object.entries(evaluateLogFile(sampleLog))).toEqual(Object.entries(sampleOutput));
});

describe('evaluateLogStream', () => {
  test('gives the same result when the sample arrives one character at a time', async () => {
    await expect(evaluateLogStream(streamOf(Array.from(sampleLog)))).resolves.toEqual(
      sampleOutput,
    );
  });

  test('gives the same result when a line is split in the middle of a number', async () => {
    const splitAt = sampleLog.indexOf('72.4') + 2;
    const chunks = [sampleLog.slice(0, splitAt), sampleLog.slice(splitAt)];

    expect(chunks[0].endsWith('72')).toBe(true);
    await expect(evaluateLogStream(streamOf(chunks))).resolves.toEqual(sampleOutput);
  });

  test.each([
    ['LF', sampleLog],
    ['CRLF', sampleLog.replaceAll('\n', '\r\n')],
  ])('gives the same result for every two-chunk split of the %s sample', async (_, log) => {
    for (let splitAt = 0; splitAt <= log.length; splitAt += 1) {
      const chunks = [log.slice(0, splitAt), log.slice(splitAt)];
      await expect(evaluateLogStream(streamOf(chunks))).resolves.toEqual(sampleOutput);
    }
  });

  test('rejects with the line number and stops reading after a parse error', async () => {
    let chunksRead = 0;
    const stream = new ReadableStream<string>({
      pull(controller) {
        chunksRead += 1;
        controller.enqueue(
          chunksRead === 1 ? 'reference 70.0 45.0 6\nhumidity hum-1\n' : '2007-04-05T22:04 wet\n',
        );
      },
    });

    await expect(evaluateLogStream(stream)).rejects.toThrow(
      new Error('Line 3: "wet" is not a number.'),
    );
    expect(chunksRead).toBeLessThan(5);
  });

  test('stops reading a line with no newline once it passes 1000 characters', async () => {
    let chunksRead = 0;
    const stream = new ReadableStream<string>({
      pull(controller) {
        chunksRead += 1;
        if (chunksRead > 1000) {
          controller.close();
        } else {
          controller.enqueue(chunksRead === 1 ? 'reference 70.0 45.0 6\n' : 'x'.repeat(1024));
        }
      },
    });

    await expect(evaluateLogStream(stream)).rejects.toThrow(
      new Error('Line 2: The line is longer than 1000 characters.'),
    );
    expect(chunksRead).toBeLessThan(5);
  });
});
