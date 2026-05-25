# paperless-ngx — A community-supported supercharged document management system: scan, index and archive all your documents

## 一、项目概述
(https://github.com/paperless-ngx/paperless-ngx/actions)
(https://crowdin.com/project/paperless-ngx)
(https://docs.paperless-ngx.com)
(https://codecov.io/gh/paperless-ngx/paperless-ngx)
(https://matrix.to//%23paperlessngx%3Amatrix.org)
(https://demo.paperless-ngx.com)

**GitHub：** https://github.com/paperless-ngx/paperless-ngx
**语言：** Python
**⭐ Stars：** 41,134

## 二、核心特性
- Docker 支持，开箱即用
- 标准包管理，依赖安装简单
- README 文档完善，上手容易

## 三、技术实现
项目基于以下关键技术实现：

### 核心文件结构

| 文件 | 说明 |
|------|------|
| `.prettierrc.js` | JS · 0.3 KB |
| `Dockerfile` |  · 9.2 KB |
| `install-paperless-ngx.sh` | SH · 11.8 KB |
| `pyproject.toml` | TOML · 9.6 KB |

### 核心代码示例

**.prettierrc.js**：
```js
const config = {
	// https://prettier.io/docs/en/options.html#semicolons
	semi: false,
	// https://prettier.io/docs/en/options.html#quotes
	singleQuote: true,
	// https://prettier.io/docs/en/options.html#trailing-commas
	trailingComma: 'es5',
	plugins: [require('prettier-plugin-organize-imports')],
}

module.exports = config
```

**Dockerfile**：
```
# syntax=docker/dockerfile:1
# https://github.com/moby/buildkit/blob/master/frontend/dockerfile/docs/reference.md

# Stage: compile-frontend
# Purpose: Compiles the frontend
# Notes:
#  - Does PNPM stuff with Typescript and such
FROM --platform=$BUILDPLATFORM docker.io/node:24-trixie-slim AS compile-frontend

COPY ./src-ui /src/src-ui

WORKDIR /src/src-ui
RUN set -eux \
  && corepack enable \
  && pnpm install

ARG PNGX_TAG_VERSION=
# Add the tag to the environment file if its a tagged dev build
RUN set -eux && \
case "${PNGX_TAG_VERSION}" in \
  dev|beta|fix*|feature*) \
    sed -i -E "s/tag: '([a-z\.]+)'/tag: '${PNGX_TAG_VERSION}'/g" /src/src-ui/src/environments/environment.prod.ts \
    ;; \
esac

RUN set -eux \
  && ./node_modules/.bin/ng build --configuration production

# Stage: s6-overlay-base
# Purpose: Installs s6-overlay and rootfs
```

**install-paperless-ngx.sh**：
```sh
#!/usr/bin/env bash

ask() {
	while true ; do
		if [[ -z $3 ]] ; then
			read -r -p "$1 [$2]: " result
		else
			read -r -p "$1 ($3) [$2]: " result
		fi
		if [[ -z $result ]]; then
			ask_result=$2
			return
		fi
		array=$3
		if [[ -z $3 || " ${array[*]} " =~ ${result} ]]; then
			ask_result=$result
			return
		else
			echo "Invalid option: $result"
		fi
	done
}

ask_docker_folder() {
	while true ; do

		read -r -p "$1 [$2]: " result

		if [[ -z $result ]]; then
			ask_result=$2
```

## 四、快速开始

```bash
bash -c "$(curl -L https://raw.githubusercontent.com/paperless-ngx/paperless-ngx/main/install-paperless-ngx.sh)"
```

## 五、适用场景

- 开发者研究新技术栈和最佳实践
- 项目快速启动和原型开发
- 学习开源项目的设计思路和架构
- 集成到现有项目中作为依赖

## 六、总结
paperless-ngx 是 GitHub Trending 上的热门开源项目，
当前已获得 41,134 ⭐，在技术社区具有较高影响力。
项目代码结构清晰，文档完善，适合深入学习和实际应用。

> 🔗 项目地址：https://github.com/paperless-ngx/paperless-ngx