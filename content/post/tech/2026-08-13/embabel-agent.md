---
title: "Embabel Agent Framework：JVM 平台的智能 Agent 开发框架"
date: 2026-08-13
description: "Embabel Agent Framework 是一个运行在 JVM 上的智能 Agent 开发框架，支持动态规划、目标导向行动规划（GOAP）和多 LLM 混合，由 Spring 创始人打造，让企业级 AI 应用开发更简单、更安全、更可测试。"
author: "Cheman"
slug: embabel-agent
draft: false
categories: ["技术", "开源", "AI"]
tags: ["GitHub", "Java", "Kotlin", "Spring", "AI Agent", "LLM"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Embabel Agent Framework**，一个由 Spring 创始人打造的 JVM 平台智能 Agent 开发框架，支持动态规划和多 LLM 混合，让企业级 AI 应用开发更简单。

## 一、项目概述

Embabel Agent Framework 是一个用于在 JVM 平台上构建智能 Agent 应用的框架，它巧妙地将 LLM 提示交互与代码和领域模型无缝结合，支持目标导向的智能路径规划。该项目由 Spring 框架的创始人开发，采用 Kotlin 编写，同时提供自然的 Java 使用体验。

### 核心特性

- **智能规划引擎**：采用目标导向行动规划（GOAP）算法，支持动态决策和行动选择，能够在运行时根据当前状态重新规划
- **多 LLM 混合**：轻松构建混合多个 LLM 的应用，为不同任务选择最经济高效的模型
- **强类型与面向对象**：所有操作都基于强类型的领域模型，享受完整的重构支持，告别魔法 Map
- **测试友好**：从设计之初就注重可测试性，单元测试和端到端测试都很简单
- **Spring 集成**：建立在 Spring 和 JVM 之上，轻松访问企业级功能和服务
- **多执行模式**：支持 Focused（代码驱动）、Closed（意图分类）、Open（全平台资源）三种执行模式

## 二、技术原理

### 架构设计

Embabel 的核心架构围绕以下概念构建：

- **Actions（动作）**：Agent 执行的步骤
- **Goals（目标）**：Agent 试图达成的结果
- **Conditions（条件）**：在执行动作前或确定目标达成前需要评估的条件
- **Domain Model（领域模型）**：支撑流程的对象，为动作、目标和条件提供信息
- **Plan（计划）**：达成目标的动作序列，由系统动态制定而非程序员硬编码

### 规划算法

Embabel 默认采用 **GOAP（Goal Oriented Action Planning）** 算法，这是一种在游戏 AI 中广泛应用的规划算法：

```kotlin
// GOAP 允许 Agent 动态组合已知步骤
// 系统会在每个动作完成后重新评估状态
// 实现了 OODA 循环（观察-调整-决策-行动）
```

同时支持 **Utility AI** 模式，适用于探索性和开放式任务，通过效用分数而非严格的预置条件选择动作。

### 三种执行模式

1. **Focused 模式**：用户代码请求特定功能，适用于代码驱动的流程（如响应事件）
2. **Closed 模式**：用户意图被分类到特定 Agent，Agent 只执行其定义内的动作
3. **Open 模式**：平台使用所有资源来达成用户意图，可组合多个 Provider 的功能

### 核心代码示例

**Java 版本：**

```java
@Agent(description = "Find news based on a person's star sign")
public class StarNewsFinder {

    private final HoroscopeService horoscopeService;

    @Action
    public StarPerson extractStarPerson(UserInput userInput, Ai ai) {
        return ai
                .withLlm(OpenAiModels.GPT_41)
                .createObjectIfPossible(
                        "Create a person from this user input, extracting their name and star sign: %s"
                                .formatted(userInput.getContent()),
                        StarPerson.class);
    }

    @Action
    public Horoscope retrieveHoroscope(StarPerson starPerson) {
        return new Horoscope(horoscopeService.dailyHoroscope(starPerson.sign()));
    }

    @Action(toolGroups = {CoreToolGroups.WEB})
    public RelevantNewsStories findNewsStories(
            StarPerson person,
            Horoscope horoscope,
            Ai ai) {
        var prompt = """
                %s is an astrology believer with the sign %s.
                Their horoscope for today is:
                    <horoscope>%s</horoscope>
                Given this, use web tools to find %d relevant news stories.
                """.formatted(person.name(), person.sign(), horoscope.summary(), storyCount);
        return ai.withDefaultLlm().createObject(prompt, RelevantNewsStories.class);
    }

    @AchievesGoal(
            description = "Write an amusing writeup for the target person",
            export = @Export(remote = true, name = "starNewsWriteupJava")
    )
    @Action
    public Writeup writeup(StarPerson person, RelevantNewsStories stories, Horoscope horoscope, Ai ai) {
        var llm = LlmOptions.withModel(OpenAiModels.GPT_41_MINI).withTemperature(0.9);
        return ai.withLlm(llm).createObject(prompt, Writeup.class);
    }
}
```

**Kotlin 版本：**

```kotlin
@Agent(description = "Find news based on a person's star sign")
class StarNewsFinder(
    private val horoscopeService: HoroscopeService,
    @param:Value("\${star-news-finder.story.count:5}")
    private val storyCount: Int = 5,
) {

    @Action
    fun extractPerson(userInput: UserInput, ai: Ai): StarPerson =
        ai.withDefaultLlm()
            .createObject("Create a person from this user input: $userInput")

    @Action
    fun retrieveHoroscope(starPerson: StarPerson) =
        Horoscope(horoscopeService.dailyHoroscope(starPerson.sign))

    @Action(toolGroups = [ToolGroup.WEB])
    fun findNewsStories(person: StarPerson, horoscope: Horoscope, ai: Ai): RelevantNewsStories =
        ai.withDefaultLlm().createObject(prompt)

    @AchievesGoal(description = "Write an amusing writeup")
    @Action
    fun writeup(person: StarPerson, relevantNewsStories: RelevantNewsStories, horoscope: Horoscope, ai: Ai): Writeup =
        ai.withLlm(LlmOptions.withModel(model).withTemperature(0.9)).createObject(prompt)
}
```

### 强类型领域模型

```java
@JsonClassDescription("Person with astrology details")
@JsonDeserialize(as = StarPerson.class)
public record StarPerson(
        String name,
        @JsonPropertyDescription("Star sign") String sign
) implements Person {
    // 完全的类型安全，IDE 重构支持
}
```

## 三、安装与快速开始

### 环境要求

- Java 17+
- Maven 或 Gradle
- Docker Desktop 4.43.2+（用于 MCP 工具）
- 至少一个 LLM API Key（OpenAI、Anthropic 等）

### Maven 依赖

从 0.2.0 版本起，直接从 Maven Central 获取：

```xml
<dependency>
    <groupId>com.embabel.agent</groupId>
    <artifactId>embabel-agent-starter</artifactId>
    <version>0.3.0</version>
</dependency>
```

### 环境变量配置

```bash
# 必需
export OPENAI_API_KEY="your-api-key"

# 可选
export ANTHROPIC_API_KEY="your-api-key"
export MINIMAX_API_KEY="your-api-key"
export ZAI_API_KEY="your-api-key"  # 智谱 AI
```

### 快速创建项目

使用模板仓库创建你自己的 Agent 项目：

```bash
# Java 模板
# 访问 https://github.com/embabel/java-agent-template 点击 "Use this template"

# 或 Kotlin 模板
# 访问 https://github.com/embabel/kotlin-agent-template 点击 "Use this template"
```

### 最简运行示例

```bash
# 克隆示例仓库
git clone https://github.com/embabel/embabel-agent-examples
cd embabel-agent-examples/scripts/kotlin
./shell.sh

# 在 Spring Shell 中执行
execute "Lynda is a Scorpio, find news for her" -p -r
```

## 四、使用方法与实战

### 单元测试

Embabel 让 Agent 测试变得简单：

```java
public class StarNewsFinderTest {

    @Test
    void writeupPromptMustContainKeyData() {
        HoroscopeService horoscopeService = mock(HoroscopeService.class);
        StarNewsFinder starNewsFinder = new StarNewsFinder(horoscopeService, 5);
        var context = new FakeOperationContext();
        context.expectResponse(new Writeup("Gonna be a good day"));

        // 构造测试数据
        StarPerson starPerson = new StarPerson("Lynda", "Scorpio");
        RelevantNewsStories stories = new RelevantNewsStories(Arrays.asList(
            new NewsStory("https://fake.com.au", "Cockatoo behavior"),
            new NewsStory("https://morefake.com.au", "Emu movements")
        ));
        Horoscope horoscope = new Horoscope("This is a good day for you");

        // 执行测试
        starNewsFinder.writeup(starPerson, stories, horoscope, context);

        // 验证提示词
        var prompt = context.getLlmInvocations().getFirst().getPrompt();
        assertTrue(prompt.contains(starPerson.getName()));
        assertTrue(prompt.contains(starPerson.sign()));
    }
}
```

### MCP 服务器集成

将 Embabel 作为 MCP 服务器供 Claude Desktop 使用：

```json
// claude_desktop_config.yml
{
  "mcpServers": {
    "embabel": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "http://localhost:8080/sse"]
    }
  }
}
```

### 消费 MCP 服务器

在 `application.yml` 中配置外部 MCP 工具：

```yaml
spring:
  ai:
    mcp:
      client:
        enabled: true
        type: SYNC
        stdio:
          connections:
            docker-mcp:
              command: docker
              args: ["run", "-i", "--rm", "alpine/socat", "STDIO", "TCP:host.docker.internal:8811"]
```

### 多 LLM 混合策略

```java
// 不同任务使用不同模型
@Action
public StarPerson extractPerson(UserInput input, Ai ai) {
    return ai
        .withLlm(OpenAiModels.GPT_41)  // 复杂任务用强模型
        .createObjectIfPossible(prompt, StarPerson.class);
}

@Action
public Writeup writeup(StarPerson person, Ai ai) {
    return ai
        .withLlm(LlmOptions
            .withModel(OpenAiModels.GPT_41_MINI)  // 简单任务用便宜模型
            .withTemperature(0.9))  // 创意任务提高温度
        .createObject(prompt, Writeup.class);
}
```

### 可观测性集成

添加追踪和指标，零代码改动：

```xml
<dependency>
    <groupId>com.embabel.agent</groupId>
    <artifactId>embabel-agent-starter-observability</artifactId>
</dependency>
<dependency>
    <groupId>io.opentelemetry</groupId>
    <artifactId>opentelemetry-exporter-zipkin</artifactId>
</dependency>
```

配置 `application.yml`：

```yaml
embabel:
  agent:
    platform:
      observability:
        enabled: true
        service-name: my-agent-app

management:
  tracing:
    sampling:
      probability: 1.0
  zipkin:
    tracing:
      endpoint: http://localhost:9411/api/v2/spans
```

启动 Zipkin：

```bash
docker run -d -p 9411:9411 openzipkin/zipkin
```

自动追踪的内容包括：
- Agent 生命周期
- 每个动作的执行
- LLM 调用及 token 使用量
- 工具调用输入输出
- 规划和重规划迭代

## 五、常见问题与解决方案

### 1. Maven 依赖解析失败

**问题**：无法解析 `embabel-agent-starter` 依赖。

**解决方案**：
- 0.2.0+ 版本：确保使用 Maven Central，无需额外仓库配置
- 旧版本或 SNAPSHOT：添加 Embabel 仓库

```xml
<repositories>
    <repository>
        <id>embabel-releases</id>
        <url>https://repo.embabel.com/artifactory/libs-release</url>
    </repository>
    <repository>
        <id>embabel-snapshots</id>
        <url>https://repo.embabel.com/artifactory/libs-snapshot</url>
    </repository>
    <!-- Gradle 用户必须添加 Spring Milestones 仓库 -->
    <repository>
        <id>spring-milestones</id>
        <url>https://repo.spring.io/milestone</url>
    </repository>
</repositories>
```

### 2. API Key 配置错误

**问题**：`OPENAI_API_KEY` 未设置或无效。

**解决方案**：
```bash
# 检查环境变量
echo $OPENAI_API_KEY

# 设置环境变量
export OPENAI_API_KEY="sk-..."

# 或在 application.yml 中配置
spring:
  ai:
    openai:
      api-key: ${OPENAI_API_KEY}
```

### 3. MCP 工具无法连接

**问题**：Docker Desktop MCP 工具连接失败。

**解决方案**：
- 确保 Docker Desktop 版本 ≥ 4.43.2
- 在 Docker Desktop 中激活所需 MCP 工具（Brave Search、Fetch、Puppeteer、Wikipedia）
- 检查 `application-docker-desktop.yml` 配置

### 4. 本地模型集成

**问题**：如何使用 Ollama 本地模型？

**解决方案**：

```xml
<dependency>
    <groupId>com.embabel.agent</groupId>
    <artifactId>embabel-agent-starter-ollama</artifactId>
</dependency>
```

启动 Ollama 服务后，Embabel 会自动连接并使所有本地模型可用。

### 5. 测试时 Mock LLM 响应

**问题**：如何在测试中控制 LLM 响应？

**解决方案**：

```java
var context = new FakeOperationContext();
context.expectResponse(new Writeup("Expected output"));
// 执行动作时会使用预设响应
```

## 六、总结

Embabel Agent Framework 为 JVM 平台带来了现代化的 Agent 开发体验。它通过 GOAP 算法实现了真正的动态规划，通过强类型和 Spring 集成确保了企业级的可靠性和可维护性，通过多 LLM 混合实现了成本与能力的平衡。

**为什么选择 Embabel？**

- **比直接使用 Spring AI 更高效**：Embabel 就像 Spring MVC 之于 Servlet API，提供了更高层次的抽象
- **比 Python Agent 框架更适合企业**：无缝集成现有的 JVM 生态系统和基础设施
- **比其他框架更易测试**：从设计之初就注重可测试性，单元测试和集成测试都很简单
- **比硬编码流程更灵活**：动态规划让系统能够完成未被显式编程的任务

无论你是想在现有 Spring 应用中添加 AI 能力，还是构建全新的智能 Agent 应用，Embabel 都是一个值得深入探索的选择。项目提供了丰富的示例和模板，让你能在 5 分钟内启动第一个 Agent。

**项目信息**：
- GitHub: https://github.com/embabel/embabel-agent
- 文档: https://docs.embabel.com/embabel-agent/guide/1.5.0-SNAPSHOT/
- 示例: https://github.com/embabel/embabel-agent-examples
- Discord: https://discord.gg/t6bjkyj93q
