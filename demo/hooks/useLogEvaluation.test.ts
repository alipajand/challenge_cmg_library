import { act, renderHook } from '@testing-library/react';
import { useLogEvaluation } from './useLogEvaluation.ts';

function logContents(sensor: string) {
  return `reference 70.0 45.0 6\nhumidity ${sensor}\n2007-04-05T22:04 45\n`;
}

function sampleResponse(sensor: string) {
  return { ok: true, blob: async () => new Blob([logContents(sensor)]) };
}

afterEach(() => {
  jest.restoreAllMocks();
  Reflect.deleteProperty(globalThis, 'fetch');
});

test('evaluates the sample log', async () => {
  const fetchSample = jest.fn().mockResolvedValue(sampleResponse('hum-1'));
  Object.assign(globalThis, { fetch: fetchSample });
  const { result } = renderHook(() => useLogEvaluation());

  await act(() => result.current.evaluateSample());

  expect(fetchSample).toHaveBeenCalledWith('/sample.log');
  expect(result.current.state).toEqual({
    status: 'success',
    fileName: 'sample.log',
    results: { 'hum-1': 'keep' },
  });
});

test('reports the file name and HTTP status when the sample log is missing', async () => {
  Object.assign(globalThis, { fetch: jest.fn().mockResolvedValue({ ok: false, status: 404 }) });
  const { result } = renderHook(() => useLogEvaluation());

  await act(() => result.current.evaluateSample());

  expect(result.current.state).toEqual({
    status: 'error',
    fileName: 'sample.log',
    message: 'The request failed with HTTP 404.',
  });
});

test('ignores a run that finishes after a newer one', async () => {
  let respond: (response: unknown) => void = () => {};
  const fetchSample = jest.fn(() => new Promise((resolve) => (respond = resolve)));
  Object.assign(globalThis, { fetch: fetchSample });
  const { result } = renderHook(() => useLogEvaluation());

  let sampleRun: Promise<void> = Promise.resolve();
  act(() => {
    sampleRun = result.current.evaluateSample();
  });
  await act(() => result.current.evaluate(new File([logContents('new')], 'new.log')));
  await act(async () => {
    respond(sampleResponse('old'));
    await sampleRun;
  });

  expect(result.current.state).toEqual({
    status: 'success',
    fileName: 'new.log',
    results: { new: 'keep' },
  });
});

test('aborts the current run when the component unmounts', () => {
  Object.assign(globalThis, { fetch: jest.fn(() => new Promise(() => {})) });
  const abort = jest.spyOn(AbortController.prototype, 'abort');
  const { result, unmount } = renderHook(() => useLogEvaluation());

  act(() => {
    void result.current.evaluateSample();
  });
  expect(abort).not.toHaveBeenCalled();
  unmount();

  expect(abort).toHaveBeenCalledTimes(1);
});
