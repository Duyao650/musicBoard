# MusicBoard 技术实现教程

这份文档面向“想学会怎么做出这个项目”的人。它不会只介绍功能，而是按实际开发顺序讲清楚：项目怎么搭、数据怎么设计、键盘事件怎么监听、声音怎么播放、瀑布动画怎么实现、视频背景怎么接入、最后怎么部署。

项目源码主要在：

```text
src/main.jsx
src/styles.css
```

## 1. 项目整体架构

MusicBoard 是一个纯前端 React 应用。

整体数据流是：

```text
用户按下电脑键盘
-> KeyboardEvent.code
-> 查 musicLabels 映射表
-> 得到简谱 note + octave
-> 转成 MIDI 音高
-> 播放 SoundFont 钢琴音源
-> 更新 activeCodes
-> 点亮网页键盘和钢琴键
-> 如果在瀑布模式，生成 waterfall note
-> requestAnimationFrame 持续刷新瀑布动画
```

可以把项目拆成 7 个模块：

1. 键盘布局数据
2. 音乐映射数据
3. 键盘事件系统
4. 音频播放系统
5. 钢琴可视化
6. 瀑布动画系统
7. 主题、视频背景、部署

## 2. 初始化项目

这个项目使用 Vite + React。

从零开始可以这样创建：

```bash
npm create vite@latest music-board -- --template react
cd music-board
npm install
```

安装依赖：

```bash
npm install soundfont-player lucide-react
```

本项目的 `package.json` 里主要脚本是：

```json
{
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "vite build --base ./",
    "preview": "vite preview --host 127.0.0.1"
  }
}
```

这里 `vite build --base ./` 很重要。它让打包后的资源路径使用相对路径，部署到 GitHub Pages 的子路径时不容易丢资源。

## 3. 如何设计电脑键盘布局

网页上的电脑键盘不是手写一堆按钮，而是先定义数据，再用 React 渲染。

比如主键盘区：

```js
const mainRows = [
  [
    { code: 'Escape', label: 'Esc' },
    { code: 'F1', label: 'F1' }
  ],
  [
    { code: 'Digit1', label: '1', sub: '!' },
    { code: 'Digit2', label: '2', sub: '@' }
  ]
];
```

每个 key 对象通常包含：

```js
{
  code: 'KeyA',      // KeyboardEvent.code
  label: 'A',        // 页面上显示的文字
  sub: 'optional',   // 副文字
  w: 1.25,           // 宽度倍率
  h: 2,              // 高度倍率
  tone: 'cyan'       // 高亮颜色类型
}
```

为什么用 `KeyboardEvent.code`，不用 `event.key`？

因为 `code` 表示物理键位，更稳定。

例如：

```text
KeyA
KeyS
Digit1
Numpad1
ArrowUp
```

这些不会因为输入法、大小写、键盘语言变化而乱掉。

## 4. 如何把键盘布局渲染成按钮

项目里用 `KeyboardBoard` 渲染整个电脑键盘。

核心思路：

```jsx
rows.map(row => (
  <div className="keyboard-row">
    {row.map(item => <Keycap item={item} />)}
  </div>
))
```

`Keycap` 负责渲染单个键：

- 如果是普通模式，显示 `label` 和 `code`。
- 如果是音乐模式，显示简谱。
- 如果是空格键，显示当前调性。
- 如果正在按下，就加 `.is-active` class。

样式里通过 CSS 变量控制大小：

```jsx
style={{ '--w': item.w || 1, '--h': item.h || 1 }}
```

CSS 里再这样使用：

```css
.keycap {
  width: calc(48px * var(--w));
  height: calc(47px * var(--h));
}
```

这样 Enter、Shift、Space 这种大键就不用单独写样式。

## 5. 如何设计简谱映射

电脑按键到音乐音符的映射在 `musicLabels`。

示例：

```js
const musicLabels = {
  KeyA: { note: '1', octave: 'low' },
  KeyS: { note: '2', octave: 'low' },
  KeyD: { note: '3', octave: 'low' },
  KeyK: { note: '1' },
  KeyL: { note: '2' },
  Digit8: { note: '1', octave: 'superHigh' }
};
```

这个对象的 key 是电脑键位，value 是音乐信息。

`note` 表示简谱数字：

```text
1 2 3 4 5 6 7
```

`octave` 表示八度：

