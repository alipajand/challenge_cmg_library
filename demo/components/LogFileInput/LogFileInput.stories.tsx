import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { LogFileInput } from './LogFileInput.tsx';

const meta = {
  component: LogFileInput,
  args: { onFileSelect: fn(), onUseSample: fn() },
} satisfies Meta<typeof LogFileInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
