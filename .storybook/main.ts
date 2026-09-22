import type { StorybookConfig } from '@storybook/react-vite';

export default {
  framework: '@storybook/react-vite',
  stories: ['../demo/**/*.stories.tsx'],
  addons: ['@storybook/addon-a11y'],
} satisfies StorybookConfig;
