# 第一章：Rust 基础（面向 Node.js 开发者）超详细版

> 从 JavaScript 到 Rust：逐行注释，彻底搞懂每个语法细节

## 本章目标

完成本章后，你将：
- 掌握 Rust 所有基础语法（比 Rust Book 更详细的注释）
- 彻底理解所有权、借用、生命周期
- 能够阅读和理解 OpenFang 的源码
- 写出符合 Rust 习惯的代码

---

## 目录

1. [Hello World 与基础语法](#1-hello-world-与基础语法)
2. [变量与常量](#2-变量与常量)
3. [数据类型详解](#3-数据类型详解)
4. [函数](#4-函数)
5. [控制流](#5-控制流)
6. [所有权系统](#6-所有权系统)
7. [借用与引用](#7-借用与引用)
8. [结构体与方法](#8-结构体与方法)
9. [枚举与模式匹配](#9-枚举与模式匹配)
10. [错误处理](#10-错误处理)
11. [泛型基础](#11-泛型基础)
12. [Trait（接口）](#12-trait接口)
13. [生命周期](#13-生命周期)
14. [闭包](#14-闭包)
15. [迭代器](#15-迭代器)
16. [模块系统](#16-模块系统)
17. [常用宏](#17-常用宏)
18. [动手练习](#18-动手练习)

---

## 1. Hello World 与基础语法

### 1.1 最简单的 Rust 程序

```rust
// 这是单行注释，和 JavaScript 一样用 //
/* 这是多行注释，和 JS 一样 */

// fn 是函数定义关键字（function 的缩写）
// main 是程序入口函数，每个可执行程序必须有且只有一个 main 函数
fn main() {
    // println! 是一个宏（注意后面的 !），用于打印到控制台
    // 宏在编译期展开，比普通函数更强大
    // "Hello, World!" 是字符串字面量，类型是 &str（字符串切片）
    println!("Hello, World!");

    // {} 是占位符，会被后面的参数替换
    // 这和 JavaScript 的模板字符串 ${} 类似，但语法不同
    let name = "OpenFang";
    println!("Hello, {}!", name);  // 输出: Hello, OpenFang!

    // 多个占位符
    let version = "0.3";
    println!("{} v{}", name, version);  // 输出: OpenFang v0.3

    // 带序号的占位符（可以重复使用）
    println!("{0} loves {1}, and {1} loves {0}", "Alice", "Bob");
    // 输出: Alice loves Bob, and Bob loves Alice

    // 命名参数（更清晰）
    println!("{project} v{version}", project="OpenFang", version="0.3");
}
```

### 1.2 语句与表达式

**JavaScript：** 几乎所有代码都是语句，返回值不严格
```javascript
let x = 5;  // 语句，返回 undefined
let y = (x = 6);  // y = 6，因为赋值表达式返回右边的值
```

**Rust：** 严格区分语句和表达式
```rust
fn main() {
    // let 是语句（statement），不返回值
    let x = 5;

    // 错误！let 不能用于赋值
    // let y = (let x = 5);  // ✗ 编译错误！

    // 代码块 {} 是表达式（expression），返回最后一个表达式的值
    let y = {
        let a = 3;      // 语句，不返回值
        let b = 4;      // 语句，不返回值
        a + b           // 表达式（注意没有分号！），返回值 7
    };  // y = 7

    println!("y = {}", y);  // 输出: y = 7

    // 带分号变成语句，返回 ()（空元组）
    let z = {
        let a = 3;
        let b = 4;
        a + b;          // 加了分号，变成语句，返回 ()
    };  // z = ()

    println!("z = {:?}", z);  // 输出: z = ()
}
```

**关键概念：**
- **语句（Statement）**：执行操作，不返回值。以分号 `;` 结尾
- **表达式（Expression）**：产生值。不以分号结尾（如果加分号就变成语句了）
- 函数体是代码块，返回最后一个表达式的值

---

## 2. 变量与常量

### 2.1 变量声明

```rust
fn main() {
    // ============================================
    // let - 声明不可变变量（默认）
    // ============================================

    // 声明变量 x，类型由编译器自动推断为 i32（32位有符号整数）
    let x = 5;
    println!("x = {}", x);  // 输出: x = 5

    // 尝试修改？错误！
    // x = 6;  // ✗ 编译错误：cannot assign twice to immutable variable

    // 可以重新声明（shadowing），创建一个新变量，同名但不同值/类型
    let x = x + 1;  // 新的 x，值为 6
    println!("x = {}", x);  // 输出: x = 6

    let x = "hello";  // 新的 x，类型是 &str，值为 "hello"
    println!("x = {}", x);  // 输出: x = hello

    // ============================================
    // let mut - 声明可变变量
    // ============================================

    // mut 是 mutable 的缩写，表示可变
    let mut y = 5;
    println!("y = {}", y);  // 输出: y = 5

    y = 6;  // ✓ 可以修改，因为声明了 mut
    println!("y = {}", y);  // 输出: y = 6

    // 但不能改变类型！
    // y = "hello";  // ✗ 编译错误：expected integer, found `&str`

    // ============================================
    // 显式类型标注
    // ============================================

    // 用冒号 : 标注类型，类似 TypeScript 的语法
    let a: i32 = 10;           // 32位有符号整数
    let b: f64 = 3.14;         // 64位浮点数
    let c: bool = true;        // 布尔值
    let d: char = 'A';         // 字符（Unicode，4字节）
    let e: &str = "hello";     // 字符串切片

    // 复杂类型
    let v: Vec<i32> = vec![1, 2, 3];  // 整数向量
    let arr: [i32; 3] = [1, 2, 3];     // 数组，长度为3
}
```

### 2.2 常量

```rust
// 常量在编译期确定，必须标注类型，命名规范是全大写下划线分隔
const MAX_COUNT: i32 = 100;        // 整型常量
const PI: f64 = 3.14159;           // 浮点常量
const GREETING: &str = "Hello";    // 字符串常量

// 常量可以在全局作用域定义
const SECONDS_IN_MINUTE: u32 = 60;
const MINUTES_IN_HOUR: u32 = 60;
const SECONDS_IN_HOUR: u32 = SECONDS_IN_MINUTE * MINUTES_IN_HOUR;  // 3600

fn main() {
    println!("Max count: {}", MAX_COUNT);
    println!("Seconds in hour: {}", SECONDS_IN_HOUR);

    // 常量在整个程序生命周期内有效，且不可变
    // MAX_COUNT = 200;  // ✗ 编译错误：cannot assign to this expression
}
```

---

## 3. 数据类型详解

### 3.1 标量类型（Scalar Types）

```rust
fn main() {
    // ============================================
    // 整数类型
    // ============================================

    // 有符号整数（可以表示负数）
    let a: i8 = -128;        // 8位，范围: -128 ~ 127
    let b: i16 = -32768;     // 16位，范围: -32768 ~ 32767
    let c: i32 = -2147483648;// 32位，范围: -2^31 ~ 2^31-1（默认类型）
    let d: i64 = -9223372036854775808; // 64位
    let e: i128 = 0;         // 128位，超大范围
    let f: isize = 0;        // 取决于架构，32位系统=i32，64位系统=i64

    // 无符号整数（只能表示正数）
    let g: u8 = 255;         // 8位，范围: 0 ~ 255
    let h: u16 = 65535;      // 16位，范围: 0 ~ 65535
    let i: u32 = 4294967295; // 32位（常用）
    let j: u64 = 18446744073709551615; // 64位
    let k: usize = 0;        // 用于索引和长度，与指针同宽

    // 整数字面量写法
    let decimal = 98_222;       // 十进制，下划线是视觉分隔符（98222）
    let hex = 0xff;             // 十六进制 = 255
    let octal = 0o77;           // 八进制 = 63
    let binary = 0b1111_0000;   // 二进制 = 240
    let byte = b'A';            // 字节（u8），只能是 ASCII 字符

    // ============================================
    // 浮点类型
    // ============================================

    let f1: f32 = 3.14;      // 32位浮点（单精度）
    let f2: f64 = 3.14159;   // 64位浮点（双精度，默认）

    // 科学计数法
    let f3 = 2.5e4;          // 2.5 × 10^4 = 25000
    let f4 = 1e-3;           // 0.001

    // 浮点数陷阱（和 JavaScript 一样！）
    let sum = 0.1 + 0.2;
    println!("0.1 + 0.2 = {}", sum);  // 不是精确的 0.3！

    // ============================================
    // 布尔类型
    // ============================================

    let t: bool = true;
    let f: bool = false;

    // 布尔运算
    let and = t && f;        // false（逻辑与）
    let or = t || f;         // true（逻辑或）
    let not = !t;            // false（逻辑非）

    // ============================================
    // 字符类型
    // ============================================

    let c1: char = 'A';              // ASCII 字符
    let c2: char = '中';             // Unicode 中文字符（4字节）
    let c3: char = '🦀';             // Emoji 也可以！
    let c4: char = '\u{1F600}';      // Unicode 转义 = 😀

    // 注意：char 是 Unicode 标量值，不是字符串
    // let c = "A";  // 这是 &str，不是 char
}
```

### 3.2 复合类型（Compound Types）

```rust
fn main() {
    // ============================================
    // 元组（Tuple）- 固定长度，可以包含不同类型
    // ============================================

    // 声明元组
    let tup: (i32, f64, &str) = (500, 6.4, "hello");

    // 解构（Destructuring）
    let (x, y, z) = tup;
    println!("x={}, y={}, z={}", x, y, z);

    // 用索引访问（用点号 .）
    let five_hundred = tup.0;   // 第一个元素
    let six_point_four = tup.1; // 第二个元素
    let hello = tup.2;          // 第三个元素

    // 单元类型（Unit Type）- 空元组
    let unit: () = ();          // 相当于 JavaScript 的 undefined/null

    // 函数如果没有返回值，就返回 ()
    fn returns_unit() {}        // 返回类型是 ()

    // ============================================
    // 数组（Array）- 固定长度，同类型元素
    // ============================================

    // 类型格式：[类型; 长度]
    let arr: [i32; 5] = [1, 2, 3, 4, 5];

    // 快速创建重复值的数组
    let zeros = [0; 5];         // [0, 0, 0, 0, 0]

    // 访问元素（和 JS 一样用方括号）
    let first = arr[0];         // 1
    let second = arr[1];        // 2

    // 数组长度（编译期确定）
    let len = arr.len();        // 5

    // 越界访问会 panic（运行时错误）
    // let out = arr[10];  // ✗ 运行时 panic！

    // 安全的访问方式
    let maybe = arr.get(10);    // 返回 Option<&i32> = None

    // ============================================
    // 切片（Slice）- 对数组或向量的引用
    // ============================================

    let arr = [10, 20, 30, 40, 50];

    // 创建切片（引用数组的一部分）
    let slice: &[i32] = &arr[1..3];  // [20, 30]，范围是左闭右开 [1,3)
    println!("slice = {:?}", slice);

    // 完整切片
    let full: &[i32] = &arr[..];     // 整个数组

    // 从开头或到结尾
    let start = &arr[..3];           // [10, 20, 30]
    let end = &arr[2..];             // [30, 40, 50]

    // ============================================
    // 字符串类型（这是重点！）
    // ============================================

    // 1. &str - 字符串切片（String Slice）
    //    指向字符串数据的不可变引用，通常指向字符串字面量或其他 String
    let s1: &str = "Hello";          // 字符串字面量，存储在二进制文件只读段
    let s2: &'static str = "World";  // 'static 生命周期，存活整个程序

    // 2. String - 堆分配的字符串，拥有所有权，可变
    let mut s3 = String::from("Hello");
    s3.push_str(", World!");         // 可以修改
    println!("{}", s3);              // Hello, World!

    // 3. 转换
    let s4: String = s1.to_string();     // &str -> String（拷贝数据到堆）
    let s5: &str = &s3;                  // String -> &str（借用）
    let s6: &str = &s3[..5];             // String 切片

    // 4. 字符串操作
    let s = String::from("Hello");
    let len = s.len();                   // 5（字节数，不是字符数）
    let is_empty = s.is_empty();         // false
    let contains = s.contains("ell");    // true
    let replaced = s.replace("l", "r");  // Herro（返回新字符串）

    // 遍历字符（Unicode 安全）
    for c in "你好".chars() {
        println!("{}", c);  // 输出: 你，然后 好
    }

    // 遍历字节
    for b in "Hi".bytes() {
        println!("{}", b);  // 输出: 72, 105（ASCII 码）
    }
}
```

### 3.3 Vector（动态数组）

```rust
fn main() {
    // Vec<T> 是动态数组，类似 JavaScript 的 Array，存储在堆上

    // 创建空向量
    let mut v1: Vec<i32> = Vec::new();

    // 用宏创建（常用）
    let mut v2 = vec![1, 2, 3];

    // 添加元素
    v1.push(1);              // 在末尾添加
    v1.push(2);

    // 访问元素
    let first = v1[0];       // 1（直接访问，越界会 panic）
    let maybe = v1.get(0);   // Some(&1)（安全访问，返回 Option）
    let none = v1.get(100);  // None

    // 修改元素
    v2[0] = 10;              // [10, 2, 3]

    // 移除元素
    let last = v2.pop();     // Some(3)，v2 变成 [10, 2]

    // 插入和删除（O(n) 操作，因为需要移动元素）
    v2.insert(1, 20);        // 在索引 1 插入 20，[10, 20, 2]
    v2.remove(0);            // 删除索引 0 的元素，[20, 2]

    // 长度和容量
    let len = v2.len();      // 2，当前元素数
    let cap = v2.capacity(); // 容量（>= len，超出会重新分配）

    // 遍历
    for i in &v2 {
        println!("{}", i);   // 借用遍历，不获取所有权
    }

    // 可变遍历
    for i in &mut v2 {
        *i += 10;            // * 是解引用，修改值
    }

    // 获取所有权遍历（v2 会被消耗，之后不能用）
    for i in v2 {
        println!("{}", i);
    }
    // println!("{:?}", v2);  // ✗ 编译错误：v2 已经被 move
}
```

---

## 4. 函数

### 4.1 基础函数定义

```rust
// fn 关键字定义函数
// 参数需要标注类型
// 返回值用 -> 指定（如果没有，默认返回 ()）

/// 这是一个文档注释（三个斜杠），会生成文档
/// 将两个整数相加
/// # Examples
/// ```
/// let result = add(2, 3);
/// assert_eq!(result, 5);
/// ```
fn add(a: i32, b: i32) -> i32 {
    // 最后一行是返回值（表达式，没有分号）
    a + b
    // 等价于: return a + b;
}

// 没有返回值的函数（返回 ()）
fn greet(name: &str) {
    println!("Hello, {}!", name);
    // 隐式返回 ()
}

// 显式返回 ()
fn do_nothing() -> () {
    // ...
}

// 早期返回
fn check_positive(num: i32) -> bool {
    if num < 0 {
        return false;  // 提前返回
    }
    // 隐式返回 true
    true
}

fn main() {
    let sum = add(5, 3);     // 调用函数
    println!("5 + 3 = {}", sum);  // 8

    greet("OpenFang");       // Hello, OpenFang!
}
```

### 4.2 参数传递方式

```rust
fn main() {
    // 1. 值传递（Copy 类型）- 直接复制值
    let x = 5;
    takes_copy(x);           // x 被复制一份传给函数
    println!("x = {}", x);   // ✓ 还能用，因为 i32 实现了 Copy trait

    // 2. 所有权转移（非 Copy 类型）
    let s = String::from("hello");
    takes_ownership(s);      // s 的所有权转移到函数
    // println!("{}", s);    // ✗ 编译错误：s 已经被 move

    // 3. 不可变借用
    let s2 = String::from("world");
    takes_borrow(&s2);       // 借用 s2，不转移所有权
    println!("{}", s2);      // ✓ 还能用

    // 4. 可变借用
    let mut s3 = String::from("hello");
    takes_mutable_borrow(&mut s3);  // 可变借用
    println!("{}", s3);      // ✓ 可能已被修改
}

// Copy trait 的类型（基本数值类型）
fn takes_copy(n: i32) {
    println!("{}", n);
} // n 被 drop，但原变量还有效

// 非 Copy 类型（如 String）
fn takes_ownership(s: String) {
    println!("{}", s);
} // s 被 drop，原变量失效

// 不可变借用
fn takes_borrow(s: &String) {
    println!("{}", s);
} // 借用结束，原变量仍然有效

// 可变借用
fn takes_mutable_borrow(s: &mut String) {
    s.push_str("!");
}
```

---

## 5. 控制流

### 5.1 if / else

```rust
fn main() {
    let number = 6;

    // if 表达式（注意：Rust 的条件必须是 bool，不会隐式转换）
    if number < 5 {
        println!("less than 5");
    } else if number < 10 {
        println!("between 5 and 10");  // 输出这个
    } else {
        println!("10 or more");
    }

    // if 是表达式，可以返回值
    let condition = true;
    let value = if condition { 5 } else { 6 };
    println!("value = {}", value);  // 5

    // 注意：两个分支必须返回相同类型
    // let x = if condition { 5 } else { "six" };  // ✗ 编译错误

    // 在 let 语句中使用 if
    let num = 10;
    let description = if num % 2 == 0 {
        "even"
    } else {
        "odd"
    };
    println!("{} is {}", num, description);
}
```

### 5.2 循环

```rust
fn main() {
    // ============================================
    // loop - 无限循环（必须用 break 退出）
    // ============================================

    let mut counter = 0;

    let result = loop {
        counter += 1;

        if counter == 10 {
            break counter * 2;  // break 可以返回值
        }
    };  // result = 20

    println!("result = {}", result);

    // 循环标签（用于嵌套循环）
    'outer: loop {
        println!("outer loop");

        loop {
            println!("inner loop");
            break 'outer;  // 跳出外层循环
        }
    }

    // ============================================
    // while - 条件循环
    // ============================================

    let mut num = 3;

    while num != 0 {
        println!("{}!", num);
        num -= 1;
    }
    println!("Liftoff!");

    // while 遍历数组（不推荐，用 for 更好）
    let arr = [10, 20, 30];
    let mut index = 0;
    while index < arr.len() {
        println!("value: {}", arr[index]);
        index += 1;
    }

    // ============================================
    // for - 迭代循环（最常用）
    // ============================================

    // 遍历范围（Range）
    // 1..4 表示 1, 2, 3（左闭右开）
    for i in 1..4 {
        println!("{}", i);  // 1, 2, 3
    }

    // 1..=4 表示 1, 2, 3, 4（包含结尾）
    for i in 1..=4 {
        println!("{}", i);  // 1, 2, 3, 4
    }

    // 反向迭代
    for i in (1..4).rev() {
        println!("{}", i);  // 3, 2, 1
    }

    // 遍历数组（推荐方式）
    let arr = [10, 20, 30];
    for element in arr {
        println!("value: {}", element);
    }

    // 带索引遍历
    for (index, value) in arr.iter().enumerate() {
        println!("index: {}, value: {}", index, value);
    }

    // 遍历字符串（按字符）
    for c in "hello".chars() {
        println!("{}", c);
    }

    // continue 和 break
    for i in 1..10 {
        if i % 2 == 0 {
            continue;  // 跳过偶数
        }
        if i > 5 {
            break;     // i > 5 时退出
        }
        println!("{}", i);  // 1, 3, 5
    }
}
```

---

## 6. 所有权系统

这是 Rust 最核心的概念，也是与 JavaScript 最大的区别。

### 6.1 所有权规则

```rust
// Rust 所有权的三条铁律：
//
// 1. 每个值都有一个所有者（owner）
// 2. 同一时间只能有一个所有者
// 3. 当所有者离开作用域，值会被自动丢弃（drop）

fn main() {
    // 作用域示例
    {
        let s = String::from("hello");  // s 进入作用域，成为所有者
        println!("{}", s);              // 可以使用 s
    }  // 作用域结束，s 被 drop，内存自动释放

    // println!("{}", s);  // ✗ 编译错误：s 已经不存在

    // ============================================
    // 所有权转移（Move）
    // ============================================

    let s1 = String::from("hello");
    let s2 = s1;  // s1 的所有权转移到 s2

    // println!("{}", s1);  // ✗ 编译错误：s1 的值已经被 move
    println!("{}", s2);     // ✓ s2 是新的所有者

    // ============================================
    // 克隆（Clone）- 深拷贝
    // ============================================

    let s1 = String::from("hello");
    let s2 = s1.clone();  // 深拷贝，堆上的数据也被复制

    println!("s1 = {}", s1);  // ✓ 还能用
    println!("s2 = {}", s2);  // s2 是独立的副本

    // ============================================
    // Copy trait - 栈上复制
    // ============================================

    // 基本类型实现了 Copy trait，赋值时会复制而不是移动
    let x = 5;
    let y = x;  // x 被复制（Copy），不是移动

    println!("x = {}, y = {}", x, y);  // ✓ 都能用

    // 哪些类型实现了 Copy？
    // - 所有整数类型（i32, u64 等）
    // - 所有浮点类型（f32, f64）
    // - 布尔类型（bool）
    // - 字符类型（char）
    // - 元组（如果所有元素都实现 Copy）
    // - 数组（如果元素实现 Copy）

    let tup1 = (1, 2, 3);
    let tup2 = tup1;  // Copy
    println!("{:?} {:?}", tup1, tup2);  // 都能用

    // String 和 Vec 等堆分配类型不实现 Copy
    let v1 = vec![1, 2, 3];
    let v2 = v1;  // Move
    // println!("{:?}", v1);  // ✗ 编译错误
}
```

### 6.2 所有权与函数

```rust
fn main() {
    let s = String::from("hello");

    takes_ownership(s);      // s 的所有权转移到函数
    // s 在这里无效

    let x = 5;
    makes_copy(x);           // x 被 Copy
    println!("x = {}", x);   // ✓ x 还能用

    // ============================================
    // 返回值与所有权
    // ============================================

    let s1 = gives_ownership();           // 返回值的所有权给 s1
    let s2 = String::from("hello");
    let s3 = takes_and_gives_back(s2);    // s2 的所有权转移到函数，然后返回给 s3

    println!("s1 = {}", s1);
    // println!("s2 = {}", s2);  // ✗ s2 被 move
    println!("s3 = {}", s3);
}

fn takes_ownership(s: String) {
    println!("{}", s);
} // s 被 drop

fn makes_copy(i: i32) {
    println!("{}", i);
} // i 被 drop，但原变量还有效（Copy）

fn gives_ownership() -> String {
    let s = String::from("yours");
    s  // 返回 s，所有权转移给调用者
}

fn takes_and_gives_back(s: String) -> String {
    println!("{}", s);
    s  // 返回 s，所有权还给调用者
}
```

---

## 7. 借用与引用

### 7.1 引用基础

```rust
fn main() {
    let s1 = String::from("hello");

    // 借用：获取引用，不获取所有权
    let len = calculate_length(&s1);  // & 表示引用

    println!("'{}' 的长度是 {}", s1, len);  // ✓ s1 还能用

    // ============================================
    // 可变引用
    // ============================================

    let mut s = String::from("hello");
    change(&mut s);  // &mut 表示可变引用
    println!("{}", s);  // "hello, world"
}

fn calculate_length(s: &String) -> usize {
    s.len()
} // s 是引用，不拥有所有权，所以不会被 drop，原变量仍然有效

fn change(s: &mut String) {
    s.push_str(", world");
}
```

### 7.2 借用规则

```rust
fn main() {
    // ============================================
    // 规则 1：同一时间只能有一个可变引用
    // ============================================

    let mut s = String::from("hello");

    let r1 = &mut s;
    // let r2 = &mut s;  // ✗ 编译错误：不能同时有两个可变引用

    println!("{}", r1);

    // r1 在这里不再使用，可以创建新的可变引用
    let r2 = &mut s;
    println!("{}", r2);

    // ============================================
    // 规则 2：不能同时有可变引用和不可变引用
    // ============================================

    let mut s = String::from("hello");

    let r1 = &s;      // 不可变引用
    let r2 = &s;      // ✓ 可以有多个不可变引用
    // let r3 = &mut s;  // ✗ 编译错误：不能在有不可变引用时创建可变引用

    println!("{} {}", r1, r2);

    // r1, r2 在这里不再使用
    let r3 = &mut s;  // ✓ 现在可以创建可变引用了
    println!("{}", r3);

    // ============================================
    // 规则 3：引用必须始终有效
    // ============================================

    // let reference_to_nothing = dangle();  // ✗ 编译错误
}

// 悬垂引用（Dangling Reference）- Rust 会阻止
// fn dangle() -> &String {
//     let s = String::from("hello");
//     &s  // ✗ 编译错误：s 会在函数结束时被 drop
// }       // 返回的引用将指向无效的内存！

// 正确的做法：返回所有权
fn no_dangle() -> String {
    let s = String::from("hello");
    s  // 返回所有权，不是引用
}
```

### 7.3 引用与切片

```rust
fn main() {
    let s = String::from("hello world");

    // 字符串切片
    let hello = &s[0..5];   // 引用 s 的前 5 个字节
    let world = &s[6..11];  // 引用 s 的第 6-10 个字节

    println!("{} {}", hello, world);  // hello world

    // 省略语法
    let slice1 = &s[0..2];   // 从头开始
    let slice2 = &s[..2];    // 同上

    let slice3 = &s[3..len]; // 到结尾
    let slice4 = &s[3..];    // 同上

    let slice5 = &s[0..len]; // 整个字符串
    let slice6 = &s[..];     // 同上

    // 字符串字面量就是切片
    let s: &str = "hello";  // &str 是字符串切片的类型

    // 数组切片
    let arr = [1, 2, 3, 4, 5];
    let slice = &arr[1..3];  // [2, 3]
}
```

---

## 7.4 引用的内存本质

```rust
// ============================================
// 值 vs 引用 的内存布局对比
// ============================================

fn memory_layout_demo() {
    // 情况 1：普通值（拥有所有权）
    let x: i32 = 42;
    // 内存：栈上直接存储值 [42]
    //
    // 栈：
    // ┌─────────┐
    // │ x: 42   │  ← 4 字节
    // └─────────┘

    // 情况 2：引用（借用）
    let r: &i32 = &x;
    // 内存：栈上存储指针（地址），指向 x
    //
    // 栈：
    // ┌─────────┐
    // │ x: 42   │ ← 0x1000 (假设地址)
    // ├─────────┤
    // │ r: ─────┼───┐  ← 8 字节（64位指针）
    // └─────────┘   │
    //               ▼
    //            0x1000

    // 情况 3：String（堆分配）
    let s = String::from("hello");
    // 内存：栈上存指针+长度+容量，堆上存实际数据
    //
    // 栈：                    堆：
    // ┌─────────────┐        ┌─────────┐
    // │ ptr: ───────┼───────►│ h e l l │
    // │ len: 5      │        │ o       │
    // │ cap: 5      │        └─────────┘
    // └─────────────┘

    // 情况 4：引用 String
    let r: &String = &s;
    // 栈上只多一个指针，指向 String 的栈内存
    //
    // ┌─────────────┐
    // │ s: String   │ ← 24 字节 (ptr+len+cap)
    // ├─────────────┤
    // │ r: ─────────┼───┐ ← 8 字节指针
    // └─────────────┘   │
    //                   ▼
    //               s 的栈内存地址
}

// ============================================
// 从汇编层面理解
// ============================================

fn assembly_level() {
    let x = 42;
    let r = &x;

    // 实际生成的汇编类似：
    // mov dword ptr [rsp+4], 42      ; x = 42，直接写栈
    // lea rax, [rsp+4]                ; rax = &x，取地址
    // mov qword ptr [rsp+12], rax     ; r = rax，存指针

    // 解引用 *r
    let v = *r;
    // mov rax, [rsp+12]               ; rax = r (指针值)
    // mov eax, [rax]                  ; eax = *rax (解引用)
    // mov [rsp+20], eax               ; v = eax
}

// ============================================
// 胖指针（Fat Pointer）- 切片和 Trait 对象
// ============================================

fn fat_pointers() {
    let arr = [1, 2, 3, 4, 5];
    let slice: &[i32] = &arr[1..3];
    // 胖指针 = 两个机器字（16字节）
    // - 第一个字：数据指针（指向 arr[1]）
    // - 第二个字：长度（2）
    //
    // 栈：
    // ┌──────────────┐
    // │ ptr: &arr[1] │ ← 8 字节
    // │ len: 2       │ ← 8 字节
    // └──────────────┘
    // 总大小：16 字节

    // Trait 对象也是胖指针
    trait Drawable { fn draw(&self); }
    let obj: &dyn Drawable = /* ... */;
    // 胖指针：
    // - 第一个字：数据指针
    // - 第二个字：vtable 指针（指向方法表）
}

// ============================================
// 总结：三者的本质区别
// ============================================

// 1. 普通值（T）
//    - 内存：存储实际数据
//    - 位置：栈或堆（取决于类型）
//    - 所有权：拥有
//    - 大小：sizeof(T)

// 2. 引用（&T / &mut T）
//    - 内存：存储地址（指针）
//    - 位置：只在栈上
//    - 所有权：借用（不拥有）
//    - 大小：始终 8 字节（64位）或 4 字节（32位）

// 3. 胖引用（&[T], &dyn Trait）
//    - 内存：存储指针 + 元数据
//    - 位置：只在栈上
//    - 所有权：借用
//    - 大小：始终 16 字节（64位）

fn size_comparison() {
    use std::mem::size_of;

    println!("i32:        {} bytes", size_of::<i32>());           // 4
    println!("&i32:       {} bytes", size_of::<&i32>());          // 8
    println!("String:     {} bytes", size_of::<String>());        // 24
    println!("&String:    {} bytes", size_of::<&String>());       // 8
    println!("&[i32]:     {} bytes", size_of::<&[i32]>());        // 16 (胖指针)
    println!("Box<i32>:   {} bytes", size_of::<Box<i32>>());      // 8
}

// ============================================
// 为什么引用不拥有所有权？
// ============================================

fn why_borrow() {
    let data = String::from("重要数据");
    let r1 = &data;
    let r2 = &data;
    // 如果引用拥有所有权，data 被 drop 后，r1/r2 就悬垂了
    // Rust 通过「借用检查器」在编译时保证：
    // - 引用的生命周期不超过被引用值
    // - 不会同时存在冲突的引用
}

---

## 7.5 智能指针（Smart Pointers）

**JavaScript：** 没有指针概念，GC 自动管理内存
```javascript
// JS 中对象都在堆上，GC 自动回收
let obj = { data: "large data".repeat(1000) };
obj = null;  // 等待 GC 回收（不可控）
```

**Rust：** 通过智能指针精细控制堆内存
```rust
// ============================================
// Box<T> - 堆分配的最简单智能指针
// ============================================

fn main() {
    // Box 在堆上分配数据，返回指向堆的指针
    let b = Box::new(5);
    println!("b = {}", b);  // 自动解引用

    // 使用场景 1：递归类型（编译时大小未知）
    // 链表节点必须在堆上，因为大小不固定
    enum List {
        Cons(i32, Box<List>),  // Box 让 List 有确定大小
        Nil,
    }

    use List::{Cons, Nil};
    let list = Cons(1, Box::new(Cons(2, Box::new(Cons(3, Box::new(Nil))))));

    // 使用场景 2：避免栈溢出（大数据）
    // let large_array = [0; 1_000_000];  // 可能栈溢出
    let large_array = Box::new([0; 1_000_000]);  // 安全地在堆上

    // Box 的所有权规则与普通值相同
    let x = Box::new(5);
    let y = x;  // Move 所有权
    // println!("{}", x);  // ✗ 编译错误
    println!("{}", y);
}  // y 在这里离开作用域，堆内存自动释放

// ============================================
// Deref trait - 智能指针的核心
// ============================================

use std::ops::Deref;

struct MyBox<T>(T);  // 元组结构体

impl<T> MyBox<T> {
    fn new(x: T) -> MyBox<T> {
        MyBox(x)
    }
}

// 实现 Deref 让 MyBox 可以像引用一样使用
impl<T> Deref for MyBox<T> {
    type Target = T;

    fn deref(&self) -> &T {
        &self.0  // 返回内部数据的引用
    }
}

fn use_deref() {
    let x = 5;
    let y = MyBox::new(x);

    // *y 实际上是 *(y.deref())
    assert_eq!(5, x);
    assert_eq!(5, *y);  // 自动解引用
}

// ============================================
// Drop trait - 自定义清理逻辑
// ============================================

struct CustomSmartPointer {
    data: String,
}

impl Drop for CustomSmartPointer {
    fn drop(&mut self) {
        println!("CustomSmartPointer dropped with data: '{}'", self.data);
    }
}

fn use_drop() {
    let c = CustomSmartPointer {
        data: String::from("my stuff"),
    };
    let d = CustomSmartPointer {
        data: String::from("other stuff"),
    };
    println!("CustomSmartPointers created.");
}  // 先 drop d，再 drop c（与创建顺序相反）

// 提前手动 drop（注意不能直接用 c.drop()）
fn early_drop() {
    let c = CustomSmartPointer { data: String::from("early") };
    drop(c);  // std::mem::drop
    println!("CustomSmartPointer dropped before end of scope");
}

// ============================================
// Rc<T> - 引用计数（多所有权）
// ============================================

use std::rc::Rc;

fn use_rc() {
    // Rc 用于多所有权场景（只读）
    let data = Rc::new(String::from("shared data"));

    println!("Reference count after creation: {}", Rc::strong_count(&data));

    {
        let data2 = Rc::clone(&data);  // 增加引用计数（不是深拷贝！）
        println!("Reference count after clone: {}", Rc::strong_count(&data));

        // data 和 data2 指向同一个 String
        println!("data: {}", data);
        println!("data2: {}", data2);
    }  // data2 离开作用域，引用计数 -1

    println!("Reference count after inner scope: {}", Rc::strong_count(&data));
}  // 最后一个引用离开，堆内存释放

// Rc 使用场景：图结构、共享只读数据
enum GraphNode {
    Node(i32, Vec<Rc<GraphNode>>),  // 可能有多个父节点指向同一个子节点
}

// ============================================
// RefCell<T> - 内部可变性
// ============================================

use std::cell::RefCell;

fn use_refcell() {
    // RefCell 允许在不可变引用内部修改数据
    // 借用规则在运行时检查（可能 panic），而不是编译时

    let data = RefCell::new(String::from("hello"));

    // 获取不可变借用
    let immutable_borrow = data.borrow();
    println!("{}", immutable_borrow);
    drop(immutable_borrow);  // 必须先释放

    // 获取可变借用
    let mut mutable_borrow = data.borrow_mut();
    mutable_borrow.push_str(" world");
    drop(mutable_borrow);

    // 可以再次借用
    println!("{}", data.borrow());
}

// RefCell 与 Rc 组合：共享且可变的数据
fn rc_with_refcell() {
    let shared_data = Rc::new(RefCell::new(0));

    let clone1 = Rc::clone(&shared_data);
    let clone2 = Rc::clone(&shared_data);

    // 三个 Rc 都指向同一个 RefCell
    *clone1.borrow_mut() += 1;
    *clone2.borrow_mut() += 1;

    println!("Final value: {}", shared_data.borrow());  // 2
}

// ============================================
// Arc<T> - 线程安全的 Rc
// ============================================

use std::sync::Arc;
use std::thread;

fn use_arc() {
    // Arc 是 Atomic Reference Counted，线程安全
    let data = Arc::new(String::from("shared between threads"));

    let mut handles = vec![];

    for i in 0..10 {
        let data_clone = Arc::clone(&data);
        let handle = thread::spawn(move || {
            println!("Thread {} sees: {}", i, data_clone);
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }
}

// Arc + Mutex 实现线程安全的共享可变状态
use std::sync::Mutex;

fn arc_with_mutex() {
    let counter = Arc::new(Mutex::new(0));
    let mut handles = vec![];

    for _ in 0..10 {
        let counter_clone = Arc::clone(&counter);
        let handle = thread::spawn(move || {
            let mut num = counter_clone.lock().unwrap();  // 获取锁
            *num += 1;
            // 锁在这里自动释放
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("Result: {}", *counter.lock().unwrap());  // 10
}

// ============================================
// 原始指针（Raw Pointers）- 不安全 Rust
// ============================================

fn use_raw_pointers() {
    // 原始指针：*const T 和 *mut T
    // 特点：
    // 1. 允许 null
    // 2. 不自动释放内存
    // 3. 允许多个可变指针
    // 4. 不保证指向有效内存

    let mut num = 5;

    // 从引用创建原始指针
    let r1 = &num as *const i32;  // *const i32
    let r2 = &mut num as *mut i32;  // *mut i32

    // 原始指针可以在 unsafe 块外创建，但解引用必须在 unsafe 块内
    unsafe {
        // 解引用原始指针
        println!("r1 is: {}", *r1);
        println!("r2 is: {}", *r2);

        // 可以同时有多个可变指针（危险！）
        let r3 = &mut num as *mut i32;
        *r2 = 10;
        *r3 = 20;
        println!("Final value: {}", num);
    }
}

// ============================================
// 智能指针总结
// ============================================

// | 类型         | 所有权 | 可变性 | 线程安全 | 适用场景                    |
// |-------------|-------|-------|---------|---------------------------|
// | Box<T>      | 单    | 可变   | 否       | 堆分配、递归类型             |
// | Rc<T>       | 多    | 不可变 | 否       | 单线程共享只读数据           |
// | RefCell<T>  | 单    | 内部   | 否       | 单线程运行时检查的可变性      |
// | Rc<RefCell<T>> | 多 | 内部   | 否       | 单线程共享可变数据           |
// | Arc<T>      | 多    | 不可变 | 是       | 多线程共享只读数据           |
// | Arc<Mutex<T>> | 多  | 互斥锁 | 是       | 多线程共享可变数据           |

fn main() {
    println!("智能指针让 Rust 可以灵活地管理内存！");
}
```

---

## 8. 结构体与方法

### 8.1 结构体定义

**JavaScript：** 用 class 或对象字面量
```javascript
// JavaScript 类
class Agent {
    constructor(name, version) {
        this.name = name;
        this.version = version;
    }
}
```

**Rust：** 用 struct 定义，用 impl 实现方法
```rust
// ============================================
// 结构体定义 - 三种形式
// ============================================

// 1. 命名字段结构体（最常见）
// struct 关键字 + 结构体名 + { 字段名: 类型, ... }
struct Agent {
    name: String,        // 字段名: 类型
    version: String,
    capabilities: Vec<String>,  // 可以包含复杂类型
}

// 2. 元组结构体（类似元组，但有名字）
// 用于给元组一个有意义的名字
struct Point(f64, f64);     // 二维坐标
struct Color(u8, u8, u8);   // RGB 颜色

// 3. 单元结构体（没有字段）
// 用于实现 trait 或作为标记类型
struct Empty;

fn main() {
    // ============================================
    // 创建结构体实例
    // ============================================

    // 完整语法创建
    let agent1 = Agent {
        name: String::from("Alpha"),
        version: String::from("1.0"),
        capabilities: vec![String::from("chat"), String::from("code")],
    };

    // 字段初始化简写（如果变量名和字段名相同）
    let name = String::from("Beta");
    let version = String::from("2.0");
    let agent2 = Agent {
        name,       // 等价于 name: name
        version,    // 等价于 version: version
        capabilities: vec![],
    };

    // 从其他实例更新（struct update syntax）
    // 用 ..agent1 复制 agent1 的剩余字段
    let agent3 = Agent {
        name: String::from("Gamma"),  // 覆盖 name
        ..agent1  // 其余字段从 agent1 复制（所有权转移！）
    };
    // agent1.capabilities 现在无效了，因为所有权转移到 agent3
    // println!("{:?}", agent1.capabilities);  // ✗ 编译错误

    // 访问字段用点号
    println!("Agent: {} v{}", agent3.name, agent3.version);

    // ============================================
    // 元组结构体
    // ============================================

    let p = Point(3.0, 4.0);
    println!("x={}, y={}", p.0, p.1);  // 用 .0, .1 访问

    // 解构元组结构体
    let Color(r, g, b) = Color(255, 128, 0);
    println!("RGB: ({}, {}, {})", r, g, b);
}
```

### 8.2 方法实现

```rust
struct Rectangle {
    width: u32,
    height: u32,
}

// impl 块用于实现方法
// impl 结构体名 { ... }
impl Rectangle {
    // ============================================
    // 关联函数（Associated Functions）
    // 没有 self 参数，类似静态方法/构造函数
    // ============================================

    // 构造函数（约定俗成叫 new，但不是关键字）
    // Self 是 impl 后面类型的别名，这里是 Rectangle
    fn new(width: u32, height: u32) -> Self {
        Self { width, height }
    }

    // 正方形工厂函数
    fn square(size: u32) -> Self {
        Self {
            width: size,
            height: size,
        }
    }

    // ============================================
    // 方法（Methods）
    // 第一个参数是 self/&self/&mut self
    // ============================================

    // &self - 不可变借用，只读访问
    // self 相当于 &self，只是借用不是拥有
    fn area(&self) -> u32 {
        // self.width 是 (*self).width 的简写
        self.width * self.height
    }

    // 判断是否能容纳另一个矩形
    fn can_hold(&self, other: &Rectangle) -> bool {
        self.width > other.width && self.height > other.height
    }

    // &mut self - 可变借用，可以修改
    fn scale(&mut self, factor: u32) {
        self.width *= factor;
        self.height *= factor;
    }

    // self - 获取所有权（消耗自身）
    // 常用于转换或消耗性操作
    fn destroy(self) -> (u32, u32) {
        (self.width, self.height)
        // self 在这里被消耗，之后不能再使用
    }
}

fn main() {
    // 调用关联函数用 ::
    let rect = Rectangle::new(30, 50);
    let square = Rectangle::square(20);

    // 调用方法用 .
    // Rust 会自动引用/解引用，以下都有效：
    println!("Area: {}", rect.area());      // 自动 &rect
    println!("Area: {}", (&rect).area());   // 显式借用

    println!("Can hold: {}", rect.can_hold(&square));

    // 可变方法
    let mut sq = Rectangle::square(10);
    sq.scale(2);
    println!("Scaled: {}x{}", sq.width, sq.height);

    // 消耗性方法
    let (w, h) = sq.destroy();
    println!("Destroyed: {}x{}", w, h);
    // sq 现在无效了
}
```

### 8.3 多个 impl 块

```rust
struct Agent {
    name: String,
}

// 可以有多个 impl 块，这在 trait 实现时很有用
impl Agent {
    fn new(name: &str) -> Self {
        Self { name: name.to_string() }
    }
}

impl Agent {
    fn greet(&self) {
        println!("Hello, I'm {}", self.name);
    }
}

// 为结构体实现 trait（后面详细讲）
impl Clone for Agent {
    fn clone(&self) -> Self {
        Self {
            name: self.name.clone(),
        }
    }
}
```

---

## 9. 枚举与模式匹配

### 9.1 枚举定义

**JavaScript：** 没有原生枚举，通常用对象模拟
```javascript
const AgentState = {
    IDLE: 'idle',
    RUNNING: 'running',
    ERROR: 'error'
};
```

**Rust：** 枚举可以携带数据，这是 Rust 的杀手级特性
```rust
// ============================================
// 基础枚举（类似其他语言的 enum）
// ============================================

enum Direction {
    North,
    South,
    East,
    West,
}

// ============================================
// 带数据的枚举（Rust 的超能力！）
// ============================================

// 每个变体可以携带不同类型的数据
enum Message {
    // 无数据变体
    Quit,
    // 元组变体
    Move { x: i32, y: i32 },  // 匿名结构体
    // 单值变体
    Write(String),
    // 多值变体
    ChangeColor(u8, u8, u8),  // RGB
}

// 等价于 TypeScript 的：
// type Message =
//   | { type: 'Quit' }
//   | { type: 'Move', x: number, y: number }
//   | { type: 'Write', content: string }
//   | { type: 'ChangeColor', r: number, g: number, b: number };

// ============================================
// Option 枚举 - Rust 没有 null！
// ============================================

// 标准库定义：
// enum Option<T> {
//     None,    // 没有值
//     Some(T), // 有值，T 是泛型
// }

fn find_char(s: &str, c: char) -> Option<usize> {
    for (i, ch) in s.chars().enumerate() {
        if ch == c {
            return Some(i);  // 找到了，返回 Some(索引)
        }
    }
    None  // 没找到，返回 None
}

fn main() {
    // 使用 Option
    let result = find_char("hello", 'e');

    // 必须用模式匹配处理
    match result {
        Some(index) => println!("Found at index: {}", index),
        None => println!("Not found"),
    }

    // 或者使用便捷方法
    if let Some(index) = result {
        println!("Found at {}", index);
    }
}
```

### 9.2 match 模式匹配

```rust
enum Coin {
    Penny,
    Nickel,
    Dime,
    Quarter(String),  // 哪个州的
}

fn value_in_cents(coin: Coin) -> u8 {
    // match 表达式，类似 switch，但强大得多
    match coin {
        // => 左边是模式，右边是表达式
        Coin::Penny => {
            println!("Lucky penny!");
            1  // 最后一个表达式是返回值
        }
        Coin::Nickel => 5,
        Coin::Dime => 10,
        // 绑定模式中的值
        Coin::Quarter(state) => {
            println!("Quarter from {:?}!", state);
            25
        }
    }
}

fn main() {
    let coin = Coin::Quarter(String::from("Alaska"));
    println!("Value: {}", value_in_cents(coin));
}
```

### 9.3 模式匹配进阶

```rust
enum Message {
    Quit,
    Move { x: i32, y: i32 },
    Write(String),
}

fn process_message(msg: Message) {
    match msg {
        // ============================================
        // 字面值匹配
        // ============================================
        Message::Quit => {
            println!("Quitting...");
        }

        // ============================================
        // 解构命名字段
        // ============================================
        Message::Move { x, y } => {
            println!("Moving to ({}, {})", x, y);
        }

        // ============================================
        // 只关心部分字段，其他用 .. 忽略
        // ============================================
        Message::Move { x, .. } => {
            println!("Moving horizontally to {}", x);
        }

        // ============================================
        // 绑定整个值
        // ============================================
        msg @ Message::Write(text) => {
            println!("Message {:?} says: {}", msg, text);
        }

        // ============================================
        // 通配符 _ 匹配所有剩余情况
        // ============================================
        // 必须放在最后，类似于 switch 的 default
        _ => {
            println!("Other message");
        }
    }
}

fn main() {
    // ============================================
    // if let - 只关心一个模式
    // ============================================

    let msg = Some(5);

    // 不用写完整的 match
    if let Some(value) = msg {
        println!("Got: {}", value);
    }

    // 带 else
    if let Some(5) = msg {
        println!("Exactly 5!");
    } else {
        println!("Something else");
    }

    // ============================================
    // while let - 循环直到模式不匹配
    // ============================================

    let mut stack = vec![1, 2, 3];

    while let Some(top) = stack.pop() {
        println!("Popped: {}", top);  // 3, 2, 1
    }

    // ============================================
    // let 本身也是模式匹配
    // ============================================

    let (x, y) = (1, 2);  // 解构元组
    let Point { x, y } = Point { x: 3, y: 4 };  // 解构结构体

    // ============================================
    // 匹配守卫（match guards）
    // ============================================

    let num = Some(4);

    match num {
        Some(n) if n < 5 => println!("less than 5: {}", n),
        Some(n) => println!("5 or more: {}", n),
        None => (),
    }
}

struct Point {
    x: i32,
    y: i32,
}
```

### 9.4 Result 枚举 - 错误处理

```rust
// 标准库定义：
// enum Result<T, E> {
//     Ok(T),   // 成功，包含值
//     Err(E),  // 失败，包含错误
// }

use std::fs::File;
use std::io::{self, Read};

fn read_username_from_file() -> Result<String, io::Error> {
    // 尝试打开文件
    let file_result = File::open("hello.txt");

    // 必须处理两种结果
    let mut file = match file_result {
        Ok(file) => file,
        Err(e) => return Err(e),  // 提前返回错误
    };

    // 读取内容
    let mut username = String::new();
    match file.read_to_string(&mut username) {
        Ok(_) => Ok(username),
        Err(e) => Err(e),
    }
}

// 简化版：使用 ? 运算符
fn read_username_short() -> Result<String, io::Error> {
    let mut file = File::open("hello.txt")?;  // ? 展开 match，出错提前返回
    let mut username = String::new();
    file.read_to_string(&mut username)?;
    Ok(username)
}

// 链式调用版
fn read_username_chain() -> Result<String, io::Error> {
    let mut username = String::new();
    File::open("hello.txt")?.read_to_string(&mut username)?;
    Ok(username)
}

fn main() {
    // 处理 Result
    match read_username_from_file() {
        Ok(name) => println!("Username: {}", name),
        Err(e) => println!("Error: {}", e),
    }

    // unwrap - 成功返回值，失败 panic
    // let name = read_username_from_file().unwrap();  // 危险！

    // expect - 带自定义消息的 unwrap
    // let name = read_username_from_file().expect("Failed to read username");

    // unwrap_or - 失败时用默认值
    let name = read_username_from_file().unwrap_or(String::from("unknown"));
}
```

---

## 10. 错误处理

### 10.1 错误处理哲学

**JavaScript：** 主要用 try/catch 或 Promise.catch
```javascript
try {
    const data = JSON.parse(jsonString);
} catch (e) {
    console.error("Parse failed:", e);
}
```

**Rust：** 显式错误传播，编译器强制处理
```rust
// ============================================
// 可恢复错误：Result<T, E>
// ============================================

use std::fs::File;
use std::io::ErrorKind;

fn open_file(path: &str) -> File {
    let result = File::open(path);

    match result {
        Ok(file) => file,
        Err(error) => match error.kind() {
            // 根据错误类型不同处理
            ErrorKind::NotFound => {
                println!("File not found, creating...");
                File::create(path).expect("Failed to create file")
            }
            ErrorKind::PermissionDenied => {
                panic!("Permission denied!");  // 不可恢复，直接崩溃
            }
            _ => panic!("Unknown error: {:?}", error),
        },
    }
}

// ============================================
// unwrap 和 expect（开发/原型阶段使用）
// ============================================

fn quick_and_dirty() {
    // unwrap：成功返回值，失败 panic
    let file = File::open("config.txt").unwrap();

    // expect：带自定义错误消息的 unwrap
    let file = File::open("config.txt")
        .expect("config.txt should exist in project root");
}

// ============================================
// ? 运算符 - 错误传播的语法糖
// ============================================

// 在返回 Result 的函数中，? 会自动：
// - Ok(val) => val
// - Err(e) => return Err(e.into())

fn read_config() -> Result<String, std::io::Error> {
    let file = File::open("config.txt")?;  // 出错自动返回 Err
    // ... 继续处理
    Ok(String::from("config"))
}

// ? 也可以用于 Option
fn last_char_of_first_line(text: &str) -> Option<char> {
    text.lines().next()?.chars().last()
    // lines().next() 返回 Option<&str>
    // ? 如果是 None 就提前返回 None
    // 否则继续调用 chars().last()
}
```

### 10.2 自定义错误类型

```rust
use std::fmt;

// ============================================
// 定义自己的错误类型
// ============================================

#[derive(Debug)]
enum AgentError {
    NotFound { id: String },
    InvalidState { current: String, expected: String },
    NetworkError(String),
    Timeout,
}

// 实现 Display trait 用于错误消息
impl fmt::Display for AgentError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            AgentError::NotFound { id } => {
                write!(f, "Agent with id '{}' not found", id)
            }
            AgentError::InvalidState { current, expected } => {
                write!(f, "Invalid state: expected {}, got {}", expected, current)
            }
            AgentError::NetworkError(msg) => {
                write!(f, "Network error: {}", msg)
            }
            AgentError::Timeout => {
                write!(f, "Operation timed out")
            }
        }
    }
}

// 实现 Error trait
impl std::error::Error for AgentError {}

// ============================================
// 使用 thiserror 简化（实际项目中推荐）
// ============================================

// 在 Cargo.toml 添加: thiserror = "1.0"

// use thiserror::Error;
//
// #[derive(Error, Debug)]
// pub enum AgentError {
//     #[error("Agent with id {id} not found")]
//     NotFound { id: String },
//
//     #[error("Invalid state: expected {expected}, got {current}")]
//     InvalidState { current: String, expected: String },
//
//     #[error("Network error: {0}")]
//     NetworkError(String),
//
//     #[error("Operation timed out")]
//     Timeout,
// }

fn start_agent(id: &str) -> Result<(), AgentError> {
    if id.is_empty() {
        return Err(AgentError::NotFound {
            id: id.to_string(),
        });
    }
    // ...
    Ok(())
}

fn main() {
    match start_agent("") {
        Ok(()) => println!("Agent started"),
        Err(e) => {
            // 可以打印 Display 实现的消息
            println!("Error: {}", e);
            // 也可以打印 Debug 的详细信息
            println!("Debug: {:?}", e);
        }
    }
}
```

### 10.3 Option 和 Result 的转换

```rust
fn main() {
    // ============================================
    // Option -> Result
    // ============================================

    let opt: Option<i32> = Some(5);

    // ok_or: Some(v) -> Ok(v), None -> Err(提供的错误)
    let result: Result<i32, &str> = opt.ok_or("value is None");

    // ok_or_else: 延迟计算错误（错误创建有开销时用）
    let result: Result<i32, String> = opt.ok_or_else(|| {
        format!("Complex error computation at {}", std::time::Instant::now())
    });

    // ============================================
    // Result -> Option
    // ============================================

    let res: Result<i32, &str> = Ok(5);

    // ok: Ok(v) -> Some(v), Err(_) -> None
    let opt: Option<i32> = res.ok();  // Some(5)

    // err: Ok(_) -> None, Err(e) -> Some(e)
    let res: Result<i32, &str> = Err("error");
    let opt: Option<&&str> = res.err();  // Some("error")

    // ============================================
    // 组合操作
    // ============================================

    let x = Some(2);
    let y = Some(3);

    // and_then: 链式处理，类似 flatMap
    let sum = x.and_then(|a| y.map(|b| a + b));
    println!("{:?}", sum);  // Some(5)

    // unwrap_or: 提供默认值
    let val = None.unwrap_or(10);  // 10
    let val = Some(5).unwrap_or(10);  // 5

    // unwrap_or_else: 延迟计算默认值
    let val = None.unwrap_or_else(|| expensive_computation());
}

fn expensive_computation() -> i32 {
    42
}
```

---

## 11. 泛型基础

### 11.1 为什么需要泛型

**JavaScript：** 动态类型，不需要泛型
```javascript
// 一个函数处理任何类型
function identity(value) {
    return value;
}
```

**Rust：** 静态类型，用泛型实现代码复用
```rust
// 没有泛型：需要为每种类型写不同函数
fn largest_i32(list: &[i32]) -> i32 {
    let mut largest = list[0];
    for &item in list {
        if item > largest {
            largest = item;
        }
    }
    largest
}

fn largest_char(list: &[char]) -> char {
    let mut largest = list[0];
    for &item in list {
        if item > largest {
            largest = item;
        }
    }
    largest
}

// 有泛型：一份代码，多种类型
// <T> 表示 "类型参数 T"
fn largest<T: std::cmp::PartialOrd>(list: &[T]) -> &T {
    let mut largest = &list[0];
    for item in list {
        if item > largest {
            largest = item;
        }
    }
    largest
}

fn main() {
    let numbers = vec![34, 50, 25, 100, 65];
    let result = largest(&numbers);
    println!("Largest number: {}", result);

    let chars = vec!['y', 'm', 'a', 'q'];
    let result = largest(&chars);
    println!("Largest char: {}", result);
}
```

### 11.2 泛型在结构体和方法中

```rust
// ============================================
// 泛型结构体
// ============================================

// T 是类型参数，可以是任何类型
struct Point<T> {
    x: T,
    y: T,
}

// 不同泛型参数
struct MixedPoint<T, U> {
    x: T,
    y: U,
}

// ============================================
// 泛型方法
// ============================================

impl<T> Point<T> {
    // 构造函数
    fn new(x: T, y: T) -> Self {
        Self { x, y }
    }

    // 获取 x 的引用
    fn x(&self) -> &T {
        &self.x
    }
}

// 针对具体类型的 impl（特例化）
// 只为 Point<f32> 实现这个方法
impl Point<f32> {
    fn distance_from_origin(&self) -> f32 {
        (self.x.powi(2) + self.y.powi(2)).sqrt()
    }
}

fn main() {
    // 整数点
    let int_point = Point { x: 5, y: 10 };

    // 浮点
    let float_point = Point { x: 1.0, y: 4.0 };

    // 混合类型
    let mixed = MixedPoint { x: 5, y: 4.0 };

    // 使用泛型方法
    let p = Point::new(3, 4);
    println!("x = {}", p.x());

    // 使用特例化方法
    let fp = Point { x: 3.0, y: 4.0 };
    println!("Distance: {}", fp.distance_from_origin());
}
```

### 11.3 泛型在枚举中

```rust
// Option 和 Result 都是泛型枚举

// Option<T> - 可能有值，可能没有
enum Option<T> {
    Some(T),
    None,
}

// Result<T, E> - 可能成功，可能失败
enum Result<T, E> {
    Ok(T),
    Err(E),
}

// 自定义泛型枚举
enum ApiResponse<T> {
    Success(T),
    Error { code: u16, message: String },
    Loading,
}

impl<T> ApiResponse<T> {
    fn is_success(&self) -> bool {
        matches!(self, ApiResponse::Success(_))
    }
}

fn main() {
    let response: ApiResponse<String> = ApiResponse::Success(String::from("data"));

    match response {
        ApiResponse::Success(data) => println!("Got: {}", data),
        ApiResponse::Error { code, message } => {
            println!("Error {}: {}", code, message)
        }
        ApiResponse::Loading => println!("Loading..."),
    }
}
```

---

## 12. Trait（接口）

### 12.1 定义和实现 Trait

**JavaScript：** 没有接口，用鸭子类型或 TypeScript 接口
```typescript
// TypeScript
interface Drawable {
    draw(): void;
}
```

**Rust：** Trait 定义共享行为
```rust
// ============================================
// 定义 Trait（类似 Java 接口或 TypeScript interface）
// ============================================

pub trait Drawable {
    // 方法签名（没有实现）
    fn draw(&self);

    // 可以有默认实现
    fn describe(&self) -> String {
        String::from("Something drawable")
    }
}

// ============================================
// 为类型实现 Trait
// ============================================

pub struct Circle {
    pub radius: f64,
}

pub struct Rectangle {
    pub width: f64,
    pub height: f64,
}

// impl TraitName for TypeName
impl Drawable for Circle {
    fn draw(&self) {
        println!("Drawing a circle with radius {}", self.radius);
    }

    // 可以覆盖默认实现
    fn describe(&self) -> String {
        format!("Circle(r={})", self.radius)
    }
}

impl Drawable for Rectangle {
    fn draw(&self) {
        println!(
            "Drawing a rectangle {}x{}",
            self.width, self.height
        );
    }
}

// ============================================
// 使用 Trait
// ============================================

// 参数是实现了 Drawable 的任何类型
fn render(item: &impl Drawable) {
    item.draw();
}

// 泛型语法（等价于上面）
fn render_generic<T: Drawable>(item: &T) {
    item.draw();
}

fn main() {
    let circle = Circle { radius: 5.0 };
    let rect = Rectangle {
        width: 10.0,
        height: 20.0,
    };

    render(&circle);
    render(&rect);

    println!("{}", circle.describe());  // 覆盖的版本
    println!("{}", rect.describe());    // 默认实现
}
```

### 12.2 Trait Bounds（约束）

```rust
use std::fmt::Display;

// ============================================
// 多个 Trait Bounds
// ============================================

// 需要同时实现 Display 和 PartialOrd
fn print_and_compare<T: Display + PartialOrd>(a: T, b: T) {
    println!("a = {}, b = {}", a, b);
    if a > b {
        println!("a is larger");
    } else {
        println!("b is larger or equal");
    }
}

// where 子句（更清晰，尤其是复杂约束时）
fn some_function<T, U>(t: T, u: U) -> i32
where
    T: Display + Clone,
    U: Clone + std::fmt::Debug,
{
    // 函数体
    42
}

// ============================================
// 返回实现 Trait 的类型
// ============================================

fn returns_drawable() -> impl Drawable {
    Circle { radius: 1.0 }
}

// 注意：impl Trait 返回只能返回一种具体类型
// 下面这样不行：
// fn returns_random(is_circle: bool) -> impl Drawable {
//     if is_circle {
//         Circle { radius: 1.0 }
//     } else {
//         Rectangle { width: 1.0, height: 1.0 }  // 编译错误！类型不同
//     }
// }

// ============================================
// Trait Bound 实现条件方法
// ============================================

struct Pair<T> {
    x: T,
    y: T,
}

// 所有 Pair<T> 都有 new
impl<T> Pair<T> {
    fn new(x: T, y: T) -> Self {
        Self { x, y }
    }
}

// 只有 T 实现 Display + PartialOrd 才有 cmp_display
impl<T: Display + PartialOrd> Pair<T> {
    fn cmp_display(&self) {
        if self.x >= self.y {
            println!("The largest member is x = {}", self.x);
        } else {
            println!("The largest member is y = {}", self.y);
        }
    }
}
```

### 12.3 常用标准 Trait

```rust
// ============================================
// 常用的标准库 Trait
// ============================================

// Debug - 用于 {:?} 格式化打印
#[derive(Debug)]
struct Point {
    x: i32,
    y: i32,
}

// Clone - 显式深拷贝 .clone()
#[derive(Clone)]
struct Data {
    value: String,
}

// Copy - 隐式按位复制（只能用于简单类型）
#[derive(Copy, Clone)]
struct Coordinate {
    x: f64,
    y: f64,
}

// PartialEq / Eq - 相等比较 ==
#[derive(PartialEq)]
enum Status {
    Active,
    Inactive,
}

// PartialOrd / Ord - 排序比较 < > <= >=
#[derive(PartialEq, PartialOrd)]
struct Score(f64);

// Default - 默认值
#[derive(Default)]
struct Config {
    timeout: u32,  // 默认 0
    retries: u32,  // 默认 0
}

// 手动实现 Default
impl Default for Point {
    fn default() -> Self {
        Self { x: 0, y: 0 }
    }
}

fn main() {
    // Debug
    let p = Point { x: 1, y: 2 };
    println!("{:?}", p);           // Point { x: 1, y: 2 }
    println!("{:#?}", p);          // 美化打印

    // Clone
    let d1 = Data { value: String::from("hello") };
    let d2 = d1.clone();  // 显式克隆

    // Copy（隐式）
    let c1 = Coordinate { x: 1.0, y: 2.0 };
    let c2 = c1;  // Copy，不是 Move
    println!("{:?} {:?}", c1, c2);  // 两者都可用

    // Default
    let config: Config = Default::default();
    // 或用 .. 语法填充剩余字段
    let config = Config {
        timeout: 30,
        ..Default::default()
    };
}
```

### 12.4 高级 Trait 特性

```rust
// ============================================
// 关联类型（Associated Types）
// ============================================

// 迭代器 trait，Output 是关联类型
trait Iterator {
    type Item;  // 关联类型

    fn next(&mut self) -> Option<Self::Item>;
}

// 实现时指定具体类型
struct Counter {
    count: u32,
}

impl Iterator for Counter {
    type Item = u32;  // 这个迭代器产生 u32

    fn next(&mut self) -> Option<Self::Item> {
        self.count += 1;
        if self.count < 6 {
            Some(self.count)
        } else {
            None
        }
    }
}

// ============================================
// Trait 对象（动态分发）
// ============================================

// 之前用的 impl Trait 是静态分发（编译时确定）
// Trait 对象 &dyn Trait 是动态分发（运行时确定）

fn draw_multiple(items: &[&dyn Drawable]) {
    for item in items {
        item.draw();
    }
}

fn main() {
    let circle = Circle { radius: 1.0 };
    let rect = Rectangle { width: 2.0, height: 3.0 };

    // 可以混合不同类型
    let shapes: [&dyn Drawable; 2] = [&circle, &rect];
    draw_multiple(&shapes);
}

// ============================================
// Trait 继承
// ============================================

trait Animal {
    fn name(&self) -> String;
}

// Dog 继承 Animal
trait Dog: Animal {
    fn bark(&self);
}

// 为类型实现 Dog 时必须先实现 Animal
struct Labrador;

impl Animal for Labrador {
    fn name(&self) -> String {
        String::from("Labrador")
    }
}

impl Dog for Labrador {
    fn bark(&self) {
        println!("Woof!");
    }
}

// ============================================
// 完全限定语法（Fully Qualified Syntax）
// ============================================

trait Pilot {
    fn fly(&self);
}

trait Wizard {
    fn fly(&self);
}

struct Human;

impl Pilot for Human {
    fn fly(&self) {
        println!("This is your captain speaking.");
    }
}

impl Wizard for Human {
    fn fly(&self) {
        println!("Up!");
    }
}

impl Human {
    fn fly(&self) {
        println!("*waving arms furiously*");
    }
}

fn main() {
    let person = Human;

    person.fly();                    // Human 的方法
    Pilot::fly(&person);             // Pilot trait 的方法
    Wizard::fly(&person);            // Wizard trait 的方法
}
```

---

## 13. 生命周期

### 13.1 为什么需要生命周期

```rust
// Rust 编译器需要确保引用不会悬空（dangling reference）
// 生命周期就是用来描述引用的有效范围

// 这个函数的问题：返回的引用可能来自 x 或 y
// 编译器不知道返回的是哪个，无法确定生命周期
// fn longest(x: &str, y: &str) -> &str {
//     if x.len() > y.len() {
//         x
//     } else {
//         y
//     }
// }

// 正确的写法：显式标注生命周期
// 'a 是一个生命周期参数（读作 "tick a"）
// 意思是：返回值的生命周期与 x 和 y 中较短的那个相同
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() {
        x
    } else {
        y
    }
}

fn main() {
    let string1 = String::from("long string is long");

    {
        let string2 = String::from("xyz");
        // result 的生命周期是 'a = string2 的生命周期
        let result = longest(string1.as_str(), string2.as_str());
        println!("The longest string is {}", result);
    }  // string2 在这里被 drop

    // result 在这里无效，因为 string2 已经被 drop
    // 但下面的写法是错的：
    // let result;
    // {
    //     let string2 = String::from("short");
    //     result = longest(string1.as_str(), string2.as_str());
    // }  // string2 被 drop，result 变成悬空引用
    // println!("{}", result);  // ✗ 编译错误
}
```

### 13.2 生命周期标注语法

```rust
// ============================================
// 生命周期标注规则
// ============================================

// 1. 每个引用参数都有自己的生命周期参数
// 2. 如果只有一个输入生命周期参数，它被赋予所有输出生命周期参数
// 3. 如果有多个输入生命周期参数，但其中一个是 &self 或 &mut self，
//    那么 self 的生命周期被赋予所有输出生命周期参数

// ============================================
// 结构体中的生命周期
// ============================================

// 如果结构体包含引用，必须标注生命周期
struct ImportantExcerpt<'a> {
    part: &'a str,  // part 引用的字符串必须比结构体活得长
}

impl<'a> ImportantExcerpt<'a> {
    // 不需要标注返回值生命周期（规则3）
    fn level(&self) -> i32 {
        3
    }

    // 返回值生命周期与 &self 相同（规则3）
    fn announce_and_return_part(&self, announcement: &str) -> &str {
        println!("Attention please: {}", announcement);
        self.part
    }
}

// ============================================
// 静态生命周期 'static
// ============================================

// 'static 表示整个程序运行期间都有效
// 字符串字面量有 'static 生命周期
let s: &'static str = "I have a static lifetime.";

// 注意：不要滥用 'static，大部分情况下应该用正确的生命周期标注

fn main() {
    let novel = String::from("Call me Ishmael. Some years ago...");
    let first_sentence = novel.split('.').next().expect("Could not find a '.'");

    // first_sentence 是 &str，引用 novel 的一部分
    let excerpt = ImportantExcerpt {
        part: first_sentence,
    };

    // excerpt 不能在 novel 被 drop 之后使用
    println!("{}", excerpt.part);
}  // novel 在这里被 drop，excerpt 不能再使用
```

### 13.3 生命周期省略规则

```rust
// 在很多情况下，编译器可以自动推断生命周期，不需要手动标注
// 这叫 "生命周期省略规则"

// 第一规则：编译器为每个引用参数分配一个生命周期参数
fn first_word(s: &str) -> &str {  // 实际上是：fn first_word<'a>(s: &'a str) -> &str
    // ...
    s
}

// 第二规则：如果只有一个输入生命周期，它被赋予所有输出
fn first_word<'a>(s: &'a str) -> &'a str {  // 编译器自动添加
    s
}

// 第三规则：如果有 &self，&self 的生命周期赋予所有输出
impl<'a> ImportantExcerpt<'a> {
    fn get_part(&self) -> &str {  // 自动推断为 &'a str
        self.part
    }
}

// ============================================
// 复杂例子
// ============================================

// 返回值的生命周期与 text 相同，与 ann 无关
fn announce_and_return<'a, 'b>(text: &'a str, ann: &'b str) -> &'a str {
    println!("Announcement: {}", ann);
    text
}

// 多个泛型参数 + 生命周期
fn longest_with_announcement<'a, T>(
    x: &'a str,
    y: &'a str,
    ann: T,
) -> &'a str
where
    T: std::fmt::Display,
{
    println!("Announcement! {}", ann);
    if x.len() > y.len() {
        x
    } else {
        y
    }
}
```

---

## 14. 闭包

### 14.1 闭包基础

**JavaScript：**
```javascript
const add = (a, b) => a + b;
const numbers = [1, 2, 3].filter(n => n > 1);
```

**Rust：**
```rust
fn main() {
    // ============================================
    // 闭包语法
    // ============================================

    // |参数| { 表达式 }
    let add = |a: i32, b: i32| -> i32 { a + b };
    println!("5 + 3 = {}", add(5, 3));

    // 类型可以推断
    let add_inferred = |a, b| a + b;
    println!("2 + 4 = {}", add_inferred(2, 4));

    // 多行闭包
    let calculate = |a, b| {
        let sum = a + b;
        let product = a * b;
        sum + product
    };

    // ============================================
    // 捕获环境
    // ============================================

    let outside = 10;

    // 闭包可以捕获外部变量
    let capture = |x| x + outside;
    println!("{}", capture(5));  // 15

    // ============================================
    // 闭包特质（自动实现）
    // ============================================

    // Fn: 不可变借用捕获的变量
    // FnMut: 可变借用捕获的变量
    // FnOnce: 获取所有权（只能调用一次）
}

// ============================================
// 使用闭包作为参数
// ============================================

fn apply_operation<F>(a: i32, b: i32, operation: F) -> i32
where
    F: Fn(i32, i32) -> i32,
{
    operation(a, b)
}

fn main_closure() {
    let sum = apply_operation(5, 3, |a, b| a + b);
    let product = apply_operation(5, 3, |a, b| a * b);

    println!("Sum: {}, Product: {}", sum, product);
}

// ============================================
// 闭包捕获方式
// ============================================

fn capture_examples() {
    let mut list = vec![1, 2, 3];

    // 不可变借用：Fn
    let borrow_immutably = || println!("{:?}", list);
    borrow_immutably();
    println!("{:?}", list);  // 还能用

    // 可变借用：FnMut
    let mut borrow_mutably = || list.push(4);
    borrow_mutably();
    println!("{:?}", list);  // 还能用，但被修改了

    // 获取所有权：FnOnce
    let consume = || {
        let owned = list;  // list 的所有权转移
        println!("{:?}", owned);
        owned  // 返回，避免被 drop
    };
    let _new_list = consume();
    // println!("{:?}", list);  // ✗ list 已经被 move
}

// ============================================
// move 关键字
// ============================================

use std::thread;

fn move_example() {
    let data = vec![1, 2, 3];

    // move 强制闭包获取所有权（用于多线程）
    let handle = thread::spawn(move || {
        println!("In thread: {:?}", data);
    });

    // data 在这里不可用，所有权转移到了闭包
    handle.join().unwrap();
}
```

### 14.2 闭包实战例子

```rust
fn main() {
    let numbers = vec![1, 2, 3, 4, 5];

    // 闭包作为过滤条件
    let evens: Vec<i32> = numbers
        .iter()
        .filter(|&&x| x % 2 == 0)  // && 因为 filter 传 &&i32
        .copied()
        .collect();
    println!("Evens: {:?}", evens);

    // 闭包作为映射
    let squared: Vec<i32> = numbers
        .iter()
        .map(|x| x * x)
        .collect();
    println!("Squared: {:?}", squared);

    // 排序时的比较函数
    let mut words = vec!["banana", "apple", "cherry"];
    words.sort_by(|a, b| a.len().cmp(&b.len()));  // 按长度排序
    println!("{:?}", words);
}
```

---

## 15. 迭代器

### 15.1 迭代器基础

```rust
fn main() {
    let v = vec![1, 2, 3];

    // ============================================
    // 创建迭代器
    // ============================================

    // iter() - 不可变引用迭代
    for item in v.iter() {
        println!("{}", item);  // item 是 &i32
    }

    // iter_mut() - 可变引用迭代
    let mut v2 = vec![1, 2, 3];
    for item in v2.iter_mut() {
        *item += 10;  // 解引用修改
    }

    // into_iter() - 获取所有权迭代（消耗集合）
    for item in v.into_iter() {
        println!("Owned: {}", item);  // item 是 i32
    }
    // v 现在不可用

    // ============================================
    // 适配器方法（返回新迭代器）
    // ============================================

    let nums = vec![1, 2, 3, 4, 5];

    let result: Vec<i32> = nums
        .iter()
        .map(|x| x * 2)           // 每个元素乘以2
        .filter(|x| *x > 4)       // 过滤大于4的
        .collect();               // 收集成 Vec
    println!("{:?}", result);  // [6, 8, 10]

    // ============================================
    // 消费适配器（返回非迭代器值）
    // ============================================

    let sum: i32 = nums.iter().sum();  // 15
    let count = nums.iter().count();   // 5
    let max = nums.iter().max();       // Some(&5)
    let min = nums.iter().min();       // Some(&1)

    // any / all
    let has_even = nums.iter().any(|x| x % 2 == 0);  // true
    let all_positive = nums.iter().all(|x| *x > 0);  // true
}
```

### 15.2 常用迭代器方法

```rust
fn main() {
    let nums = vec![1, 2, 3, 4, 5];

    // ============================================
    // 转换
    // ============================================

    // map: 转换每个元素
    let doubled: Vec<i32> = nums.iter().map(|x| x * 2).collect();

    // filter: 过滤元素
    let evens: Vec<&i32> = nums.iter().filter(|&&x| x % 2 == 0).collect();

    // enumerate: 带索引
    for (i, v) in nums.iter().enumerate() {
        println!("{}: {}", i, v);
    }

    // chain: 连接两个迭代器
    let v1 = vec![1, 2, 3];
    let v2 = vec![4, 5, 6];
    let chained: Vec<i32> = v1.into_iter().chain(v2).collect();
    // [1, 2, 3, 4, 5, 6]

    // zip: 合并两个迭代器
    let names = vec!["Alice", "Bob"];
    let scores = vec![95, 87];
    let pairs: Vec<(&str, i32)> = names.into_iter().zip(scores).collect();
    // [("Alice", 95), ("Bob", 87)]

    // ============================================
    // 跳过和取出
    // ============================================

    let v = vec![1, 2, 3, 4, 5];

    let skipped: Vec<&i32> = v.iter().skip(2).collect();  // [3, 4, 5]
    let taken: Vec<&i32> = v.iter().take(2).collect();    // [1, 2]
    let last_three: Vec<&i32> = v.iter().skip(2).collect();  // [3, 4, 5]

    // ============================================
    // 查找
    // ============================================

    // find: 返回 Option
    let first_even = v.iter().find(|&&x| x % 2 == 0);  // Some(&2)

    // position: 返回索引
    let pos = v.iter().position(|&x| x == 3);  // Some(2)

    // ============================================
    // 归约
    // ============================================

    // fold: 累积计算
    let sum = v.iter().fold(0, |acc, x| acc + x);  // 15

    // reduce: 类似 fold，但初始值是第一个元素
    let max = v.iter().copied().reduce(|a, b| if a > b { a } else { b });

    // ============================================
    // 其他有用方法
    // ============================================

    // flat_map: 映射并展平
    let nested = vec![vec![1, 2], vec![3, 4]];
    let flat: Vec<i32> = nested.iter().flat_map(|v| v.iter().copied()).collect();
    // [1, 2, 3, 4]

    // partition: 分成两组
    let (evens, odds): (Vec<i32>, Vec<i32>) = nums
        .iter()
        .copied()
        .partition(|&x| x % 2 == 0);

    // inspect: 用于调试（不修改元素）
    let sum: i32 = nums
        .iter()
        .inspect(|x| println!("Processing: {}", x))
        .sum();
}
```

### 15.3 自定义迭代器

```rust
struct Counter {
    count: u32,
    max: u32,
}

impl Counter {
    fn new(max: u32) -> Self {
        Counter { count: 0, max }
    }
}

// 实现 Iterator trait
impl Iterator for Counter {
    type Item = u32;

    fn next(&mut self) -> Option<Self::Item> {
        if self.count < self.max {
            self.count += 1;
            Some(self.count)
        } else {
            None
        }
    }
}

fn main() {
    let counter = Counter::new(5);

    // 可以用在 for 循环
    for num in counter {
        println!("{}", num);  // 1, 2, 3, 4, 5
    }

    // 也可以用迭代器方法
    let counter = Counter::new(10);
    let sum: u32 = counter.filter(|x| x % 2 == 0).sum();
    println!("Sum of even numbers: {}", sum);  // 30
}
```

---

## 16. 模块系统

### 16.1 模块基础

```rust
// ============================================
// 模块定义
// ============================================

// 使用 mod 关键字定义模块
mod front_of_house {
    // 默认私有
    fn seat_at_table() {}

    // pub 公开
    pub fn add_to_waitlist() {}

    // 嵌套模块
    pub mod hosting {
        pub fn add_to_waitlist() {
            // 调用父模块的函数
            super::seat_at_table();  // super 类似 .. 路径
        }

        pub fn seat_at_table() {}
    }

    pub mod serving {
        pub fn take_order() {}
        fn serve_order() {}  // 私有
        fn take_payment() {}  // 私有
    }
}

// ============================================
// 使用模块中的项
// ============================================

fn main() {
    // 绝对路径：从 crate 根开始
    crate::front_of_house::hosting::add_to_waitlist();

    // 相对路径：从当前模块开始
    front_of_house::hosting::add_to_waitlist();

    // 使用 use 引入
    use front_of_house::hosting;
    hosting::add_to_waitlist();  // 直接使用 hosting

    // use 引入具体函数
    use front_of_house::hosting::add_to_waitlist;
    add_to_waitlist();
}

// ============================================
// use 的各种用法
// ============================================

// 引入单个项
use std::collections::HashMap;

// 引入多个项
use std::collections::{HashMap, HashSet, BTreeMap};

// 引入并改名
use std::io::Result as IoResult;

// 引入所有公共项
use std::collections::*;

// 嵌套路径
use std::{cmp::Ordering, io, io::Write};

// self 引入模块本身和子项
use std::io::{self, Write};

// ============================================
// pub use - 重新导出
// ============================================

mod inner {
    pub fn secret_function() {}
}

// 把 inner 的函数公开为当前模块的函数
pub use inner::secret_function;

// 外部可以直接调用 crate::secret_function()
```

### 16.2 文件作为模块

```rust
// 项目结构：
// src/
//   main.rs
//   front_of_house.rs       (front_of_house 模块)
//   front_of_house/
//     hosting.rs            (front_of_house::hosting 子模块)
//     serving.rs            (front_of_house::serving 子模块)

// ============================================
// main.rs
// ============================================

// 声明模块，对应 front_of_house.rs 文件
mod front_of_house;

// 使用模块
use front_of_house::hosting;

fn main() {
    hosting::add_to_waitlist();
}

// ============================================
// front_of_house.rs
// ============================================

// 声明子模块，对应 front_of_house/hosting.rs 文件
pub mod hosting;
pub mod serving;

fn seat_at_table() {}

// ============================================
// front_of_house/hosting.rs
// ============================================

pub fn add_to_waitlist() {
    super::seat_at_table();  // 调用父模块的私有函数
}

pub fn seat_at_table() {}
```

### 16.3 公开性规则

```rust
mod outer {
    // 默认私有，外部无法访问
    fn private_fn() {}

    // pub 公开，外部可以访问
    pub fn public_fn() {}

    // pub(crate) 在 crate 内公开
    pub(crate) fn crate_wide_fn() {}

    // pub(super) 在父模块公开
    pub(super) fn super_wide_fn() {}

    // 结构体字段也可以控制公开性
    pub struct MyStruct {
        pub public_field: i32,      // 公开
        private_field: String,      // 私有
    }

    // 枚举变体默认与枚举相同公开性
    pub enum MyEnum {
        PublicVariant,  // 公开（因为枚举是 pub）
        AnotherVariant,
    }
}

// 使用
fn use_modules() {
    outer::public_fn();  // OK
    // outer::private_fn();  // 错误！私有

    // 创建结构体
    let s = outer::MyStruct {
        public_field: 10,      // OK
        // private_field: String::new(),  // 错误！
    };
}
```

---

## 17. 常用宏

### 17.1 声明宏（macro_rules!）

```rust
// ============================================
// 简单的宏定义
// ============================================

// 宏名称后面加 !
macro_rules! say_hello {
    // () 匹配空参数
    () => {
        println!("Hello!");
    };
}

fn main() {
    say_hello!();  // 输出: Hello!
}

// ============================================
// 带参数的宏
// ============================================

macro_rules! print_value {
    // $x 是参数名，:expr 是类型（表达式）
    ($x:expr) => {
        println!("Value: {}", $x);
    };
}

fn use_print_value() {
    print_value!(42);
    print_value!(1 + 2);
}

// ============================================
// 多个参数
// ============================================

macro_rules! print_sum {
    ($a:expr, $b:expr) => {
        println!("{} + {} = {}", $a, $b, $a + $b);
    };
}

fn use_print_sum() {
    print_sum!(3, 4);  // 3 + 4 = 7
}

// ============================================
// 重复模式（类似可变参数）
// ============================================

macro_rules! vec_of_strings {
    // $(...),* 表示零个或多个，用逗号分隔
    ($($element:expr),*) => {
        {
            let mut temp_vec = Vec::new();
            $(
                temp_vec.push($element.to_string());
            )*
            temp_vec
        }
    };
}

fn use_vec_macro() {
    let v = vec_of_strings!("hello", "world", "foo");
    // vec!["hello".to_string(), "world".to_string(), "foo".to_string()]
}

// ============================================
// 更复杂的例子：类似 vec! 的宏
// ============================================

macro_rules! my_vec {
    // vec![1; 5] -> [1, 1, 1, 1, 1]
    ($elem:expr; $n:expr) => {
        std::vec::from_elem($elem, $n)
    };
    // vec![1, 2, 3]
    ($($x:expr),+ $(,)?) => {
        {
            let mut temp_vec = Vec::new();
            $(
                temp_vec.push($x);
            )+
            temp_vec
        }
    };
}
```

### 17.2 常用标准宏

```rust
fn main() {
    // ============================================
    // 打印宏
    // ============================================

    println!("Hello, {}!", "World");  // 打印并换行
    print!("No newline");              // 打印不换行
    eprintln!("Error: {}", "msg");     // 打印到 stderr

    // format! 返回 String
    let s = format!("{} + {} = {}", 1, 2, 3);

    // ============================================
    // 断言宏
    // ============================================

    assert!(true);                      // 条件必须为 true
    assert_eq!(1 + 1, 2);               // 相等
    assert_ne!(1 + 1, 3);               // 不等
    assert!(true, "Custom message: {}", 42);  // 自定义消息

    // debug 断言（只在 debug 模式生效）
    debug_assert!(true);

    // ============================================
    // 调试宏
    // ============================================

    // dbg! 打印文件名、行号和表达式的值，返回表达式值
    let x = dbg!(1 + 2);  // [src/main.rs:10] 1 + 2 = 3

    // 多个值
    let y = dbg!(x * 2);  // [src/main.rs:13] x * 2 = 6

    // ============================================
    // 其他常用宏
    // ============================================

    // todo!() - 标记未实现的功能，panic 并显示 "not yet implemented"
    fn not_implemented_yet() -> i32 {
        todo!("Need to implement this function")
    }

    // unimplemented!() - 类似 todo!，但语义是"不会实现"

    // panic!() - 立即终止程序
    // panic!("Something went wrong!");

    // unreachable!() - 标记不应该到达的代码
    match Some(5) {
        Some(x) => println!("{}", x),
        None => unreachable!("We know it's Some"),
    }
}

// ============================================
// 属性宏（用于派生）
// ============================================

// #[derive(...)] 自动生成 trait 实现
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct Point {
    x: i32,
    y: i32,
}

// 条件编译
#[cfg(target_os = "windows")]
fn windows_only() {}

#[cfg(not(target_os = "windows"))]
fn non_windows() {}

// 标记测试
#[cfg(test)]
mod tests {
    #[test]
    fn it_works() {
        assert_eq!(2 + 2, 4);
    }
}
```

---

## 18. 动手练习

### 练习 1：实现一个简单的 Agent 状态机

见 `code-examples/exercise1.rs`

**目标**：实现一个带有状态转换的 Agent 结构体，练习枚举、模式匹配和方法。

### 练习 2：实现一个简易的内存存储

见 `code-examples/exercise2.rs`

**目标**：实现类似 OpenFang Memory trait 的简单版本，练习 trait、泛型和错误处理。

### 练习 3：实现迭代器

```rust
// 实现一个 Range 迭代器，支持 step
struct Range {
    current: i32,
    end: i32,
    step: i32,
}

impl Range {
    fn new(start: i32, end: i32) -> Self {
        Self {
            current: start,
            end,
            step: 1,
        }
    }

    fn step(mut self, step: i32) -> Self {
        self.step = step;
        self
    }
}

impl Iterator for Range {
    type Item = i32;

    fn next(&mut self) -> Option<Self::Item> {
        if self.current < self.end {
            let value = self.current;
            self.current += self.step;
            Some(value)
        } else {
            None
        }
    }
}

fn main() {
    // 使用
    for i in Range::new(0, 10).step(2) {
        println!("{}", i);  // 0, 2, 4, 6, 8
    }
}
```

---

## 延伸阅读

### 学习资源

1. **[Rust Book](https://doc.rust-lang.org/book/)** - 官方教程，最权威
2. **[Rust by Example](https://doc.rust-lang.org/rust-by-example/)** - 通过例子学习
3. **[Rustlings](https://github.com/rust-lang/rustlings)** - 交互式练习
4. **[Rust Cheat Sheet](https://cheats.rs/)** - 速查表

### OpenFang 相关代码阅读建议

| 概念 | 推荐阅读文件 |
|------|-------------|
| 所有权/借用 | `crates/openfang-types/src/agent.rs` |
| Trait | `crates/openfang-runtime/src/llm_driver.rs` |
| 错误处理 | `crates/openfang-runtime/src/drivers/openai.rs` |
| 泛型/生命周期 | `crates/openfang-kernel/src/kernel.rs` |
| 异步 | `crates/openfang-runtime/src/runtime.rs` |

### 下一步

完成本章后，继续阅读：

- **[第二章：Cargo 工作空间详解](../02-cargo-workspace/README.md)** - 理解 OpenFang 的 14 个 crate 如何组织
- **[第三章：类型系统与 Trait 详解](../03-types-traits/README.md)** - 深入 OpenFang 的类型设计

---

> **老王的建议**：
>
> 艹，Rust 的语法确实比 JavaScript 复杂多了！但这些复杂性是为了换取性能和安全性。
>
> 不要被所有权搞崩溃——记住这三个原则：
> 1. 每个值都有一个所有者
> 2. 同一时间只有一个所有者
> 3. 所有者离开作用域，值被丢弃
>
> 刚开始写代码会疯狂报错，这是正常的！编译器是你最好的朋友，仔细读错误信息，它比大部分同事都有用。
>
> 崽芽子（我儿子）都能学会，你也肯定行！
