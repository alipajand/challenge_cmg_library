import { render, screen, within } from '@testing-library/react';
import { ResultsTable } from './ResultsTable.tsx';

test('renders a captioned table with a header row and one row per sensor', () => {
  render(
    <ResultsTable
      caption="Results for sample.log"
      results={{ 'temp-1': 'precise', 'hum-2': 'discard', 'mon-1': 'keep' }}
    />,
  );

  const table = screen.getByRole('table', { name: 'Results for sample.log' });
  expect(within(table).getByRole('columnheader', { name: 'Sensor' })).toBeInTheDocument();
  expect(within(table).getByRole('columnheader', { name: 'Classification' })).toBeInTheDocument();
  expect(within(table).getAllByRole('row')).toHaveLength(4);
});

test('uses the sensor name as the row header and shows the classification as text', () => {
  render(<ResultsTable caption="Results" results={{ 'hum-2': 'discard' }} />);

  const row = screen.getByRole('row', { name: 'hum-2 discard' });
  expect(within(row).getByRole('rowheader', { name: 'hum-2' })).toBeInTheDocument();
  expect(within(row).getByRole('cell', { name: 'discard' })).toBeInTheDocument();
});

test('renders sensor names as text, not markup', () => {
  const name = '<img src=x onerror=alert(1)>';
  render(<ResultsTable caption="Results" results={{ [name]: 'keep' }} />);

  expect(screen.getByRole('rowheader', { name })).toBeInTheDocument();
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
});
