# MusicBoard 项目实现说明

这份文档用比较通俗的方式说明这个网页音乐键盘是怎么做出来的。项目主要代码在 `src/main.jsx` 和 `src/styles.css`，打包和部署配置在 `package.json`、`.github/workflows/deploy.yml`。

## 1. 这个项目是什么

MusicBoard 是一个网页音乐键盘。

它把电脑键盘映射成简谱键盘，按下电脑键时：

- 对应的网页按键会亮。
- 对应的钢琴键会亮。
- 会播放钢琴声音。
- 如果开启瀑布模式，会从对应钢琴键上方生成一条向上的音符条。
- 可以用鼠标滚轮转调。
- 可以导入本地视频当背景。
- 可以部署到 GitHub Pages，让别人通过 URL 打开。

它本质上是一个前端静态网页，没有后端服务器。

## 2. 技术栈

项目使用这些工具：

- React：负责界面和交互状态。
- Vite：负责本地开发和打包。
- soundfont-player：负责加载钢琴音源并播放 MIDI 音。
- GitHub Pages：负责公网部署。

常用命令：

```bash
npm install
npm run dev
npm run build
```

`npm run dev` 用于本地预览。  
`npm run build` 会生成 `dist` 文件夹，用于部署。

## 3. 键盘映射是怎么做的

核心映射在 `src/main.jsx` 里的 `musicLabels`。

简单说，它是一张表：

```js
KeyA: { note: '1', octave: 'low' }
KeyS: { note: '2', octave: 'low' }
KeyD: { note: '3', octave: 'low' }
```

意思是：

- 按电脑键盘的 `A`，就是低音 `1`。
- 按 `S`，就是低音 `2`。
- 按 `D`，就是低音 `3`。

网页并不是凭空知道哪个键是什么音，而是通过这张表查出来的。

除了字母区，项目也映射了：

- 数字键区
- 方向键区
- 小键盘区
- Insert/Home/PageUp 那些功能键区

所以它可以覆盖一整套比较大的音乐键盘布局。

## 4. 简谱怎么变成真正的音高

用户看到的是 `1 2 3 4 5 6 7`，但是浏览器播放声音时需要的是 MIDI 音高。

这个转换由 `musicLabelToMidi` 完成。

它做的事可以理解为：

1. 先从中音 C 开始。
2. 根据 `1 2 3 4 5 6 7` 找到对应的半音位置。
3. 根据高音、低音、双高音等八度信息上下移动。
4. 再加上当前转调值。

比如：

- 中音 `1` 是 C。
- 中音 `2` 是 D。
- 低音 `1` 就往下一个八度。
- 高音 `1` 就往上一个八度。
- 如果转到 D 调，所有音整体升高 2 个半音。

这就是为什么滚轮转调后，声音和钢琴高亮都会一起变化。

## 5. 声音是怎么播放出来的

声音逻辑在 `useSoundfontAudio`。

这个函数负责三件事：

1. 创建浏览器的 AudioContext。
2. 用 `soundfont-player` 加载 FluidR3_GM 钢琴音源。
3. 按键时播放对应 MIDI 音。

第一次打开网页时，钢琴音源不一定马上加载完成。第一次按键可能会等几秒，这是因为浏览器正在下载钢琴采样。加载完成后，再按键就会比较顺。

播放流程大概是：

```text
按下键盘
-> 找到这个键对应的简谱
-> 转成 MIDI 音高
-> soundfont-player 播放钢琴采样
```

## 6. 延音是怎么做的

延音默认开启。

普通情况下，按键松开后，声音会停止。

开启延音后，松开键不会立刻停，而是把这个声音放到一个“延音列表”里，让它继续响一会儿。等用户关闭延音，或者页面需要清理声音时，再统一停止。

代码里主要通过两个列表管理：

- `activeNodesRef`：正在按住的声音。
- `sustainedNodesRef`：已经松开但还在延音的声音。

这样就能做出更像钢琴踏板的感觉。

## 7. 转调是怎么做的

转调用鼠标滚轮控制。

核心状态是 `transpose`，它代表当前升高或降低了几个半音。

项目里有 12 个调：

```js
['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
```

滚轮向上或向下时，`transpose` 会在 0 到 11 之间循环变化。

比如：

- `C` 是 0。
- `D` 是 2。
- `A` 是 9。
- `Bb` 是 10。

空格键位置和右侧隐藏栏都会显示当前调性。

## 8. 钢琴键盘是怎么画出来的

钢琴键盘由 `PianoKeyboard` 组件负责。

代码里生成了一串 MIDI 音：

```js
const pianoKeys = Array.from({ length: PIANO_KEY_COUNT }, ...)
```

每个音都会判断自己是白键还是黑键。

白键和黑键不是图片，而是用 HTML 元素加 CSS 画出来的：

- `.white-key` 画白键。
- `.black-key` 画黑键。
- `.is-active` 表示当前正在被按下。

当用户按下某个音乐键时，项目会算出对应的 MIDI 音，然后让同一个 MIDI 音的钢琴键亮起来。

