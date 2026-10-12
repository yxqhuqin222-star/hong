# hong

微信聊天记录移动端复现页。

在线查看：<https://yxqhuqin222-star.github.io/hong/>

- 2026-09-29 至 2026-10-04
- 共 3,453 条消息
- 可用聊天图片按原记录展示
- 无法读取的加密媒体仅显示“表情”“图片”“语音”等类型名称

## 打开记录

正式页面每加载一次，向独立的 Cloudflare Worker 写入一条服务端时间。统计页显示累计打开次数和每次打开的北京时间（精确到秒），明细每页 100 条。刷新页面也算一次；数据从部署后开始积累，无法补录历史打开时间。统计服务不保存 IP、设备、来源或聊天内容。所有打开页面的人都会计入，记录不能证明是谁打开的；公开页面的浏览量也无法防止人为伪造。

统计页：<https://hong-visit-log.yxqhuqin222.workers.dev/stats>。浏览器弹出登录框时，用户名可任意填写，密码为部署时设置的 `STATS_PASSWORD`。

首次部署统计服务时，在 Cloudflare 中创建 D1 数据库 `hong-visit-log-db`，把返回的 `database_id` 填入 `wrangler.jsonc`，执行 `migrations/0001_page_opens.sql`，将 `STATS_PASSWORD` 设置为 Worker secret，然后部署 Worker。聊天页需要另行发布到 GitHub Pages，统计才会开始。部署及生产数据变更均需单独授权。
