import type { Meta, StoryObj } from '@storybook/react-vite';
import { ResultsTable } from './ResultsTable.tsx';

const meta = { component: ResultsTable } satisfies Meta<typeof ResultsTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SampleResults: Story = {
  args: {
    caption: 'Results for sample.log',
    results: {
      'temp-1': 'precise',
      'temp-2': 'ultra precise',
      'hum-1': 'keep',
      'hum-2': 'discard',
      'mon-1': 'keep',
      'mon-2': 'discard',
    },
  },
};

export const SingleSensor: Story = {
  args: {
    caption: 'Results for hum-1.log',
    results: { 'hum-1': 'keep' },
  },
};