## 9. 瀑布效果是怎么做的

瀑布由 `WaterfallStage` 组件负责。

每次按下一个音乐键，代码会创建一个瀑布音符对象：

```js
{
  id,
  code,
  midi,
  startedAt,
  releasedAt
}
```

里面记录：

- 是哪个键触发的。
- 对应哪个 MIDI 音。
- 从什么时候开始按下。
- 什么时候松开。

然后每一帧更新当前时间：

```js
requestAnimationFrame(...)
```

如果键还按着，瀑布条会继续变长。  
如果键松开，瀑布条会向上漂走并慢慢淡出。

之前出现过一个 bug：长按到一定长度后不再变长。原因是高度被固定限制在 `440px`。后来改成根据瀑布舞台高度动态计算，所以长按时会继续延展，不会卡住。

## 10. 视频背景是怎么做的

右侧隐藏栏有“视频背景”按钮。

点击后会打开本地文件选择器：

```html
<input type="file" accept="video/*" />
```

用户选中本地视频后，浏览器会生成一个临时地址：

```js
URL.createObjectURL(file)
```

然后把这个地址放进 `<video>` 标签里作为背景播放。

注意：

- 视频不会上传到服务器。
- 只是在当前浏览器里本地预览。
- 刷新页面后需要重新选择视频。

背景视频层是固定在页面最底下的：

```css
position: fixed;
inset: 0;
object-fit: cover;
```

上面还有一层暗色遮罩，目的是让钢琴键和瀑布条看得清楚。

## 11. 古典界面是怎么做的

项目有一个“古典”按钮。

它不是换一套页面，而是给页面加一个 class：

```js
theme-classical
```

CSS 看到这个 class 后，就把界面换成黑金、胡桃木、象牙白、暖光的风格。

所以现代风和古典风其实共用同一套 React 功能，只是 CSS 外观不同。

古典主题选择会保存到 `localStorage`，所以刷新后仍然保持上次选择。

## 12. 右侧隐藏栏是怎么做的

功能按钮没有固定放在底部，而是收进右侧隐藏栏。

实现方式是：

```css
position: fixed;
right: 0;
transform: translate(...);
```

默认让控制栏大部分移到屏幕外，只露出一点点边。

当鼠标靠近或聚焦时：

```css
.status-bar:hover,
.status-bar:focus-within
```

它再滑出来。

这样弹琴时画面更干净，需要操作时再靠近右边。

## 13. F11 全屏是怎么做的

项目监听 `F11`。

按下 F11 时调用浏览器 Fullscreen API：

```js
document.documentElement.requestFullscreen()
document.exitFullscreen()
```

这样可以进入沉浸式全屏。

有些浏览器也会自己处理 F11，所以最终效果取决于浏览器权限，但正常桌面浏览器一般可以使用。

## 14. 公网部署是怎么做的

项目已经推到 GitHub 仓库：

```text
https://github.com/Duyao650/musicBoard
```

仓库里有 GitHub Pages 自动部署配置：

```text
.github/workflows/deploy.yml
```

它做的事情是：

1. 每次 push 到 `main` 分支。
2. GitHub 自动安装依赖。
3. 自动运行 `npm run build`。
4. 把生成的 `dist` 发布到 GitHub Pages。

部署成功后，访问地址是：

```text
https://duyao650.github.io/musicBoard/
```

## 15. 为什么国内访问可能不稳定

GitHub Pages 在中国大陆访问可能慢，甚至打不开。

这不是项目代码问题，而是访问 GitHub Pages 网络不稳定。

如果要给国内用户稳定访问，可以考虑：

- 国内云服务器
- 阿里云 OSS + CDN
- 腾讯云 COS + CDN
- 备案后绑定国内域名

如果只是临时分享，GitHub Pages 可以先用。

## 16. 以后怎么继续维护

现在项目已经是 Git 仓库，也推到了 GitHub。

所以以后每次改功能，最好都提交一次。

好处是：

- 改坏了可以回退。
- 可以看到每次改了什么。
- 本地丢了也能从 GitHub 找回。
- 部署会自动更新。

常用命令：

```bash
git status
git add .
git commit -m "描述这次改了什么"
git push
```

## 17. 项目主要文件说明

```text
src/main.jsx
```

主要功能逻辑都在这里，包括键盘映射、发声、转调、瀑布、视频背景、右侧控制栏。

```text
src/styles.css
```

所有界面样式都在这里，包括钢琴键、瀑布、古典主题、视频背景、隐藏栏。

```text
package.json
```

项目依赖和运行命令。

```text
.github/workflows/deploy.yml
```

GitHub Pages 自动部署流程。

```text
README.md
```

项目简短介绍和基本运行方式。

## 18. 一句话总结

这个项目的核心思路是：

```text
电脑按键 -> 查简谱映射 -> 转成 MIDI 音高 -> 播放钢琴采样 -> 高亮钢琴键 -> 生成瀑布动画
```

外观部分再通过 CSS 做成古典界面、视频背景和右侧隐藏控制栏。
