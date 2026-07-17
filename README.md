# 今晚吃啥 🎡 — Dinner Wheel 微信小程序

一个可点击的转盘，帮你解决「今晚吃什么」的选择困难。转一下，命运帮你点菜。

## 功能
- Canvas 转盘（`<canvas type="2d">`），分区 = 当前候选菜。
- 分类切换标签：**全部 / 中餐 / 西餐 / 东南亚 / 日韩**，切换即重绘转盘（每类最多 12 个分区，标签清晰）。
- 中间「转!」按钮 → 缓动旋转（加速→减速，约 3.5s，随机落点）→ 高亮结果 + 结果卡（今晚就吃 → XX 🍜 + 一句好玩的话）+ 彩带庆祝。
- 「再转一次」按钮，顶部指针。

## 导入微信开发者工具
1. 打开 **微信开发者工具** → 新建/导入项目。
2. 目录选择本文件夹（含 `app.json` 的那一层，即仓库根目录）。
3. **AppID**：`project.config.json` 已填好你的 AppID **`wxd7d745a7cc14f6c0`**，导入时会自动认。
   - 用测试号可直接预览，无需真实 AppID。
   - 若要真机预览 / 发布，请在 `project.config.json` 把 `appid` 换成你自己的小程序 AppID。
4. 打开后应直接进入首页转盘。

## 结构
```
app.json / app.js / app.wxss        # 全局配置与样式
project.config.json                 # 工具项目配置（appid 已填 wxd7d745a7cc14f6c0）
sitemap.json
data/dishes.js                      # 共享菜品数据（分类 → 菜）
pages/index/
  index.wxml / index.wxss
  index.js / index.json             # 转盘逻辑（canvas 2d + DPR + requestAnimationFrame）
```

## 说明
- 用的是**当前推荐**的 `<canvas type="2d">` 新接口：
  `wx.createSelectorQuery().select('#wheel').fields({node:true,size:true})` → `node.getContext('2d')`，
  按 `wx.getSystemInfoSync().pixelRatio` 处理高清屏，动画走 canvas 节点的 `requestAnimationFrame`。
- 落点是**先随机选中一个分区，再反算出让该分区中心停在顶部指针下的精确角度**，所以高亮的菜和视觉停留位置一致。

## 浏览器预览
`preview/dinner-wheel-preview.html` 是同款转盘的纯 HTML 版本，完全自包含（无任何外部依赖），双击即可在浏览器里玩。
