/**
 * ref和reactive的区别
 * reactive内部采用的是proxy，而ref内部使用的是defineProperty
 * reactive处理不了基本类型，ref可以处理基本类型
 */
export function ref(value) {
  // value是一个普通类型，也可以是对象，但是一般情况下是对象直接用reactive更合理
  // 将普通类型变成一个对象
  return createRef(value);
}

export function shallowRef(value) {
  return createRef(value, true);
}

// 后续 看vue的源码，基本都是高阶函数，做了类似柯里化的操作

class RefImpl {
  public _value; // 表示 声明了一个_value属性，但是没有赋值
  public __v_isRef = true; // 产生的实例会被添加__v_isRef 表示是一个ref属性
  constructor(public rawValue, public shallow) {
    //参数中前面增加修饰符 表示此属性放到了实例上, 不加public，就不会放到this上
  }
}

function createRef(rawValue, shallow = false) {
  return new RefImpl(rawValue, shallow);
}
