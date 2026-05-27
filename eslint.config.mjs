const nodeGlobals = {
  console: "readonly",
  process: "readonly",
};

export default [
  {
    ignores: ["node_modules/**"],
  },
  {
    files: ["eslint.config.mjs", "scripts/**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: nodeGlobals,
    },
    rules: {
      eqeqeq: "error",
      "no-constant-condition": "error",
      "no-undef": "error",
      "no-unreachable": "error",
      "no-unused-vars": "error",
      "valid-typeof": "error",
    },
  },
];
