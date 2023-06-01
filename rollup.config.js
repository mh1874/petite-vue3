// rollup的配置

import path from 'path';
import json from '@rollup/plugin-json'; // rollup默认只能打包js文件，如果要打包json文件，需要使用这个插件
import resolvePlugin from '@rollup/plugin-node-resolve'; // 解析第三方模块
import ts from 'rollup-plugin-typescript2'; // 解析ts文件

// 根据环境变量中的target属性，获取对应模块中的 package.json

const packagesDir = path.resolve(__dirname, 'packages'); // 找到packages目录

// packageDir 打包的基准目录
const packageDir = path.resolve(packagesDir, process.env.TARGET); // 找到具体的包

// 永远针对的是某个模块
const resolve = (p) => path.resolve(packageDir, p); // 用于拼接绝对路径

const pkg = require(resolve('package.json')); // 拿到package.json
const name = path.basename(packageDir); // 拿到包的名字

// 对打包类型先做一个映射表，根据你提供的formats来格式化需要打包的内容
const outputConfigs = {
  'esm-bundler': {
    file: resolve(`dist/${name}.esm-bundler.js`),
    format: `es`,
  },
  cjs: {
    file: resolve(`dist/${name}.cjs.js`),
    format: `cjs`,
  },
  global: {
    file: resolve(`dist/${name}.global.js`),
    format: `iife`, // 立即执行函数
  },
};

const options = pkg.buildOptions; // 自己在package中定义的选项

function createConfig(format, output) {
  output.name = options.name; // 打包出来的名字
  output.sourcemap = true; // 生成sourcemap文件

  // 生成rollup的配置
  return {
    input: resolve(`src/index.ts`), // 打包的入口
    output,
    plugins: [
      json(),
      ts({
        tsconfig: path.resolve(__dirname, 'tsconfig.json'), // tsconfig.json的路径
      }),
      resolvePlugin(), // 解析第三方模块
    ],
  };
}

// rollup最终需要导出配置
export default options.formats.map((format) =>
  createConfig(format, outputConfigs[format])
); // 根据选项生成对应的配置
