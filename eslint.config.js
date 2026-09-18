import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // scripts/ corre en Node (console, process), no en el browser.
  { ignores: ['dist', 'node_modules', 'scripts', 'preview-shots'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
  },
);
