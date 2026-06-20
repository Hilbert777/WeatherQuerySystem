# 天气查询与城市管理系统

一个基于 **Vue 3 + TypeScript + Pinia + Vue Router + ECharts + Node.js Express** 的天气查询与城市管理系统。项目采用“轻量后端 + 前端主导”的实现方式：后端不使用数据库，主要负责隐藏和风天气 API Key、代理第三方天气接口、统一响应格式和内存缓存；前端负责页面交互、城市管理、地图展示、天气数据可视化和用户偏好保存。

当前实现以课程作业本地演示为目标。城市列表、搜索历史、主题和单位设置保存在浏览器 `localStorage` 中；后端保留 `/api/cities` 示例接口，但当前前端城市管理不依赖该接口。

## 项目地址

- 在线演示：https://weather-query-system.vercel.app/
- GitHub 仓库：https://github.com/Hilbert777/WeatherQuerySystem

## 主要功能

### 1. 城市搜索

- 顶部导航栏提供全局城市搜索框。
- 输入城市名后会调用后端城市搜索接口，实时显示城市建议。
- 查询时会进行精确校验，避免输入不存在的城市后跳转到错误详情页。
- 支持中文和英文城市名匹配，例如“上海”或 “Tokyo”。
- 输入不存在的城市时，会在当前页面提示“城市不存在，请重新输入”，不会跳转页面。

### 2. 首页城市管理

- 首页左侧是“我的城市”列表。
- 支持选择城市、删除城市、撤销删除、拖拽排序。
- 城市列表、当前城市、搜索历史、主题和单位设置保存在浏览器 `localStorage` 中。
- 后端提供 `/api/cities` 示例接口，当前前端实际使用本地存储完成城市管理。
- 不需要用户登录，也不需要数据库。

### 3. 中国天气地图

首页默认展示中国地图，用户可以通过地图选择城市。

地图能力包括：

- 支持鼠标拖拽地图。
- 支持滚轮缩放和按钮缩放。
- 拖拽有边界限制。
- 大比例地图只显示省会和重点城市，放大后逐步显示更多地级市。
- 城市图标会根据缩放比例自适应大小，并做碰撞过滤，减少遮挡。
- 缩放超过 500% 后懒加载地级市边界线。
- 首页点击城市后直接进入对应城市详情页。

地图相关页面：

- `/`：首页，中国城市天气地图。
- `/weather-map`：天气地图，地图点位展示天气状态。
- `/warning-map`：预警地图，地图点位展示预警状态。

### 4. 城市详情页

进入 `/city/:cityName` 后可以查看某个城市的完整天气信息。

详情页包含：

- 当前天气主卡片：温度、天气状态、体感温度、更新时间。
- 核心指标：湿度、风速、气压、能见度、降水、云量等。
- 天气预警：展示当前城市生效中的灾害预警。
- 生活建议：运动、洗车、穿衣、紫外线、舒适度、感冒等指数。
- 空气质量：AQI、空气等级、健康建议和污染物浓度。
- 分钟级降水：未来两小时短临降水趋势。
- 逐小时预报：未来 24 小时天气变化。
- 五日趋势图：使用 ECharts 展示未来五天温度和湿度变化。
- 五日详细预报：逐日天气、最高最低温、风力、湿度等。

### 5. 用户偏好

- 支持浅色 / 深色主题切换。
- 支持摄氏度 / 华氏度切换。
- 主题和单位设置会保存到本地，下次打开仍然生效。
- 首页主导航栏和城市详情页顶部操作栏都位于页面顶部，滚动时不固定、不吸顶。

### 6. 轻量后端

后端使用 Node.js Express 实现，不使用数据库。

后端主要负责：

- 从 `.env` 或 `APIkey.txt` 读取和风天气 API Key 和 API Host。
- 代理和风天气 API，避免 Key 暴露在浏览器端。
- 统一接口响应格式。
- 统一错误码和错误提示。
- 使用内存缓存减少重复请求。
- 提供 `/api/cities` 城市列表示例接口，便于展示 RESTful 风格；当前前端城市列表仍以 `localStorage` 为准。

