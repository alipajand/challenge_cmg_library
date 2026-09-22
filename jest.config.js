const transform = {
  '^.+\\.tsx?$': [
    '@swc/jest',
    {
      jsc: {
        transform: {
          react: { runtime: 'automatic' },
          optimizer: { globals: { vars: { 'import.meta.env.BASE_URL': '"/"' } } },
        },
      },
    },
  ],
};

export default {
  projects: [
    {
      displayName: 'lib',
      testEnvironment: 'node',
      roots: ['<rootDir>/src'],
      transform,
    },
    {
      displayName: 'demo',
      testEnvironment: 'jsdom',
      roots: ['<rootDir>/demo'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
      transform,
    },
  ],
};
