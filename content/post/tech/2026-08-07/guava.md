---
title: "Guava 深度解析：Google 的 Java 核心库为何仍是工程标配"
date: 2026-08-07
description: "深入剖析 Google Guava 核心库：不可变集合、Multimap/Multiset、Cache、ListenableFuture、Graph 与哈希工具的设计原理，附 JRE/Android 双版本选型、Maven/Gradle 接入方式与 @Beta、依赖冲突等常见坑的解决方案。"
author: "Cheman"
slug: guava
draft: false
categories: ["技术", "开源", "Java"]
tags: ["Guava", "Java", "Google", "开源", "集合框架", "并发", "工具库"]
showToc: true
TocOpen: false
hidemeta: false
comments: false
disableHLJS: false
disableShare: false
hideSummary: false
searchHidden: true
ShowReadingTime: true
ShowBreadCrumbs: true
ShowPostNavLinks: true
ShowWordCount: true
ShowRssButtonInSectionTermList: true
UseHugoToc: true
---

今天在 GitHub Trending 上看到一个有意思的项目：**google/guava**，它是 Google 内部几乎所有 Java 项目都在用的核心工具库，把集合、并发、缓存、哈希、图论这些"每个团队都会重写一遍"的基础设施做成了工业级标准答案。

## 一、项目概述

### 1.1 项目是什么

Guava（读作 "gwah-vuh"，番石榴）是 Google 开源的一组 Java 核心库。官方定义很朴素：

> Guava is a set of core Java libraries from Google that includes new collection types (such as multimap and multiset), immutable collections, a graph library, and utilities for concurrency, I/O, hashing, primitives, strings, and more!

翻译过来就是：它补齐了 JDK 标准库里"本该有但没有"的那部分。JDK 给了你 `List`、`Map`、`ExecutorService`，但没给你不可变集合的规范实现、没给你一个键对多值的 `Multimap`、没给你可组合的异步 `Future`、也没给你一个开箱即用的本地缓存。Guava 把这些全部补上，并且用 Google 内部海量代码验证过。

它解决的核心问题只有一个：**消除每个 Java 团队都在重复造的那批基础轮子，并把它们造得比你自己写的更正确。**

### 1.2 核心特性一览

| 模块 | 包路径 | 解决什么问题 |
| --- | --- | --- |
| 不可变集合 | `com.google.common.collect` | 线程安全、防御性拷贝、常量集合的正确姿势 |
| 新集合类型 | `com.google.common.collect` | `Multimap` / `Multiset` / `BiMap` / `Table` / `RangeSet` |
| 缓存 | `com.google.common.cache` | 带过期、容量淘汰、自动加载的本地缓存 |
| 并发工具 | `com.google.common.util.concurrent` | `ListenableFuture`、`Service`、`RateLimiter`、`Striped` |
| 图论 | `com.google.common.graph` | `Graph` / `ValueGraph` / `Network` 三层抽象 |
| 哈希 | `com.google.common.hash` | Murmur3、`BloomFilter`、一致性哈希 |
| 字符串 | `com.google.common.base` | `Splitter` / `Joiner` / `CharMatcher` |
| 原语与 I/O | `primitives` / `io` | 免装箱数组工具、`Files` / `ByteStreams` |

### 1.3 项目现状

从仓库的 `pom.xml` 可以读到不少信息：

```xml
<groupId>com.google.guava</groupId>
<artifactId>guava-parent</artifactId>
<version>999.0.0-HEAD-jre-SNAPSHOT</version>
<packaging>pom</packaging>
<inceptionYear>2010</inceptionYear>
<modules>
  <module>guava</module>
  <module>guava-bom</module>
  <module>guava-gwt</module>
  <module>guava-testlib</module>
  <module>guava-tests</module>
</modules>
```

几个关键结论：

1. **2010 年立项**，至今持续维护了十五年以上，稳定版已到 `33.6.0`。
2. **多模块结构**：`guava` 是主库，`guava-bom` 用于统一版本管理，`guava-testlib` 提供集合契约测试套件，`guava-gwt` 支持 GWT 编译。
3. **主干版本号是 `999.0.0-HEAD-...-SNAPSHOT`**，这是 Google 惯用的"永远比任何发行版都新"的技巧，避免快照版被误判为旧版本。
4. Apache License 2.0，商用无忧。

## 二、技术原理

### 2.1 双 Flavor 架构：JRE 与 Android

Guava 最独特的工程设计是**同一份 API 维护两套构建产物**：

```
guava/          → JRE flavor，要求 JDK 1.8+
android/        → Android flavor，兼容低版本 Android API
```

Maven 版本号直接编码 flavor：`33.6.0-jre` 与 `33.6.0-android`。

