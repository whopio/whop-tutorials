import next from "eslint-config-next";

const eslintConfig = [
  ...next,
  {
    rules: {
      // eslint-plugin-react-hooks v7 (bundled with eslint-config-next 16)
      // ships React Compiler rules that flag some idiomatic patterns in this
      // project's hooks and forms. They don't affect the build or runtime, so
      // we surface them as warnings rather than blocking errors.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
    },
  },
];

export default eslintConfig;