## 技术栈

前端：

- Vue 3
- TypeScript
- Vite
- Pinia
- Vue Router
- ECharts
- CSS 响应式布局

后端：

- Node.js
- Express
- CORS
- dotenv
- 原生 `fetch`
- 内存缓存

第三方数据：

- 和风天气 API
- 本地 GeoJSON 地图数据

## 目录结构

```text
WeatherQuerySystem/
├─ client/                         前端项目
│  ├─ public/
│  │  ├─ data/                     地图 GeoJSON 和城市点位数据
│  │  └─ weather.png               网站图标
│  └─ src/
│     ├─ api/                      前端 API 请求封装
│     ├─ components/               通用组件
│     ├─ data/                     地图城市数据入口
│     ├─ router/                   Vue Router 路由
│     ├─ stores/                   Pinia 状态管理
│     ├─ types/                    TypeScript 类型
│     ├─ utils/                    天气图标、格式化等工具函数
│     └─ views/                    页面视图
├─ server/                         轻量后端
│  ├─ data/cities.json             无数据库城市接口示例数据
│  ├─ services/cache.js            内存缓存工具
│  ├─ services/weatherProvider.js  和风天气 API 封装
│  └─ index.js                     Express 入口
├─ tools/                          数据生成工具脚本
├─ image/                          原始图片资源
├─ .env.example                    环境变量示例
├─ .gitignore
├─ package.json
├─ package-lock.json
├─ README.md
└─ APIkey.txt                      本地 API Key 配置，已被 .gitignore 忽略
```

## 启动前准备

项目需要和风天气 API Key 与 API Host。

推荐方式一：创建 `.env`

```text
QWEATHER_API_KEY=你的和风天气APIKey
QWEATHER_API_HOST=你的和风天气APIHost
```

推荐方式二：使用 `APIkey.txt`

```text
你的和风天气APIKey
你的和风天气APIHost
```

也可以写成：

```text
QWEATHER_API_KEY=你的和风天气APIKey
QWEATHER_API_HOST=你的和风天气APIHost
```

## 安装依赖

在项目根目录运行：

```bash
npm.cmd install
```

如果已经安装过依赖，可以跳过这一步。

## 本地开发启动

需要同时启动后端和前端。建议打开两个终端。

终端 1：启动后端

```bash
npm.cmd run dev:server
```

默认后端地址：

```text
http://127.0.0.1:3001
```

终端 2：启动前端

```bash
npm.cmd run dev:client
```

默认前端地址：

```text
http://127.0.0.1:5173
```

如果 5173 端口被占用，Vite 会在终端输出新的访问地址，请以终端显示为准。

## 页面使用说明

### 首页

打开前端地址后进入首页。

首页主要操作：

- 在顶部搜索框输入城市，点击“查询”进入详情页。
- 在左侧“我的城市”点击城市，进入对应详情页。
- 拖拽左侧城市条目，可以调整城市顺序。
- 点击城市右侧删除按钮，可以删除城市。
- 删除后可点击撤销恢复。
- 在地图上点击城市图标，也可以进入城市详情页。
- 地图支持拖拽、滚轮缩放、放大、缩小和复位。

### 城市详情页

详情页主要操作：

- 点击“返回首页”回到首页。
- 点击“刷新”重新请求当前城市数据。
- 点击温度单位按钮切换摄氏度 / 华氏度。
- 点击主题按钮切换浅色 / 深色。
- 点击主天气卡片中的添加按钮，可以把当前城市加入“我的城市”。

### 天气地图

访问：

```text
http://127.0.0.1:5173/weather-map
```

用于查看全国城市天气点位。点击城市后进入详情页。

### 预警地图

访问：

```text
http://127.0.0.1:5173/warning-map
```

用于查看全国城市预警点位。若城市没有生效预警，会显示安全或中性状态。

## 后端接口概览

所有接口默认返回统一结构：

```json
{
  "success": true,
  "data": {},
  "meta": {
    "cached": false,
    "provider": "qweather",
    "updatedAt": "2026-06-07T00:00:00.000Z"
  }
}
```

