## 一、`Vue3` 架构分析

[Source Code](https://github.com/vuejs/core/tree/main/packages)

![响应式API](./assets/vue3%E5%93%8D%E5%BA%94%E5%BC%8FAPI.png)

### 响应性 API 的实现原理

- 通过 Proxy（代理）：拦截对象中任意属性的变化，包括：属性值的读写、属性的添加、属性的删除等。
- 通过 Reflect（反射）：对被代理对象的属性进行操作。

## 相关知识点

### 1. reactivity > reactive

1. weakMap

   代理对象时，需判断如果某个对象已经被代理过了，就不要再次代理了
   这里使用内存空间，内存空间使用 weakMap，因为 weakMap 的 key 只能是对象,Map 的 key 可以是其他类型,但如果是对象会浪费一次引用，如果对象被清空了，Map 还会引用这个对象，会造成内存泄漏

2. ES6 `proxy` + `reflect`

   proxy + reflect 反射
   后续 Object 上的方法会被迁移到 Reflect 上， Object.getPrototypeOf => Reflect.getPrototypeOf
   以前 target[key] = value 方式设置值可能会失败，比如原型上有这个属性，但是设置不成功。并不会报异常，也没有返回值标识
   Reflect 方法具备返回值，返回值标识是否设置成功
   reflect 使用可以不使用 proxy 但是 proxy 必须配合 reflect 一起使用

   Reflect 对象经常和 Proxy 代理一起使用，原因有三点：

   1. Reflect 提供的所有静态方法和 Proxy 第 2 个 handler 参数方法是一模一样的。Reflect Api 有 13 个静态函数，这与 Proxy 设计是一一对应的。如果 Proxy 一个捕捉器想要将调用转发给对象，则只需使用相同的参数调用  Reflect.<method>  就足够了。这种映射在设计之初就是有意对称的。
   2. Proxy get/set()方法需要的返回值正是 Reflect 的 get/set 方法的返回值，可以天然配合使用，比直接对象赋值/获取值要更方便和准确。
   3. receiver 参数具有不可替代性。

   [Reference Document](https://juejin.cn/post/7077755456059342856)

3. sourceMap 调试
   tsconfig 需要打开 sourcemap 配置，不然找不到 sourcemap 文件
   打包输出的文件尾部存在标识 //# sourceMappingURL=reactivity.global.js.map

---

## 扩展知识点

### 1. Monorepo 介绍

管理项目代码的一种方式，在一个项目仓库（repo）中管理多个模块/包（package）

- 一个仓库可维护多个模块，不用到处找仓库
- 方便版本管理和依赖管理，模块之间引用、调用十分方便

`缺点：源代码拆分成多个包管理，仓库体积会变大`

packages 中包会默认在外层项目的 node_modules 中创建软链（快捷方式），方便本地调试，本地修改 package 时，会映射到 node_modules 中

相当于把项目下所有的包都放到 node_modules 下，方便相互引用

```
keyword： yarn workspace

idea：现有项目业务组件库 && 业务模块等 放到业务项目的package中 可行性？开发体验⬆️，项目体积增大是否在可接受范围内。

nexus npm package 目前使用npm管理，可替换为yarn。yarn 和 npm，还停留在解决包管理器问题的阶段

解决方案：可采用 pnpm + rush (a scalable monorepo manager for the web)
```

[Reference Document](https://github.com/worldzhao/blog/issues/9)

### 2. Package 配置扩展

```
main : 定义了 npm 包的入口文件，browser 环境和 node 环境均可使用

module : 定义 npm 包的 ESM 规范的入口文件，browser 环境和 node 环境均可使用

browser : 定义 npm 包在 browser 环境下的入口文件
```

加载优先级的流程图如下：

![加载优先级](./assets/%E6%89%93%E5%8C%85%E4%BC%98%E5%85%88%E7%BA%A7.png)

总结：

- 如果 npm 包导出的是 ESM 规范的包，使用 module
- 如果 npm 包只在 web 端使用，并且严禁在 server 端使用，使用 browser。
- 如果 npm 包只在 server 端使用，使用 main
- 如果 npm 包在 web 端和 server 端都允许使用，使用 browser 和 main

其他更加复杂的情况，如 npm 包需要提供 commonJS 与 ESM 等多个规范的多个代码文件，请参考上述使用场景或流程图
