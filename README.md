# 喝药打卡 PWA MVP

一个移动端优先的喝药打卡 MVP。技术栈：

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth + PostgreSQL
- PWA manifest + service worker
- Web Push 后台提醒

## 安装依赖

```bash
npm install
```

## 配置环境变量

在项目根目录创建 `.env.local`：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:you@example.com
CRON_SECRET=replace-with-a-long-random-string
```

Supabase 的 Project URL、anon key、service role key 可以在 Supabase Dashboard 的 Project Settings -> API 中找到。`service role key` 只能放在服务器环境变量里。

也可以复制模板：

```bash
copy .env.example .env.local
```

Linux/macOS 服务器上可以使用：

```bash
cp .env.example .env.production
```

## 初始化 Supabase 数据库

先在 Supabase SQL Editor 执行：

```sql
-- 复制并执行 supabase/schema.sql
```

它会创建以下表：

- `profiles`
- `care_links`
- `medicine_schedules`
- `checkins`
- `notification_tokens`

并启用 Row Level Security。当前策略支持：

- patient 只能读写自己的 schedules 和 checkins
- admin 可以读取 care_links 绑定 patient 的 schedules 和 checkins
- 用户只能读取自己的 profile；admin 可以读取绑定 patient 的 profile
- notification_tokens 第一版只允许用户管理自己的 token

## 默认演示账号

如果你还没有配置 `.env.local`，项目会自动进入本地演示模式，可以直接登录：

- 朋友账号：`jiajia`
- 管理员账号：`admin`

本地演示模式会把打卡记录保存在浏览器 `localStorage`，方便先看完整效果。

## 创建 Supabase 测试用户

接入 Supabase 后，登录页仍然使用“账号 + 密码”。代码会把账号映射为邮箱：

- `admin` -> `admin@daka.local`
- `jiajia` -> `jiajia@daka.local`

所以在 Supabase Dashboard -> Authentication -> Users 中创建两个用户：

- `admin@daka.local`
- `jiajia@daka.local`

密码按当前约定设置即可，页面不会展示密码。

创建好 Auth 用户后，打开 `supabase/seed.sql`，把里面的邮箱替换成你的测试邮箱，然后在 Supabase SQL Editor 执行。

seed 会做这些事：

- 给 admin 用户写入 `profiles.role = 'admin'`
- 给 patient 用户写入 `profiles.role = 'patient'`
- 在 `care_links` 里绑定 admin 和 patient
- 为 patient 创建三条喝药计划：
  - 早上 09:00
  - 中午 15:00
  - 晚上 21:00

## 启动项目

在 Windows 终端或 VS Code 终端里进入项目目录：

```bash
cd C:\Users\xwz\Desktop\daka
```

安装依赖后启动：

```bash
npm run dev
```

然后打开：

```text
http://localhost:3000
```

如果看到 404，可以停止当前终端里的 dev server，删除 `.next` 后重新启动：

```bash
rmdir /s /q .next
npm run dev
```

## 部署到实验室服务器

可以部署。推荐使用一台有公网 IP 或校园网可访问地址的 Linux 服务器，并配置 HTTPS。手机要能访问这个网站，服务器地址必须能从手机所在网络访问到。

先确认服务器是什么情况：

- 操作系统：最好是 Ubuntu / Debian / CentOS 这类 Linux
- 访问方式：你需要能用 SSH 登录服务器
- Node 版本：建议 Node.js 20 LTS
- 端口：服务器需要能开放 80/443，或者至少开放一个内网端口如 3000
- 域名：最好有一个域名指向服务器；没有域名也可以先用服务器 IP 测试
- HTTPS：手机添加到桌面和 PWA 安装体验最好使用 HTTPS

部署顺序是：

1. 先把 Supabase 数据库建好
2. 再把项目代码放到实验室服务器
3. 在服务器上安装依赖并构建
4. 用 PM2 或 Docker 让网站一直运行
5. 用 Nginx 把域名或 IP 转发到网站端口
6. 配置 crontab 定时触发提醒接口
7. 手机访问网站并添加到桌面

### 第 1 步：准备 Supabase

在 Supabase Dashboard 里执行：

1. SQL Editor 执行 `supabase/schema.sql`
2. Authentication -> Users 创建：
   - `admin@daka.local`
   - `jiajia@daka.local`
3. 两个用户的密码按当前约定设置
4. SQL Editor 执行 `supabase/seed.sql`
5. Project Settings -> API 复制：
   - Project URL
   - anon public key
   - service role key

生成 Web Push 密钥：

```bash
npx web-push generate-vapid-keys
```

生成后把 public key 填到 `NEXT_PUBLIC_VAPID_PUBLIC_KEY`，private key 填到 `VAPID_PRIVATE_KEY`。

### 第 2 步：把代码放到服务器

如果你用 git：

```bash
git clone 你的代码仓库地址 daka
cd daka
```

如果不用 git，就把整个项目文件夹上传到服务器，例如上传到：

```text
/opt/daka
```

需要上传的是项目源码，不要上传 `node_modules`、`.next`。服务器上会重新执行 `npm ci` 和 `npm run build`。

### 方案 A：Node + PM2

服务器准备：

- Node.js 20 LTS
- npm
- pm2
- nginx，推荐用于域名、HTTPS 和反向代理

安装 pm2：

```bash
npm install -g pm2
```

上传或拉取项目后，在服务器项目目录执行：

```bash
npm ci
cp .env.example .env.production
```

编辑 `.env.production`：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:you@example.com
CRON_SECRET=replace-with-a-long-random-string
```

如果服务器上没有编辑器，可以用：

```bash
nano .env.production
```

构建并启动：