为什么必须分家？因为 Android 的运行时（尤其是老版本 API level）缺失了大量 Java 8 类库能力：`java.util.stream`、`java.time`、`CompletableFuture` 在低版本 Android 上不可用或需要 desugaring。如果只发一个包，要么放弃 Android 用户，要么在 JRE 上永远不能用 Stream API。

Guava 的解法是**源码级分支 + 构建期同步**：`android` 目录持有一份经过转换的源码副本，把 JRE 版里用到的 Java 8+ 特性替换为兼容实现。从 `pom.xml` 的 properties 里能看到 Android 兼容性校验的痕迹：

```xml
<gummy-bears-api-24-version>0.15.0</gummy-bears-api-24-version>
<animal-sniffer-maven-plugin.version>1.27</animal-sniffer-maven-plugin.version>
```

`animal-sniffer` 是字节码级 API 签名检查插件，`gummy-bears-api-24` 是 Android API Level 24 的签名描述文件。也就是说，Android flavor 在编译期就会被机器强制校验"没有调用任何 API 24 之外的方法"，而不是靠人工 code review。这是大型兼容性项目值得抄的做法。

### 2.2 不可变集合：不只是 `Collections.unmodifiableList`

很多人以为 `ImmutableList` 等价于 `Collections.unmodifiableList`，这是最常见的误解。

```java
// JDK 方式：只是一个"只读视图"，底层 list 变了它也跟着变
List<String> backing = new ArrayList<>(List.of("a", "b"));
List<String> view = Collections.unmodifiableList(backing);
backing.add("c");
System.out.println(view); // [a, b, c] —— 被"篡改"了！

// Guava 方式：真正的拷贝 + 结构不可变
ImmutableList<String> safe = ImmutableList.copyOf(backing);
backing.add("d");
System.out.println(safe); // [a, b, c] —— 纹丝不动
```

`ImmutableList` 的设计要点有三条：

1. **真拷贝语义**：`copyOf` 会在必要时复制底层数组，切断与源集合的联系。
2. **内存紧凑**：内部就是一个 `Object[]`，没有 `ArrayList` 的扩容余量，也没有 `modCount` 之类的可变状态字段。`ImmutableMap` 也用开放寻址的紧凑哈希表，比 `HashMap` 的 `Node` 链表节点省下大量对象头开销。
3. **`copyOf` 幂等优化**：如果传入的已经是 `ImmutableList`，直接返回原对象，零成本。

构造方式有三种，各有适用场景：

```java
// 1. 字面量，元素数量已知且不多
ImmutableSet<String> STATUSES = ImmutableSet.of("INIT", "RUNNING", "DONE");

// 2. Builder，元素来自循环/条件分支
ImmutableMap.Builder<String, Integer> builder = ImmutableMap.builder();
for (Item item : items) {
    if (item.valid()) builder.put(item.key(), item.weight());
}
ImmutableMap<String, Integer> weights = builder.buildOrThrow();  // 重复 key 直接抛异常

// 3. Stream Collector
ImmutableList<String> names = users.stream()
    .map(User::name)
    .collect(ImmutableList.toImmutableList());
```

注意 `buildOrThrow()` 与旧的 `build()`：前者遇到重复 key 会明确抛 `IllegalArgumentException`，后者行为相同但语义不够显式。新代码一律用 `buildOrThrow()`。

### 2.3 新集合类型：把"业务里天天手写的结构"标准化

**Multimap —— 告别 `Map<K, List<V>>`**

```java
// 手写版：每次 put 都要判空初始化
Map<String, List<Order>> byUser = new HashMap<>();
byUser.computeIfAbsent(uid, k -> new ArrayList<>()).add(order);

// Guava 版
ListMultimap<String, Order> byUser = ArrayListMultimap.create();
byUser.put(uid, order);                    // 自动建 list
List<Order> orders = byUser.get(uid);      // 不存在返回空 list，而非 null
Map<String, Collection<Order>> asMap = byUser.asMap();  // 需要时再转回去
```

`Multimap` 家族按 value 容器类型分：`ArrayListMultimap`（允许重复、有序）、`HashMultimap`（去重、无序）、`LinkedHashMultimap`（去重、保序）、`TreeMultimap`（排序）。选型即语义声明，比 `Map<K, Set<V>>` 这种类型签名更直观。

**Multiset —— 计数器的正解**

```java
Multiset<String> wordCount = HashMultiset.create();
for (String w : words) {
    wordCount.add(w);                 // 无需 getOrDefault(w, 0) + 1
}
int n = wordCount.count("guava");     // 不存在返回 0
// 按频次降序
for (Multiset.Entry<String> e : Multisets.copyHighestCountFirst(wordCount).entrySet()) {
    System.out.println(e.getElement() + " -> " + e.getCount());
}
```