```text
subLow      低两个八度
low         低一个八度
mid         中音
high        高一个八度
superHigh   高两个八度
ultraHigh   高三个八度
```

为什么不用直接写 MIDI 数字？

因为直接写 MIDI 不直观。用 `{ note, octave }` 更适合按简谱布局调整，也更方便后面做转调。

## 6. 简谱转 MIDI 的实现

浏览器音频最终播放的是 MIDI 音高，不是简谱。

转换函数是：

```js
function musicLabelToMidi(value, transpose = 0) {
  if (!value || value.note === 'rest') return null;
  return 60
    + transpose
    + (octaveOffsets[value.octave || 'mid'] || 0)
    + jianpuSemitones[value.note];
}
```

其中：

```js
const jianpuSemitones = {
  1: 0,
  2: 2,
  3: 4,
  4: 5,
  5: 7,
  6: 9,
  7: 11
};
```

这是 C 大调下简谱对应的半音位置：

```text
1 = C = 0
2 = D = 2
3 = E = 4
4 = F = 5
5 = G = 7
6 = A = 9
7 = B = 11
```

`60` 是 MIDI 里的中央 C，也就是 C4。

所以：

```text
中音 1 -> 60
中音 2 -> 62
高音 1 -> 72
低音 1 -> 48
```

`transpose` 是转调值。比如 D 调就是整体加 2 个半音。

## 7. 转调功能怎么实现

项目用 `transpose` 保存当前调性。

```js
const [transpose, setTranspose] = useState(0);
```

12 个调名：

```js
const keySignatures = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
```

鼠标滚轮监听：

```js
window.addEventListener('wheel', handleWheel, { passive: false });
```

向上滚升高，向下滚降低：

```js
const direction = wheelDeltaRef.current < 0 ? 1 : -1;
setTranspose((current) => (current + direction + 12) % 12);
```

为什么要 `% 12`？

因为音乐里 12 个半音循环一圈，从 B 再往上就是 C。

## 8. 键盘事件系统怎么实现

键盘事件逻辑封装在 `useKeyboardTelemetry`。

它监听：

```js
keydown
keyup
blur
```

核心状态：

```js
const [activeCodes, setActiveCodes] = useState(() => new Set());
```

`activeCodes` 保存当前正在按下的键，比如：

```js
Set(['KeyA', 'KeyS'])
```

按下时：

1. 判断这个键是不是项目支持的键。
2. `event.preventDefault()` 阻止浏览器默认行为。
3. 如果已经按着，就不重复触发。
4. 加入 `activeCodes`。
5. 如果是音乐模式，调用 `onNoteStart(code)`。

松开时：

1. 从 `activeCodes` 删除。
2. 调用 `onNoteStop(code)`。

为什么要判断重复按下？

因为浏览器长按键盘会不断触发 keydown。如果不拦住，就会重复播放很多个声音，瀑布也会重复生成很多条。

## 9. 音频系统怎么实现

声音逻辑在 `useSoundfontAudio`。

核心依赖：

```js
import Soundfont from 'soundfont-player';
```

核心对象：

```js
const contextRef = useRef(null);
const instrumentRef = useRef(null);
const activeNodesRef = useRef(new Map());
const sustainedNodesRef = useRef(new Set());
```

含义：

- `contextRef`：浏览器音频上下文。
- `instrumentRef`：加载好的钢琴音源。
- `activeNodesRef`：当前按住的声音。
- `sustainedNodesRef`：松开后仍在延音的声音。

加载音源：

```js
Soundfont.instrument(contextRef.current, 'acoustic_grand_piano', {
  soundfont: 'FluidR3_GM',
  format: 'mp3'
})
```

播放音符：

```js
const node = instrument.play(midi, context.currentTime, { gain: 0.78 });
activeNodesRef.current.set(code, node);
```

停止音符：

```js
node.stop(context.currentTime + 0.08);
activeNodesRef.current.delete(code);
```

这里加 `0.08` 秒是为了让声音收尾别太硬。

## 10. 延音功能怎么实现

延音状态：

```js
const [sustain, setSustain] = useState(true);
```

如果延音关闭：

```js
node.stop(...)
```

如果延音开启：

```js
sustainedNodesRef.current.add(node);
activeNodesRef.current.delete(code);
```

也就是说，松开按键时，不马上停止声音，而是放进延音列表。

