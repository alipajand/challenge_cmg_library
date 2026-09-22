import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LogFileInput } from './LogFileInput.tsx';

test('has a labelled file input described by the accepted formats', () => {
  render(<LogFileInput onFileSelect={jest.fn()} onUseSample={jest.fn()} />);

  const input = screen.getByLabelText('Log file');
  expect(input).toHaveAttribute('type', 'file');
  expect(input).toHaveAccessibleDescription(
    'A plain-text .log or .txt file that starts with a reference line.',
  );
});

test('passes the chosen file to onFileSelect', async () => {
  const user = userEvent.setup();
  const onFileSelect = jest.fn();
  const file = new File(['reference 70.0 45.0 6\n'], 'room-1.log', { type: 'text/plain' });
  render(<LogFileInput onFileSelect={onFileSelect} onUseSample={jest.fn()} />);

  await user.upload(screen.getByLabelText('Log file'), file);

  expect(onFileSelect).toHaveBeenCalledWith(file);
});

test('lets the same file be chosen again', async () => {
  const user = userEvent.setup();
  const onFileSelect = jest.fn();
  const file = new File(['reference 70.0 45.0 6\n'], 'room-1.log', { type: 'text/plain' });
  render(<LogFileInput onFileSelect={onFileSelect} onUseSample={jest.fn()} />);
  const input = screen.getByLabelText('Log file');

  await user.upload(input, file);
  await user.upload(input, file);

  expect(onFileSelect).toHaveBeenCalledTimes(2);
});

test('calls onUseSample when "Use sample log" is pressed', async () => {
  const user = userEvent.setup();
  const onFileSelect = jest.fn();
  const onUseSample = jest.fn();
  render(<LogFileInput onFileSelect={onFileSelect} onUseSample={onUseSample} />);

  await user.click(screen.getByRole('button', { name: 'Use sample log' }));

  expect(onUseSample).toHaveBeenCalledTimes(1);
  expect(onFileSelect).not.toHaveBeenCalled();
});
