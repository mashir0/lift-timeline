import nextPlugin from '@next/eslint-plugin-next';
import globals from 'globals';

export default [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'dist/**',
      'public/**'
    ]
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    plugins: {
      '@next/next': nextPlugin
    },
    rules: {
      'no-unused-vars': 'warn', // 未使用の変数を警告
      'no-console': 'warn', // console.logを警告
      'no-explicit-any': 'warn', // anyを警告
      'no-empty': 'warn', // 空のブロックを警告
      'no-extra-semi': 'warn', // 不要なセミコロンを警告
      'no-trailing-spaces': 'warn', // 行末のスペースを警告
      'quotes': ['warn', 'single'], // シングルクオーテーションを警告
      'semi': ['warn', 'always'], // セミコロンを警告
      '@next/next/no-html-link-for-pages': 'warn', // ページ間のリンクを警告
      '@next/next/no-img-element': 'warn' // img要素を警告
    }
  }
]; 