失败时返回：

```json
{
  "success": false,
  "error": {
    "code": "CITY_NOT_FOUND",
    "message": "未找到该城市，请检查拼写或更换城市名"
  }
}
```

主要接口：

```text
GET /api/health
GET /api/geo/search?q=上海&limit=5&lang=zh
GET /api/weather/current?city=上海&unit=metric&lang=zh
GET /api/weather/forecast?city=上海&unit=metric&lang=zh
GET /api/weather/summary?city=上海&unit=metric&lang=zh
GET /api/weather/indices?city=上海&types=1,2,3,5,8,9&lang=zh
GET /api/weather/hourly?city=上海&unit=metric&hours=24h&lang=zh
GET /api/weather/minutely?city=上海&lang=zh
GET /api/weather/warnings?city=上海&lang=zh
GET /api/weather/air?city=上海&lang=zh
GET /api/cities
POST /api/cities
DELETE /api/cities/:name
PATCH /api/cities/order
```

说明：

- 天气相关接口会代理和风天气 API，并使用内存缓存减少重复请求。
- `/api/cities` 会读写 `server/data/cities.json`，用于展示无数据库 RESTful 接口。
- 当前前端“我的城市”功能使用 `localStorage`，不会自动同步到 `server/data/cities.json`。

## 版本控制与提交范围

项目的 `.gitignore` 已排除以下本地文件：

- 依赖和构建产物：`node_modules/`、`dist/`、`.vite/`、`.vite-cache/`。
- 本地运行和 QA 产物：`.logs/`、`qa-screenshots/`、`.chrome-qa*/`、`*.log`。
- 本地配置和密钥：`.env`、`.env.*`、`APIkey.txt`，其中 `.env.example` 会保留。
- 课程或个人文档：所有 `*.pdf`，以及除 `README.md` 之外的 `*.md` 文件。

因此仓库建议只提交源码、配置示例、包管理文件和 README；课程 PDF、项目报告、开发记录、截图和真实 API Key 不应提交。

## 构建检查

运行：

```bash
npm.cmd run build
```

构建命令会先执行 TypeScript 类型检查，再执行 Vite 生产构建。

当前项目中 ECharts 构建产物可能会出现 500KB 体积提示，这是 Vite 的性能提示，不影响项目运行。

## Vercel 部署

项目已部署到 Vercel：

```text
https://weather-query-system.vercel.app/
```

Vercel 部署使用 `vercel.json` 指定：

- 构建命令：`npm run build`
- 前端输出目录：`dist/client`
- `/api/*` 请求转发到 `api/[...path].js`
- 其他路径回退到 `index.html`，用于支持 Vue Router 前端路由刷新

线上部署需要在 Vercel 项目环境变量中配置：

```text
QWEATHER_API_KEY=你的和风天气APIKey
QWEATHER_API_HOST=你的和风天气APIHost
```

配置或修改环境变量后，需要重新部署。部署完成后可以先访问：

```text
https://weather-query-system.vercel.app/api/health
```

如果该地址返回 JSON，说明 Vercel 后端函数路由正常；如果返回 HTML，则说明 `/api` 请求被前端路由回退规则拦截。

## 常见问题

### 1. 后端启动后打开根路径显示什么？

访问后端根路径：

```text
http://127.0.0.1:3001/
```

会返回后端服务说明和常用接口列表。真正的前端页面需要访问 Vite 前端地址，例如：

```text
http://127.0.0.1:5173/
```

### 2. 查询城市失败怎么办？

请检查：

- 后端是否已经启动。
- `APIkey.txt` 或 `.env` 是否正确配置。
- API Host 是否填写为和风天气控制台提供的 Host。
- 输入城市是否真实存在。
- 当前和风天气账号是否有对应接口权限。

### 3. 为什么没有使用数据库？

本项目的核心天气数据来自和风天气 API，用户偏好和城市列表保存在浏览器本地即可满足作业需求。引入数据库会增加部署和维护复杂度，但对当前功能价值不大，所以采用无数据库轻量方案。