**BiMap 与 Table**

```java
// 双向映射，强制 value 唯一
BiMap<String, Integer> codes = HashBiMap.create();
codes.put("CN", 86);
String country = codes.inverse().get(86);   // "CN"

// 二维表，替代 Map<R, Map<C, V>>
Table<String, String, Double> priceTable = HashBasedTable.create();
priceTable.put("SKU-1", "CN", 99.0);
priceTable.put("SKU-1", "US", 15.9);
Map<String, Double> skuRow = priceTable.row("SKU-1");     // 按行取
Map<String, Double> cnColumn = priceTable.column("CN");   // 按列取
```

`Table` 的价值在于**行列对称**：嵌套 Map 只能高效按外层 key 查，而 `Table` 的 `column()` 让"按列聚合"变成一等操作。

### 2.4 缓存：LoadingCache 的淘汰与加载模型

`CacheBuilder` 是 Guava 里设计感最强的组件之一，它把缓存的四个正交维度拆成独立配置：

```java
LoadingCache<Long, UserProfile> cache = CacheBuilder.newBuilder()
    .maximumSize(10_000)                              // 容量维度：LRU 近似淘汰
    .expireAfterWrite(Duration.ofMinutes(10))         // 写后过期：保证数据新鲜度
    .refreshAfterWrite(Duration.ofMinutes(1))         // 写后刷新：异步续期，避免击穿
    .concurrencyLevel(8)                              // 并发维度：分段锁数量
    .recordStats()                                    // 可观测性
    .build(new CacheLoader<Long, UserProfile>() {
        @Override
        public UserProfile load(Long uid) {
            return userDao.findById(uid);
        }
        @Override
        public ListenableFuture<UserProfile> reload(Long uid, UserProfile old) {
            return executor.submit(() -> userDao.findById(uid));  // 异步 reload
        }
    });

UserProfile p = cache.getUnchecked(uid);
System.out.println(cache.stats().hitRate());
```

两个容易混淆的点：

- **`expireAfterWrite` vs `refreshAfterWrite`**：前者到期后条目变为不可用，下一次 `get` 会**阻塞**加载；后者到期后条目仍可用，`get` 会**返回旧值并触发后台刷新**。生产环境通常两者组合使用（refresh 时间 < expire 时间），既保新鲜又避免缓存击穿。
- **淘汰是惰性的**：Guava Cache 没有后台清理线程，过期条目在下一次读写访问时才被回收。如果一个 key 长期不被访问，它的内存不会自动释放，需要手动 `cleanUp()`。

底层实现上，`LocalCache` 借鉴了 JDK 7 `ConcurrentHashMap` 的**分段锁（Segment）**结构，每段维护自己的 LRU 访问队列和写入队列，因此淘汰是"每段近似 LRU"而非全局严格 LRU。这是吞吐与精确性的经典权衡。

### 2.5 ListenableFuture：可组合异步的先驱

JDK 5 的 `Future` 只能 `get()` 阻塞，无法注册回调。Guava 在 `CompletableFuture`（Java 8）出现前多年就给出了答案：

```java
ListeningExecutorService pool =
    MoreExecutors.listeningDecorator(Executors.newFixedThreadPool(8));

ListenableFuture<byte[]> raw = pool.submit(() -> fetchRemote(url));

// transform：同步映射
ListenableFuture<Doc> doc = Futures.transform(raw, Doc::parse, pool);

// transformAsync：返回 Future 的链式调用，避免 Future<Future<T>>
ListenableFuture<Result> result =
    Futures.transformAsync(doc, d -> pool.submit(() -> index(d)), pool);

// 聚合多个
ListenableFuture<List<Result>> all = Futures.allAsList(f1, f2, f3);

Futures.addCallback(result, new FutureCallback<Result>() {
    @Override public void onSuccess(Result r) { log.info("ok {}", r); }
    @Override public void onFailure(Throwable t) { log.error("fail", t); }
}, pool);
```

设计上的两个关键点：

1. **回调必须显式传 Executor**。Guava 刻意不提供隐式默认线程池，强迫开发者思考"回调跑在哪个线程"，避免 `CompletableFuture` 里 ForkJoinPool 公共池被阻塞任务打满的经典事故。
2. **`transform` 与 `transformAsync` 分离**，用类型系统消除 `Future<Future<T>>` 的嵌套地狱，本质就是 map 与 flatMap。

即便今天有了 `CompletableFuture`，`ListenableFuture` 在 gRPC-Java 等生态里依然是事实标准，Guava 也提供了 `Futures.toCompletableFuture` 做互转桥接。

### 2.6 Graph 库：三层抽象的图论建模

`com.google.common.graph` 是 Guava 里被低估的模块，它把图抽象成三个递进层次：

