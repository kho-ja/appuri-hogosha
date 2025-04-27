// https://docs.expo.dev/guides/using-eslint/
module.exports = {
  extends: ['expo', 'prettier'],
  plugins: ['prettier'],
  ignorePatterns: ['/dist/*'],
  rules: {
    'prettier/prettier': 'error',
  },
  settings: {
    'import/resolver': {
      typescript: {
        project: [
          './mobile-frontend/tsconfig.json', // <— your Expo app
          './tsconfig.json',
        ],
      },
    },
  },
};