当用户关闭延音时：

```js
sustainedNodesRef.current.forEach(node => node.stop(...));
sustainedNodesRef.current.clear();
```

这就是一个简化版的钢琴踏板。

## 11. 钢琴键盘可视化怎么实现

钢琴键盘数据：

```js
const pianoKeys = Array.from({ length: PIANO_KEY_COUNT }, (_, index) => {
  const midi = PIANO_START_MIDI + index;
  return {
    midi,
    black: name.includes('#')
  };
});
```

每个 MIDI 音生成一个键。

白键和黑键用 CSS 区分：

```jsx
<span className={`piano-key ${key.black ? 'black-key' : 'white-key'}`} />
```

按下键后，先算出当前 activeCodes 对应的 MIDI：

```js
const activeMidiSet = new Set(
  [...activeCodes]
    .map((code) => musicLabelToMidi(musicLabels[code], transpose))
    .filter(Boolean)
);
```

然后钢琴键判断：

```js
activeMidiSet.has(key.midi)
```

如果有，就加 `.is-active`，CSS 负责发光和按下效果。

## 12. 瀑布动画怎么实现

瀑布动画不是 canvas，而是普通 HTML + CSS。

按下键时创建一条瀑布音符：

```js
{
  id,
  code,
  midi,
  black,
  startedAt,
  releasedAt: null
}
```

`startedAt` 是按下时间。

松开时：

```js
releasedAt = performance.now()
```

每帧刷新当前时间：

```js
requestAnimationFrame(tick)
```

计算瀑布条高度：

```js
const age = heldUntil - startedAt;
const height = 28 + age * 0.22;
```

如果长按，`age` 会越来越大，所以瀑布条会越来越长。

松开后让它向上漂：

```js
const bottom = releasedAge * 0.34;
const opacity = 1 - releasedAge / 1500;
```

所以松开后会看到音符条继续往上走并慢慢消失。

定位方式：

```js
left = (midi - PIANO_START_MIDI) / PIANO_KEY_COUNT * 100%
```

这样瀑布条会落在对应钢琴键上方。

## 13. 长按瀑布 bug 是怎么修的

之前的写法：

```js
const height = Math.min(440, 28 + age * 0.22);
```

问题：

长按到 440px 后，高度就不再变化，看起来像卡住。

修复思路：

用瀑布舞台当前高度做动态上限：

```js
const maxVisibleHeight = stageHeight + releasedAge * 0.34 + 80;
const height = Math.min(maxVisibleHeight, 28 + age * 0.22);
```

这样长按时可以一直长到超过可视区域，视觉上不会突然停住。

## 14. 视频背景怎么实现

视频背景组件：

```jsx
function VideoBackground({ src }) {
  if (!src) return null;
  return (
    <div className="video-background">
      <video src={src} autoPlay muted loop playsInline />
      <div className="video-background-overlay" />
    </div>
  );
}
```

导入本地视频：

```jsx
<input type="file" accept="video/*" />
```

选择文件后：

```js
URL.createObjectURL(file)
```

生成一个浏览器临时 URL，给 `<video>` 使用。

为什么刷新后视频没了？

因为 `createObjectURL` 只是当前页面临时可用，不会永久保存，也不会上传到服务器。

如果要让所有人打开网页都看到同一个默认视频，就需要把视频作为资源上传到服务器或 CDN，再用固定 URL。

## 15. 古典主题怎么实现

古典主题不是另一套组件，而是 class 控制。

React 里：

```js
const [classicalTheme, setClassicalTheme] = useState(...);
```

渲染时：

```jsx
<main className={classicalTheme ? 'theme-classical' : ''}>
```

CSS 里：

```css
.theme-classical .piano-stage { ... }
.theme-classical .white-key { ... }
.theme-classical .waterfall-note { ... }
```

这样同一个页面能切换两种视觉风格。

主题状态存到：

```js
localStorage
```

所以刷新后仍然记住。

## 16. 右侧隐藏栏怎么实现

控制栏是 `.status-bar`。

核心 CSS：

```css
.status-bar {
  position: fixed;
  top: 50%;
  right: 0;
  transform: translate(138px, -50%);
}
```

默认向右移出屏幕，只露出一点。

鼠标靠近时：

```css
.status-bar:hover,
.status-bar:focus-within {
  transform: translate(0, -50%);
}
```