| 接口 | 边的含义 | 适用场景 |
| --- | --- | --- |
| `Graph<N>` | 边只表示"连接" | 依赖关系、可达性判断 |
| `ValueGraph<N, V>` | 边携带一个值 | 带权图、最短路 |
| `Network<N, E>` | 边是独立一等对象 | 多重边、平行边（如多条航线） |

```java
MutableGraph<String> deps = GraphBuilder.directed()
    .allowsSelfLoops(false)
    .expectedNodeCount(100)
    .build();

deps.putEdge("service-api", "service-core");
deps.putEdge("service-web", "service-api");

Set<String> downstream = deps.successors("service-api");   // 我依赖谁
Set<String> upstream   = deps.predecessors("service-api"); // 谁依赖我
boolean reachable = Graphs.reachableNodes(deps, "service-web").contains("service-core");
boolean hasCycle  = Graphs.hasCycle(deps);
```

它的核心设计哲学是**只做数据结构，不做算法**。Guava Graph 不提供 Dijkstra、不提供拓扑排序（`Graphs` 里只有极少数如 `hasCycle`、`transitiveClosure`），因为算法的变体太多。它提供的是一个正确、类型安全、支持有向/无向/自环/并行边配置的容器，算法留给你自己写。这与 JGraphT 那类"全家桶"路线形成鲜明对比。

### 2.7 哈希与 BloomFilter

```java
HashFunction hf = Hashing.murmur3_128();
HashCode code = hf.newHasher()
    .putLong(userId)
    .putString(email, StandardCharsets.UTF_8)
    .putBoolean(isVip)
    .hash();

// 一致性哈希：节点数变化时最小化重映射
int bucket = Hashing.consistentHash(code, shardCount);

// 布隆过滤器：亿级去重，内存换准确率
BloomFilter<CharSequence> filter =
    BloomFilter.create(Funnels.stringFunnel(UTF_8), 10_000_000, 0.001);
filter.put(url);
if (filter.mightContain(candidate)) { /* 可能存在，需回源确认 */ }
```

`Hasher` 的链式 `putXxx` 本质是一个**增量流式哈希**接口，避免了先拼字符串再哈希带来的中间对象开销和歧义（`"ab"+"c"` 与 `"a"+"bc"` 拼出来一样，而流式 put 通过长度前缀可区分）。

### 2.8 字符串与原语工具

```java
// Splitter：行为完全可控，不像 String.split 有正则和尾部空串的怪癖
List<String> parts = Splitter.on(',')
    .trimResults()
    .omitEmptyStrings()
    .limit(3)
    .splitToList("a, b, , c, d");   // [a, b, c, d] 前三段

// Joiner
String s = Joiner.on(" | ").skipNulls().join(list);
String kv = Joiner.on('&').withKeyValueSeparator('=').join(paramMap);

// CharMatcher：字符集合的函数式操作
String digits = CharMatcher.inRange('0', '9').retainFrom(input);
String clean  = CharMatcher.whitespace().collapseFrom(raw, ' ');

// 原语工具：避免 int[] ↔ Integer[] 装箱
int max = Ints.max(array);
List<Integer> view = Ints.asList(array);   // 视图，零拷贝
```

`Splitter` 与 `String.split()` 的差异值得单说：`String.split(",")` 会丢弃尾部空串（`"a,,".split(",")` 返回长度 2），且参数是正则表达式，遇到 `.` `|` 这类字符要转义。`Splitter` 默认按字面量分割、保留所有空串，所有行为通过链式方法显式开启——**把隐式约定变成显式配置**，这是 Guava 贯穿全库的 API 设计原则。

## 三、安装与快速开始

### 3.1 环境要求

- **JRE flavor**：JDK 1.8 或更高
- **Android flavor**：见官方 Android 说明，源码位于仓库 `android` 目录
- 构建 Guava 本身可能需要 JDK 11+，但产物在 JDK 8 上正常运行

### 3.2 Maven 接入

```xml
<dependency>
  <groupId>com.google.guava</groupId>
  <artifactId>guava</artifactId>
  <version>33.6.0-jre</version>
  <!-- Android 项目改为: <version>33.6.0-android</version> -->
</dependency>
```

多模块项目推荐先引 BOM 统一版本：

```xml
<dependencyManagement>
  <dependencies>
    <dependency>
      <groupId>com.google.guava</groupId>
      <artifactId>guava-bom</artifactId>
      <version>33.6.0-jre</version>
      <type>pom</type>
      <scope>import</scope>
    </dependency>
  </dependencies>
</dependencyManagement>
```

### 3.3 Gradle 接入

