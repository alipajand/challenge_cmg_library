import { readFileSync } from 'node:fs';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App.tsx';

const sampleLog = readFileSync(new URL('public/sample.log', import.meta.url), 'utf8');

function logFile(contents: string, name: string) {
  return new File([contents], name, { type: 'text/plain' });
}

test('shows one row per sensor after a log is chosen', async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.upload(screen.getByLabelText('Log file'), logFile(sampleLog, 'sample.log'));

  const table = await screen.findByRole('table', { name: 'Results for sample.log' });
  expect(within(table).getAllByRole('row')).toHaveLength(7);
  for (const row of [
    'temp-1 precise',
    'temp-2 ultra precise',
    'hum-1 keep',
    'hum-2 discard',
    'mon-1 keep',
    'mon-2 discard',
  ]) {
    expect(within(table).getByRole('row', { name: row })).toBeInTheDocument();
  }
  expect(screen.getByRole('status')).toHaveTextContent('Classified 6 sensors from sample.log.');
});

test('shows an alert with the line number for a broken log', async () => {
  const user = userEvent.setup();
  render(<App />);
  const brokenLog = 'reference 70.0 45.0 6\nthermometer temp-1\n2007-04-05T22:00 hot\n';

  await user.upload(screen.getByLabelText('Log file'), logFile(brokenLog, 'broken.log'));

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'broken.log could not be evaluated. Line 3: "hot" is not a number.',
  );
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
});

test('replaces earlier results when a broken log is chosen', async () => {
  const user = userEvent.setup();
  render(<App />);
  const input = screen.getByLabelText('Log file');

  await user.upload(input, logFile(sampleLog, 'sample.log'));
  await screen.findByRole('table');
  await user.upload(input, logFile('thermometer temp-1\n', 'broken.log'));

  expect(await screen.findByRole('alert')).toHaveTextContent('Line 1:');
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
});