这样就做出“靠近右侧滑出来”的效果。

## 17. F11 全屏怎么实现

监听键盘：

```js
window.addEventListener('keydown', handleFullscreenKey)
```

判断：

```js
if (event.code !== 'F11') return;
```

进入全屏：

```js
document.documentElement.requestFullscreen()
```

退出全屏：

```js
document.exitFullscreen()
```

注意：Fullscreen API 需要用户交互触发。按 F11 属于用户交互，所以适合这个场景。

## 18. GitHub Pages 部署怎么实现

项目使用 GitHub Actions 自动部署。

配置文件：

```text
.github/workflows/deploy.yml
```

流程：

```text
push 到 main
-> GitHub Actions 启动
-> npm ci
-> npm run build
-> 上传 dist
-> deploy-pages 发布
```

关键步骤：

```yaml
- name: Build
  run: npm run build

- name: Upload artifact
  uses: actions/upload-pages-artifact@v3
  with:
    path: dist

- name: Deploy to GitHub Pages
  uses: actions/deploy-pages@v4
```

GitHub 仓库设置里需要：

```text
Settings -> Pages -> Source -> GitHub Actions
```

部署完成后访问：

```text
https://duyao650.github.io/musicBoard/
```

## 19. 如果你想自己复刻，建议按这个顺序做

不要一开始就做完整项目。建议分阶段：

### 第一步：只做键盘亮灯

- 定义 keyboard rows。
- 渲染 Keycap。
- 监听 keydown/keyup。
- 用 activeCodes 点亮按钮。

### 第二步：加简谱显示

- 写 musicLabels。
- 在 Keycap 里显示 MusicNote。

### 第三步：加 MIDI 转换

- 写 jianpuSemitones。
- 写 octaveOffsets。
- 写 musicLabelToMidi。

### 第四步：加声音

- 安装 soundfont-player。
- 写 useSoundfontAudio。
- 按下播放，松开停止。

### 第五步：加延音

- 加 sustain 状态。
- 用 sustainedNodesRef 保存松开后的声音。

### 第六步：加钢琴可视化

- 生成 pianoKeys。
- activeMidiSet 控制钢琴键亮起。

### 第七步：加瀑布

- 按下时生成 note 对象。
- requestAnimationFrame 更新时间。
- 用 CSS 画瀑布条。

### 第八步：加转调

- 加 transpose 状态。
- 鼠标滚轮改变 transpose。
- 所有 MIDI 计算都加 transpose。

### 第九步：加视频背景和主题

- input file 导入视频。
- VideoBackground 渲染 `<video>`。
- CSS class 切古典主题。

### 第十步：部署

- `npm run build`。
- GitHub Pages workflow。
- push 到 GitHub。

## 20. 常见坑

### 第一次没声音

可能是钢琴音源还在加载。等几秒再按，或者先点一下页面触发浏览器音频权限。

### 长按键声音重复

因为浏览器长按会重复触发 keydown。解决方式是检查 `activeCodes`，如果已经按下就不要重复播放。

### 方向键让页面滚动

按键事件里要 `event.preventDefault()`。

### GitHub Pages 资源加载失败

Vite build 要用相对路径：

```bash
vite build --base ./
```

### 视频背景刷新后消失

本地导入的视频只是临时对象 URL，不会保存。想默认自带视频，需要把视频上传成固定资源。

### 国内访问 GitHub Pages 慢

这是网络环境问题，不是代码问题。国内稳定访问通常需要国内服务器、OSS/CDN 和备案。

## 21. 核心代码关系图

```text
App
├─ useKeyboardTelemetry
│  ├─ activeCodes
│  ├─ keydown
│  └─ keyup
├─ useSoundfontAudio
│  ├─ play
│  ├─ stop
│  └─ stopAll
├─ PianoKeyboard
│  └─ activeMidiSet
├─ WaterfallStage
│  └─ waterfallNotes
├─ KeyboardBoard
│  └─ Keycap
├─ StatusBar
│  └─ right hidden controls
└─ VideoBackground
   └─ local video object URL
```

## 22. 最核心的一句话

这个项目的本质是：

```text
把物理键盘事件变成音乐数据，再同时驱动声音、钢琴高亮和瀑布动画。
```

只要理解了这条主线，就能继续扩展更多功能，比如录制、播放 MIDI、换乐器、节拍器、保存键位方案等。
