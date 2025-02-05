import { nodeResolve } from '@rollup/plugin-node-resolve';
// import commonjs from '@rollup/plugin-commonjs';
import cleanup from 'rollup-plugin-cleanup';
import replace from '@rollup/plugin-replace';

const config = {
  input: 'demo/demo.js',
  output: {
    // dir: 'demo',
    file: 'demo/tool.js',
    format: 'es',
    name: 'AudioMIDI',
    sourcemap: false,
    preserveModules: false,
    inlineDynamicImports: true,
  },
  plugins: [
    nodeResolve({
      mainFields: ['module', 'main'],
    }),
    replace({
      'process.env.UTTORI_DATA_DEBUG': 'false',
      'process.env.UTTORI_AUDIOMIDI_DEBUG': 'false',
      delimiters: ['', ''],
      preventAssignment: true,
    }),
    // commonjs(),
    cleanup({
      comments: 'none',
    }),
  ],
};

export default config;