```gradle
dependencies {
  // 1. 仅在实现中使用 Guava
  implementation("com.google.guava:guava:33.6.0-jre")

  // 2. 公开 API 中出现 Guava 类型
  api("com.google.guava:guava:33.6.0-jre")

  // 3. Android - 仅实现中使用
  implementation("com.google.guava:guava:33.6.0-android")

  // 4. Android - 公开 API 中使用
  api("com.google.guava:guava:33.6.0-android")
}
```

`api` 与 `implementation` 的选择直接影响下游：如果你的公开方法签名里出现了 `ImmutableList`，必须用 `api`，否则下游编译期看不到该类型。

### 3.4 使用 Snapshot 版本

想尝鲜主干功能：

```xml
<version>999.0.0-HEAD-jre-SNAPSHOT</version>
<!-- Android: 999.0.0-HEAD-android-SNAPSHOT -->
```

配套的 [Snapshot API Javadoc](https://guava.dev/releases/snapshot-jre/api/docs/) 和 [API Diffs](https://guava.dev/releases/snapshot-jre/api/diffs/) 可查。另外有个实用小技巧：把类名直接接在 `guava.dev` 后面就能跳转 Javadoc，比如 [guava.dev/ImmutableList](https://guava.dev/ImmutableList)。

### 3.5 最简运行示例

```java
import com.google.common.base.Joiner;
import com.google.common.base.Splitter;
import com.google.common.collect.ImmutableList;
import com.google.common.collect.HashMultiset;
import com.google.common.collect.Multiset;

public class GuavaHello {
    public static void main(String[] args) {
        ImmutableList<String> langs = ImmutableList.of("Java", "Go", "Rust", "Java");

        Multiset<String> counter = HashMultiset.create(langs);
        System.out.println("Java 出现次数: " + counter.count("Java"));   // 2

        System.out.println(Joiner.on(" / ").join(langs));                // Java / Go / Rust / Java

        System.out.println(Splitter.on('/')
            .trimResults()
            .omitEmptyStrings()
            .splitToList("a / b // c"));                                  // [a, b, c]
    }
}
```

## 四、使用方法与实战

### 4.1 基础用法：防御性编程与参数校验

```java
import static com.google.common.base.Preconditions.*;

public Order createOrder(String userId, int quantity, BigDecimal price) {
    checkNotNull(userId, "userId 不能为空");
    checkArgument(quantity > 0, "quantity 必须为正数，实际为 %s", quantity);
    checkArgument(price.signum() > 0, "price 必须为正数");
    checkState(inventory.isReady(), "库存服务尚未初始化");
    // ...
}
```

`Preconditions` 的错误消息用 `%s` 占位符而非字符串拼接，**只有在校验失败时才做格式化**，避免热路径上无谓的字符串构造开销。这是"快速失败 + 零成本抽象"的典型体现。

### 4.2 进阶：用 Table + Multimap 做数据聚合

场景：给定一批订单，需要输出「每个城市 × 每个品类」的 GMV，同时保留每个城市的订单明细。

```java
public class SalesAggregator {

    private final Table<String, String, BigDecimal> gmv = HashBasedTable.create();
    private final ListMultimap<String, Order> byCity = ArrayListMultimap.create();

    public void accept(Order o) {
        byCity.put(o.city(), o);
        BigDecimal cur = gmv.get(o.city(), o.category());
        gmv.put(o.city(), o.category(), cur == null ? o.amount() : cur.add(o.amount()));
    }

    /** 某城市各品类 GMV */
    public Map<String, BigDecimal> cityBreakdown(String city) {
        return ImmutableMap.copyOf(gmv.row(city));
    }

    /** 某品类在全国各城市的分布（Table 的列视图，嵌套 Map 做不到的能力） */
    public Map<String, BigDecimal> categoryAcrossCities(String category) {
        return ImmutableMap.copyOf(gmv.column(category));
    }

    /** Top N 城市 */
    public List<String> topCities(int n) {
        return byCity.keySet().stream()
            .sorted(Comparator.comparing(
                (String c) -> gmv.row(c).values().stream()
                    .reduce(BigDecimal.ZERO, BigDecimal::add)).reversed())
            .limit(n)
            .collect(ImmutableList.toImmutableList());
    }
}
```

### 4.3 进阶：缓存 + 异步 + 限流三件套

一个典型的外部服务调用封装：

```java
public class RemoteProfileService {

    private final RateLimiter limiter = RateLimiter.create(200.0);  // QPS 上限 200
    private final ListeningExecutorService pool =
        MoreExecutors.listeningDecorator(Executors.newFixedThreadPool(16));

    private final LoadingCache<Long, Profile> cache = CacheBuilder.newBuilder()
        .maximumSize(50_000)
        .expireAfterWrite(Duration.ofMinutes(30))
        .refreshAfterWrite(Duration.ofMinutes(5))
        .recordStats()
        .build(new CacheLoader<Long, Profile>() {
            @Override public Profile load(Long id) {
                limiter.acquire();               // 回源前限流，保护下游
                return httpClient.getProfile(id);
            }
            @Override public ListenableFuture<Profile> reload(Long id, Profile old) {
                return pool.submit(() -> {
                    limiter.acquire();
                    return httpClient.getProfile(id);
                });
            }
        });

    public Profile get(long id) {
        return cache.getUnchecked(id);
    }

    public ListenableFuture<List<Profile>> batchAsync(Collection<Long> ids) {
        List<ListenableFuture<Profile>> futures = ids.stream()
            .map(id -> pool.<Profile>submit(() -> get(id)))
            .collect(ImmutableList.toImmutableList());
        return Futures.successfulAsList(futures);   // 部分失败不整体失败，失败项为 null
    }

    public CacheStats stats() {
        return cache.stats();
    }
}
```

注意 `allAsList` 与 `successfulAsList` 的区别：前者任一失败则整体失败，后者容忍部分失败（失败位置填 `null`）。批量场景通常需要后者。

### 4.4 实战：用 Graph 做服务依赖环检测

微服务架构里最常见的治理需求——检测循环依赖：

```java
public class DependencyChecker {

    public static Optional<String> check(Map<String, List<String>> declared) {
        MutableGraph<String> graph = GraphBuilder.directed()
            .allowsSelfLoops(true)
            .build();

        declared.forEach((svc, deps) -> {
            graph.addNode(svc);
            deps.forEach(d -> graph.putEdge(svc, d));
        });

        if (Graphs.hasCycle(graph)) {
            return Optional.of("检测到循环依赖，涉及节点: " + findCycleNodes(graph));
        }
        return Optional.empty();
    }

    /** 反复剥离出度为 0 的节点（Kahn 算法逆向），剩下的即环上节点 */
    private static Set<String> findCycleNodes(Graph<String> g) {
        MutableGraph<String> copy = Graphs.copyOf(g);
        boolean changed = true;
        while (changed) {
            changed = false;
            for (String n : ImmutableList.copyOf(copy.nodes())) {
                if (copy.successors(n).isEmpty()) {
                    copy.removeNode(n);
                    changed = true;
                }
            }
        }
        return ImmutableSet.copyOf(copy.nodes());
    }
}
```

这里体现了前文说的设计哲学：Guava 提供 `hasCycle` 这种通用判定和 `copyOf`、`removeNode` 这些结构操作，但"找出环上具体节点"这种业务定制逻辑留给你自己实现，代码量也就十几行。

### 4.5 实战：BloomFilter 做爬虫 URL 去重

```java
public class UrlDeduper {

    // 1 亿 URL，1‰ 误判率，约占 170MB 内存（对比 HashSet 存原串需数 GB）
    private final BloomFilter<CharSequence> seen =
        BloomFilter.create(Funnels.stringFunnel(StandardCharsets.UTF_8),
                           100_000_000L, 0.001);

    private final Set<String> confirmSet = ConcurrentHashMap.newKeySet();

    public boolean shouldCrawl(String url) {
        String norm = normalize(url);
        if (!seen.mightContain(norm)) {
            seen.put(norm);        // 一定没见过，直接放行
            return true;
        }
        // 可能见过：走精确集合二次确认，消除误判
        return confirmSet.add(norm);
    }

    private String normalize(String url) {
        return CharMatcher.whitespace().trimFrom(url).toLowerCase(Locale.ROOT);
    }
}
```

BloomFilter 的核心特性是**只有假阳性、没有假阴性**：`mightContain` 返回 `false` 一定没有，返回 `true` 可能有。所以正确的用法永远是"false 走快路径，true 走确认路径"。

## 五、常见问题与解决方案

### 5.1 依赖冲突：`NoSuchMethodError` / `NoClassDefFoundError`

**现象**：运行时抛 `java.lang.NoSuchMethodError: com.google.common.base.Preconditions.checkArgument(...)`。

**原因**：classpath 上存在多个 Guava 版本，常见于同时依赖了 Hadoop、Spark、Elasticsearch、Firebase 等自带老版 Guava 的库。

**排查与修复**：

```bash
# Maven：查看依赖树
mvn dependency:tree -Dincludes=com.google.guava:guava

# Gradle
./gradlew :app:dependencyInsight --dependency guava
```

修复方式按推荐度排序：

```xml
<!-- 1. 用 BOM 或 dependencyManagement 强制统一版本（首选） -->
<dependencyManagement>
  <dependencies>
    <dependency>
      <groupId>com.google.guava</groupId>
      <artifactId>guava</artifactId>
      <version>33.6.0-jre</version>
    </dependency>
  </dependencies>
</dependencyManagement>

<!-- 2. 排除传递依赖 -->
<dependency>
  <groupId>org.apache.hadoop</groupId>
  <artifactId>hadoop-common</artifactId>
  <exclusions>
    <exclusion>
      <groupId>com.google.guava</groupId>
      <artifactId>guava</artifactId>
    </exclusion>
  </exclusions>
</dependency>
```

如果冲突无法调和（比如两个库要求的 Guava 版本互不兼容），终极方案是 **shade/relocate**：用 `maven-shade-plugin` 把你自己用的 Guava 重定位到独立包名，物理隔离。

### 5.2 运行时缺少 `failureaccess`

**现象**：`NoClassDefFoundError: com/google/common/util/concurrent/internal/InternalFutureFailureAccess`。

**原因**：README 中明确警告：

> Guava has one dependency that is needed for linkage at runtime: `com.google.guava:failureaccess:1.0.3`.

这是 Guava 唯一的运行时依赖，用于解决 `AbstractFuture` 的跨版本兼容问题。Maven/Gradle 会自动传递，但如果你手动下 jar、用 shade 打包时排除了它、或用 OSGi/自定义 classloader，就会踩坑。

**解决**：显式加上依赖，或检查 shade 配置没有把它过滤掉：

```xml
<dependency>
  <groupId>com.google.guava</groupId>
  <artifactId>failureaccess</artifactId>
  <version>1.0.3</version>
</dependency>
```

除此之外 Guava 还有若干 **annotation-only 依赖**（如 `jsr305`、`checker-qual`、`error_prone_annotations`），这些只在编译期需要，运行时缺失通常无害。

### 5.3 用了 `@Beta` API 导致库升级炸裂

README 里的第一条警告就是这个：

> APIs marked with the `@Beta` annotation at the class or method level are subject to change. They can be modified in any way, or even removed, at any time.

**判断规则**：

- 你写的是**应用**（最终可执行程序）→ 用 `@Beta` API 风险可控，升级时改一改就行。
- 你写的是**库**（会出现在别人 classpath 上）→ **绝对不要**直接用 `@Beta` API。因为你的用户可能持有不同版本的 Guava，`@Beta` 方法在他们那边可能不存在。

**工程化防护**：接入 [Guava Beta Checker](https://github.com/google/guava-beta-checker)，它是一个 Error Prone 插件，编译期就能把 `@Beta` 调用报成错误：

```xml
<plugin>
  <artifactId>maven-compiler-plugin</artifactId>
  <configuration>
    <compilerArgs>
      <arg>-Xplugin:ErrorProne -Xep:BetaApi:ERROR</arg>
    </compilerArgs>
  </configuration>
</plugin>
```

另一个好消息是：**非 `@Beta` 的 API 承诺无限期二进制兼容**，最后一次移除非 Beta API 是 Guava 21.0，即便标了 `@Deprecated` 也会保留。这个承诺是 Guava 敢在超大规模代码库里铺开的根本原因。

### 5.4 Android 项目选错 flavor / 方法数超限

**现象一**：Android 上运行报 `NoSuchMethodError` 涉及 `java.util.stream` 或 `java.time`。

**原因**：误用了 `-jre` 版本。

**解决**：换成 `-android`：

```gradle
implementation("com.google.guava:guava:33.6.0-android")
```

**现象二**：`Cannot fit requested classes in a single dex file`（65536 方法数上限）。

**解决**：Guava 全量引入会带来上万方法数。开启 R8/ProGuard 收缩通常能砍掉 90%：

```gradle
android {
    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

Debug 构建可临时开启 multidex 应急。

### 5.5 缓存内存不释放 / OOM

**现象**：配了 `expireAfterWrite` 但堆内存持续增长。

**原因**：前文提到的惰性淘汰机制——Guava Cache 没有后台清理线程，过期条目只在访问时才被回收。冷 key 会一直占着内存。

**解决**：

```java
// 方案 1：定时主动清理
scheduler.scheduleAtFixedRate(cache::cleanUp, 1, 1, TimeUnit.MINUTES);

// 方案 2：加容量上限兜底（强烈建议永远配置）
CacheBuilder.newBuilder()
    .maximumSize(10_000)
    // 或按权重计算，适合 value 大小差异大的场景
    .maximumWeight(100_000_000)
    .weigher((String k, byte[] v) -> v.length)
    .build(loader);

// 方案 3：软引用（不推荐，GC 行为不可预测，可能引发长 STW）
CacheBuilder.newBuilder().softValues().build(loader);
```

**永远不要只配 `expireAfterWrite` 而不配 `maximumSize`**，这是 Guava Cache 最常见的生产事故。

### 5.6 `LoadingCache.get()` 阻塞导致线程堆积

**现象**：缓存 miss 时大量线程卡在 `LocalCache.get`。

**原因**：Guava Cache 对同一 key 的并发加载会加锁——第一个线程执行 `load()`，其余线程阻塞等待。这本身是防击穿的正确设计，但如果 `load()` 是慢 RPC 且超时设置过长，线程池会被打满。

**解决**：

```java
// 1. load 内部设置严格超时
@Override public Profile load(Long id) {
    return httpClient.getProfile(id, Duration.ofMillis(300));
}

// 2. 用 refreshAfterWrite 让续期走异步，读请求永不阻塞
.refreshAfterWrite(Duration.ofMinutes(1))
.expireAfterWrite(Duration.ofMinutes(10))

// 3. 预热关键 key，避免冷启动雪崩
hotIds.forEach(id -> cache.refresh(id));
```

### 5.7 `com.google.common.io` 在非 Linux 环境行为异常

README 第 6 条警告：

> For the mainline flavor, we test the libraries using a range of OpenJDK versions on Linux and Windows. Some features, especially in `com.google.common.io`, may not work correctly in non-Linux environments.

具体表现为文件权限、符号链接、路径分隔符相关 API 在 Windows/macOS 上可能与预期不符。**建议**：跨平台项目中，文件系统操作优先用 JDK 7+ 的 `java.nio.file.Files` / `Path`，只在 `ByteStreams`、`CharStreams`、`Closer` 这类纯流处理场景使用 Guava I/O。

### 5.8 序列化兼容性陷阱

README 第 4 条警告：

> Serialized forms of ALL objects are subject to change unless noted otherwise. Do not persist these and assume they can be read by a future version.

**这意味着**：绝对不要把 `ImmutableList`、`Multimap`、`Table` 的 Java 原生序列化字节流写入数据库、Redis 或磁盘。Guava 升级后可能完全读不出来。

**正确做法**：持久化时转成 JSON / Protobuf / Avro 等稳定格式：

```java
// ❌ 危险
redis.set(key, SerializationUtils.serialize(immutableMap));

// ✅ 安全
redis.set(key, gson.toJson(new LinkedHashMap<>(immutableMap)));
```

同理，README 第 5 条警告 Guava 的类**没有针对恶意调用者做防护**，不要用它们在受信与不受信代码之间传递数据。

## 六、总结

Guava 是那种「不炫技但极其耐用」的项目。回看它十五年的演进，有几点特别值得学习：

**1. API 设计上，把隐式变显式。** `Splitter` 不猜你要不要 trim，`Futures` 不猜你回调跑哪个线程，`Preconditions` 不猜你的错误消息——所有行为都要求你写出来。代价是稍微啰嗦，收益是代码可读、行为可预期、review 时一眼看穿意图。

**2. 兼容性承诺是靠工程手段兑现的，不是靠自律。** `animal-sniffer` 卡 Android API 签名、Beta Checker 卡实验 API 使用、`999.0.0-HEAD` 版本号避免快照被误判——每一条人为约定背后都有一个机器强制的检查点。

**3. 只做数据结构不做算法，是一种克制。** Graph 模块不提供 Dijkstra，Cache 不提供分布式一致性，这些边界划分让 Guava 保持了「基础设施」的定位，而不是变成什么都想管的框架。

**4. 即便 JDK 在追赶，Guava 依然不可替代。** Java 9 有了 `List.of()`，Java 8 有了 `CompletableFuture` 和 `Stream`，但 `Multimap`、`Table`、`RangeSet`、`BloomFilter`、`Graph`、`RateLimiter` 这些依然没有标准库对应物。JDK 抄走的是最通用的 20%，剩下 80% 仍是 Guava 的主场。

**选型建议**：

- **新 Java 服务端项目**：建议默认引入，至少用上 `ImmutableXxx` + `Preconditions` + `Splitter/Joiner`，成本极低收益立现。
- **Android 项目**：务必用 `-android` flavor 并开启 R8 收缩；如果只需要少量工具，考虑手写以控制包体。
- **写公共库**：可以用，但必须避开 `@Beta`，并考虑 shade 隔离以免污染下游 classpath。
- **已有 Spring/Hutool 等工具库的项目**：不必推倒重来，但 Guava 的集合类型和缓存能力仍有明显差异化价值，可按模块渐进引入。

最后附上项目地址与学习资源：

- GitHub：<https://github.com/google/guava>
- 官方用户指南 Guava Explained：<https://github.com/google/guava/wiki/Home>
- Javadoc 快速跳转：<https://guava.dev/api>，或直接 `guava.dev/<类名>`
- Beta Checker：<https://github.com/google/guava-beta-checker>

License 为 Apache 2.0，可放心商用。