```bash
set -a
source .env.production
set +a
npm run build
PORT=3000 pm2 start npm --name daka -- run start:standalone
pm2 save
```

配置后台提醒定时任务，每 5 分钟调用一次提醒接口：

```bash
crontab -e
```

加入一行：

```bash
*/5 * * * * curl -s -X POST https://your-domain.example.com/api/reminders/send -H "x-cron-secret: replace-with-a-long-random-string" >/dev/null 2>&1
```

这里的 secret 必须和 `.env.production` 里的 `CRON_SECRET` 一致。

以后更新代码：

```bash
git pull
npm ci
set -a
source .env.production
set +a
npm run build
pm2 restart daka --update-env
```

Nginx 反向代理示例：

```nginx
server {
  listen 80;
  server_name your-domain.example.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

配置 HTTPS 可以用 certbot：

```bash
sudo certbot --nginx -d your-domain.example.com
```

### 方案 B：Docker

构建镜像时要传入 Supabase 环境变量，因为 `NEXT_PUBLIC_*` 会在前端构建时写入页面包：

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key \
  --build-arg NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key \
  -t daka-pwa .
```

运行容器：

```bash
docker run -d \
  --name daka-pwa \
  --restart unless-stopped \
  -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key \
  -e SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
  -e NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key \
  -e VAPID_PRIVATE_KEY=your-vapid-private-key \
  -e VAPID_SUBJECT=mailto:you@example.com \
  -e CRON_SECRET=replace-with-a-long-random-string \
  daka-pwa
```

然后用 Nginx 把域名反向代理到 `127.0.0.1:3000`。

### 第 3 步：检查网站是否跑起来

在服务器上执行：

```bash
curl http://127.0.0.1:3000/login
```

如果能看到 HTML 内容，说明 Next.js 已经跑起来。

在你自己的电脑或手机浏览器打开：

```text
http://服务器IP:3000/login
```

如果打不开，通常是服务器防火墙或校园网端口没有放行。

## 手机使用

部署后，朋友用手机浏览器打开：

```text
https://your-domain.example.com/login
```

登录：

```text
jiajia
```

输入约定密码后进入打卡页。第一次使用提醒时，点击“喝药提醒”的“开启”按钮，并允许浏览器通知权限。

iPhone：

- 用 Safari 打开网站
- 点分享按钮
- 选择“添加到主屏幕”

Android：

- 用 Chrome 打开网站
- 打开浏览器菜单
- 选择“添加到主屏幕”或“安装应用”

注意：PWA 添加到桌面通常要求 HTTPS，局域网 IP 或 HTTP 地址可能不能完整触发安装体验。

## 查看数据库

数据库在 Supabase Dashboard 查看：

- Authentication -> Users：查看登录用户
- Table Editor -> profiles：查看用户角色
- Table Editor -> care_links：查看管理员和朋友绑定关系
- Table Editor -> medicine_schedules：查看喝药计划
- Table Editor -> checkins：查看打卡和漏打卡原因
- Table Editor -> notification_tokens：查看手机推送订阅
- SQL Editor：执行 `schema.sql` 和 `seed.sql`

## 测试 patient 页面

1. 打开 `/login`
2. 使用 `jiajia` 和约定密码登录
3. 登录后应跳转到 `/app`
4. 页面会显示“今日喝药打卡”
5. 点击任意“我已喝药”
6. 页面应显示“已打卡”和实际打卡时间
7. 同一天同一个时间段重复点击会被数据库唯一约束阻止

打卡时间规则：

- 早上 09:00 只能在 08:00 - 10:00 打卡
- 中午 15:00 只能在 14:00 - 16:00 打卡
- 晚上 21:00 只能在 20:00 - 22:00 打卡
- 未到时间时按钮不可点
- 超过时间后不能再打卡，需要填写原因
- 管理员页面会把超时原因显示为“漏打卡”

## 测试 admin 页面

1. 打开 `/login`
2. 使用 `admin` 和约定密码登录
3. 登录后应跳转到 `/admin`
4. 页面会显示绑定 patient 今天三次打卡状态
5. 页面会显示最近 7 天每天完成数
6. 页面会显示最近 30 天完成率

## 设置页面

访问 `/settings`。

管理员可以修改嘉嘉的三次喝药时间：

- 早上 09:00
- 中午 15:00
- 晚上 21:00

保存后会更新 `medicine_schedules.reminder_time`。本地演示模式会保存到浏览器 `localStorage`。

## PWA

项目已包含：

- `public/manifest.json`
- `public/icon.svg`
- `public/sw.js`

生产环境下会注册 service worker。第一版不做完整离线缓存，但手机浏览器可以识别为基础 PWA，并支持添加到桌面。

## 后台推送提醒

患者登录后，在 `/app` 点击“喝药提醒”的“开启”按钮。浏览器允许通知后，订阅会保存到 Supabase 的 `notification_tokens` 表。

服务器通过 crontab 每 5 分钟调用：

```text
POST /api/reminders/send
```

接口会检查当前上海时间是否接近喝药时间。如果该时间段还没有正常打卡，就发送 Web Push 通知。

注意：

- Web Push 需要 HTTPS，localhost 例外
- iPhone 需要把网站添加到主屏幕后，通知体验才更完整
- 如果用户拒绝浏览器通知权限，需要在系统或浏览器设置里重新打开

## 常见问题

如果登录后提示没有找到 profiles 角色记录，请确认已经执行 `supabase/seed.sql`，并且 seed 中的邮箱和 Supabase Auth 用户邮箱一致。

如果 admin 页面提示没有绑定 patient，请确认 `care_links` 中存在对应 admin 和 patient 的绑定记录。
