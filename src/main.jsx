import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Soundfont from 'soundfont-player';
import './styles.css';

const mainRows = [
  [
    { code: 'Escape', label: 'Esc', tone: 'cyan' },
    { gap: 0.7 },
    ...Array.from({ length: 12 }, (_, i) => ({ code: `F${i + 1}`, label: `F${i + 1}`, tone: i % 3 === 0 ? 'lime' : 'cyan' }))
  ],
  [
    { code: 'Backquote', label: '`', sub: '~' },
    { code: 'Digit1', label: '1', sub: '!' },
    { code: 'Digit2', label: '2', sub: '@' },
    { code: 'Digit3', label: '3', sub: '#' },
    { code: 'Digit4', label: '4', sub: '$' },
    { code: 'Digit5', label: '5', sub: '%' },
    { code: 'Digit6', label: '6', sub: '^' },
    { code: 'Digit7', label: '7', sub: '&' },
    { code: 'Digit8', label: '8', sub: '*' },
    { code: 'Digit9', label: '9', sub: '(' },
    { code: 'Digit0', label: '0', sub: ')' },
    { code: 'Minus', label: '-', sub: '_' },
    { code: 'Equal', label: '=', sub: '+' },
    { code: 'Backspace', label: 'Backspace', w: 2 }
  ],
  [
    { code: 'Tab', label: 'Tab', w: 1.5 },
    ...'QWERTYUIOP'.split('').map((letter) => ({ code: `Key${letter}`, label: letter, tone: 'cyan' })),
    { code: 'BracketLeft', label: '[', sub: '{' },
    { code: 'BracketRight', label: ']', sub: '}' },
    { code: 'Backslash', label: '\\', sub: '|', w: 1.5 }
  ],
  [
    { code: 'CapsLock', label: 'Caps', w: 1.75 },
    ...'ASDFGHJKL'.split('').map((letter) => ({ code: `Key${letter}`, label: letter, tone: letter === 'A' ? 'magenta' : 'lime' })),
    { code: 'Semicolon', label: ';', sub: ':' },
    { code: 'Quote', label: "'", sub: '"' },
    { code: 'Enter', label: 'Enter', w: 2.25, tone: 'magenta' }
  ],
  [
    { code: 'ShiftLeft', label: 'Shift', w: 2.25, tone: 'magenta' },
    ...'ZXCVBNM'.split('').map((letter) => ({ code: `Key${letter}`, label: letter })),
    { code: 'Comma', label: ',', sub: '<' },
    { code: 'Period', label: '.', sub: '>' },
    { code: 'Slash', label: '/', sub: '?' },
    { code: 'ShiftRight', label: 'Shift', w: 2.75, tone: 'magenta' }
  ],
  [
    { code: 'ControlLeft', label: 'Ctrl', w: 1.35 },
    { code: 'MetaLeft', label: 'Win', w: 1.25 },
    { code: 'AltLeft', label: 'Alt', w: 1.25 },
    { code: 'Space', label: 'Space', w: 6.25, tone: 'lime' },
    { code: 'AltRight', label: 'Alt', w: 1.25 },
    { code: 'MetaRight', label: 'Win', w: 1.25 },
    { code: 'ContextMenu', label: 'Menu', w: 1.25 },
    { code: 'ControlRight', label: 'Ctrl', w: 1.35 }
  ]
];

const systemRows = [
  [
    { code: 'PrintScreen', label: 'PrtSc' },
    { code: 'ScrollLock', label: 'ScrLk' },
    { code: 'Pause', label: 'Pause' }
  ]
];

const navRows = [
  [
    { code: 'Insert', label: 'Ins' },
    { code: 'Home', label: 'Home' },
    { code: 'PageUp', label: 'PgUp' }
  ],
  [
    { code: 'Delete', label: 'Del' },
    { code: 'End', label: 'End' },
    { code: 'PageDown', label: 'PgDn' }
  ]
];

const arrowRows = [
  [
    { gap: 1 },
    { code: 'ArrowUp', label: '▲', aria: 'Arrow Up', tone: 'cyan' },
    { gap: 1 }
  ],
  [
    { code: 'ArrowLeft', label: '◀', aria: 'Arrow Left', tone: 'cyan' },
    { code: 'ArrowDown', label: '▼', aria: 'Arrow Down', tone: 'cyan' },
    { code: 'ArrowRight', label: '▶', aria: 'Arrow Right', tone: 'cyan' }
  ]
];

const numpadRows = [
  [
    { code: 'NumLock', label: 'Num' },
    { code: 'NumpadDivide', label: '/' },
    { code: 'NumpadMultiply', label: '*' },
    { code: 'NumpadSubtract', label: '-' }
  ],
  [
    { code: 'Numpad7', label: '7' },
    { code: 'Numpad8', label: '8' },
    { code: 'Numpad9', label: '9' },
    { code: 'NumpadAdd', label: '+', h: 2 }
  ],
  [
    { code: 'Numpad4', label: '4' },
    { code: 'Numpad5', label: '5' },
    { code: 'Numpad6', label: '6' },
    { skip: true }
  ],
  [
    { code: 'Numpad1', label: '1' },
    { code: 'Numpad2', label: '2' },
    { code: 'Numpad3', label: '3' },
    { code: 'NumpadEnter', label: 'Enter', h: 2, tone: 'magenta' }
  ],
  [
    { code: 'Numpad0', label: '0', w: 2 },
    { code: 'NumpadDecimal', label: '.' },
    { skip: true }
  ]
];

const keyboardSections = [mainRows, systemRows, navRows, arrowRows, numpadRows];
const keyList = keyboardSections.flat(2).filter((key) => key.code);
const keyMap = new Map(keyList.map((key) => [key.code, key]));
const jianpuSemitones = { 1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 11 };
const octaveOffsets = {
  subLow: -24,
  low: -12,
  mid: 0,
  high: 12,
  superHigh: 24,
  ultraHigh: 36
};
const sharpKeySignatures = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const flatKeySignatures = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const PIANO_START_MIDI = 30;
const PIANO_KEY_COUNT = 78;

const musicLabels = {
  Backquote: { note: 'rest' },
  Digit1: { note: '1', octave: 'high' },
  Digit2: { note: '2', octave: 'high' },
  Digit3: { note: '3', octave: 'high' },
  Digit4: { note: '4', octave: 'high' },
  Digit5: { note: '5', octave: 'high' },
  Digit6: { note: '6', octave: 'high' },
  Digit7: { note: '7', octave: 'high' },
  Digit8: { note: '1', octave: 'superHigh' },
  Digit9: { note: '2', octave: 'superHigh' },
  Digit0: { note: '3', octave: 'superHigh' },
  Minus: { note: '4', octave: 'superHigh' },
  Equal: { note: '5', octave: 'superHigh' },
  KeyQ: { note: '1' },
  KeyW: { note: '2' },
  KeyE: { note: '3' },
  KeyR: { note: '4' },
  KeyT: { note: '5' },
  KeyY: { note: '6' },
  KeyU: { note: '7' },
  KeyI: { note: '1', octave: 'high' },
  KeyO: { note: '2', octave: 'high' },
  KeyP: { note: '3', octave: 'high' },
  BracketLeft: { note: '4', octave: 'high' },
  BracketRight: { note: '5', octave: 'high' },
  Backslash: { note: '6', octave: 'high' },
  KeyA: { note: '1', octave: 'low' },
  KeyS: { note: '2', octave: 'low' },
  KeyD: { note: '3', octave: 'low' },
  KeyF: { note: '4', octave: 'low' },
  KeyG: { note: '5', octave: 'low' },
  KeyH: { note: '6', octave: 'low' },
  KeyJ: { note: '7', octave: 'low' },
  KeyK: { note: '1' },
  KeyL: { note: '2' },
  Semicolon: { note: '3' },
  Quote: { note: '4' },
  KeyZ: { note: '1', octave: 'subLow' },
  KeyX: { note: '2', octave: 'subLow' },
  KeyC: { note: '3', octave: 'subLow' },
  KeyV: { note: '4', octave: 'subLow' },
  KeyB: { note: '5', octave: 'subLow' },
  KeyN: { note: '6', octave: 'subLow' },
  KeyM: { note: '7', octave: 'subLow' },
  Comma: { note: '1', octave: 'low' },
  Period: { note: '2', octave: 'low' },
  Slash: { note: '3', octave: 'low' },
  Insert: { note: '4', octave: 'superHigh' },
  Home: { note: '5', octave: 'superHigh' },
  PageUp: { note: '6', octave: 'superHigh' },
  Delete: { note: '1', octave: 'superHigh' },
  End: { note: '2', octave: 'superHigh' },
  PageDown: { note: '3', octave: 'superHigh' },
  ArrowLeft: { note: '1', octave: 'low' },
  ArrowDown: { note: '2', octave: 'low' },
  ArrowRight: { note: '3', octave: 'low' },
  ArrowUp: { note: '4', octave: 'low' },
  NumLock: { note: '4', octave: 'high' },
  NumpadDivide: { note: '5', octave: 'high' },
  NumpadMultiply: { note: '6', octave: 'high' },
  NumpadSubtract: { note: '7', octave: 'high' },
  Numpad7: { note: '7' },
  Numpad8: { note: '1', octave: 'high' },
  Numpad9: { note: '2', octave: 'high' },
  NumpadAdd: { note: '3', octave: 'high' },
  Numpad4: { note: '4' },
  Numpad5: { note: '5' },
  Numpad6: { note: '6' },
  Numpad1: { note: '1' },
  Numpad2: { note: '2' },
  Numpad3: { note: '3' },
  NumpadEnter: { note: '7', octave: 'low' },
  Numpad0: { note: '5', octave: 'low' },
  NumpadDecimal: { note: '6', octave: 'low' }
};

function musicLabelToMidi(value, transpose = 0) {
  if (!value || value.note === 'rest') return null;
  return 60 + transpose + (octaveOffsets[value.octave || 'mid'] || 0) + jianpuSemitones[value.note];
}

const pianoKeys = Array.from({ length: PIANO_KEY_COUNT }, (_, index) => {
  const midi = PIANO_START_MIDI + index;
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const name = names[midi % 12];
  return {
    midi,
    name,
    octave: Math.floor(midi / 12) - 1,
    black: name.includes('#')
  };
});

function formatTime() {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(new Date());
}

function useSoundfontAudio({ sustain, transpose }) {
  const [status, setStatus] = useState('idle');
  const contextRef = useRef(null);
  const instrumentPromiseRef = useRef(null);
  const instrumentRef = useRef(null);
  const activeNodesRef = useRef(new Map());
  const sustainedNodesRef = useRef(new Set());

  const ensureInstrument = useCallback(async () => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      setStatus('unsupported');
      return null;
    }

    if (!contextRef.current) {
      contextRef.current = new AudioContext();
    }

    if (contextRef.current.state === 'suspended') {
      await contextRef.current.resume();
    }

    if (instrumentRef.current) {
      setStatus('ready');
      return instrumentRef.current;
    }

    if (!instrumentPromiseRef.current) {
      setStatus('loading');
      instrumentPromiseRef.current = Soundfont.instrument(contextRef.current, 'acoustic_grand_piano', {
        soundfont: 'FluidR3_GM',
        format: 'mp3'
      }).then((instrument) => {
        instrumentRef.current = instrument;
        setStatus('ready');
        return instrument;
      }).catch((error) => {
        console.error(error);
        instrumentPromiseRef.current = null;
        setStatus('error');
        return null;
      });
    }

    return instrumentPromiseRef.current;
  }, []);

  const play = useCallback(async (code) => {
    const midi = musicLabelToMidi(musicLabels[code], transpose);
    if (!midi || activeNodesRef.current.has(code)) return;
    const instrument = await ensureInstrument();
    if (!instrument || activeNodesRef.current.has(code)) return;
    const node = instrument.play(midi, contextRef.current.currentTime, { gain: 0.78 });
    activeNodesRef.current.set(code, node);
  }, [ensureInstrument, transpose]);

  const stop = useCallback((code) => {
    const node = activeNodesRef.current.get(code);
    if (!node) return;
    if (sustain) {
      sustainedNodesRef.current.add(node);
      activeNodesRef.current.delete(code);
      return;
    }
    const context = contextRef.current;
    node.stop(context ? context.currentTime + 0.08 : undefined);
    activeNodesRef.current.delete(code);
  }, [sustain]);

  const stopAll = useCallback(() => {
    const context = contextRef.current;
    activeNodesRef.current.forEach((node) => {
      node.stop(context ? context.currentTime + 0.08 : undefined);
    });
    sustainedNodesRef.current.forEach((node) => {
      node.stop(context ? context.currentTime + 0.08 : undefined);
    });
    activeNodesRef.current.clear();
    sustainedNodesRef.current.clear();
  }, []);

  useEffect(() => {
    if (sustain) return;
    const context = contextRef.current;
    sustainedNodesRef.current.forEach((node) => {
      node.stop(context ? context.currentTime + 0.08 : undefined);
    });
    sustainedNodesRef.current.clear();
  }, [sustain]);

  return { status, play, stop, stopAll };
}

function useKeyboardTelemetry({ musicMode, onNoteStart, onNoteStop, onStopAll }) {
  const [activeCodes, setActiveCodes] = useState(() => new Set());
  const [lastEvent, setLastEvent] = useState(null);
  const [events, setEvents] = useState([]);
  const previewCodes = useRef(new Set());

  const pushEvent = useCallback((type, code, label) => {
    const event = { type, code, label, time: formatTime() };
    setLastEvent(event);
    setEvents((current) => [event, ...current].slice(0, 8));
  }, []);

  const activate = useCallback((code, source = 'keyboard') => {
    const key = keyMap.get(code);
    if (!key) return;
    setActiveCodes((current) => {
      const next = new Set(current);
      next.add(code);
      return next;
    });
    if (source === 'pointer') previewCodes.current.add(code);
    if (musicMode) onNoteStart(code);
    pushEvent(source === 'pointer' ? 'preview' : 'down', code, key.label);
  }, [musicMode, onNoteStart, pushEvent]);

  const release = useCallback((code, source = 'keyboard') => {
    const key = keyMap.get(code);
    if (!key) return;
    setActiveCodes((current) => {
      const next = new Set(current);
      next.delete(code);
      return next;
    });
    if (source === 'pointer') previewCodes.current.delete(code);
    if (musicMode) onNoteStop(code);
    pushEvent(source === 'pointer' ? 'preview end' : 'up', code, key.label);
  }, [musicMode, onNoteStop, pushEvent]);

  const clear = useCallback(() => {
    previewCodes.current.clear();
    setActiveCodes(new Set());
    onStopAll();
    pushEvent('clear', 'Escape', 'Esc');
  }, [onStopAll, pushEvent]);

  useEffect(() => {
    const handleDown = (event) => {
      if (!keyMap.has(event.code)) return;
      event.preventDefault();
      if (event.code === 'Escape') {
        clear();
        return;
      }
      setActiveCodes((current) => {
        if (current.has(event.code)) return current;
        const next = new Set(current);
        next.add(event.code);
        const key = keyMap.get(event.code);
        if (musicMode) onNoteStart(event.code);
        pushEvent('down', event.code, key.label);
        return next;
      });
    };

    const handleUp = (event) => {
      if (!keyMap.has(event.code) || event.code === 'Escape') return;
      event.preventDefault();
      release(event.code);
    };

    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup', handleUp);
      window.removeEventListener('blur', clear);
    };
  }, [clear, musicMode, onNoteStart, pushEvent, release]);

  return { activeCodes, lastEvent, events, activate, release, clear };
}

function StatusBar({
  keySignature,
  accidentalMode,
  musicMode,
  sustain,
  waterfallMode,
  classicalTheme,
  hasVideoBackground,
  onToggleAccidentalMode,
  onToggleSustain,
  onToggleWaterfall,
  onToggleTheme,
  onImportVideo,
  onClearVideo
}) {
  return (
    <header className="status-bar">
      <div className="status-cluster">
        <button
          className="status-pill key-signature-pill"
          type="button"
          onClick={onToggleAccidentalMode}
          title={accidentalMode === 'sharp' ? '切换成降号调名' : '切换成升号调名'}
        >
          <strong>{keySignature}</strong>
        </button>
        {musicMode && (
          <>
            <button
              className={`sustain-button ${sustain ? 'is-on' : ''}`}
              type="button"
              onClick={onToggleSustain}
              aria-pressed={sustain}
            >
              延音{ sustain ? '开' : '关' }
            </button>
            <button
              className={`waterfall-button ${waterfallMode ? 'is-on' : ''}`}
              type="button"
              onClick={onToggleWaterfall}
              aria-pressed={waterfallMode}
            >
              瀑布{waterfallMode ? '开' : ''}
            </button>
          </>
        )}
        <button
          className={`theme-button ${classicalTheme ? 'is-on' : ''}`}
          type="button"
          onClick={onToggleTheme}
          aria-pressed={classicalTheme}
        >
          {classicalTheme ? '古典界面' : '古典'}
        </button>
        <button
          className={`video-button ${hasVideoBackground ? 'is-on' : ''}`}
          type="button"
          onClick={onImportVideo}
          aria-pressed={hasVideoBackground}
        >
          {hasVideoBackground ? '更换背景' : '视频背景'}
        </button>
        {hasVideoBackground && (
          <button className="video-button clear-video-button" type="button" onClick={onClearVideo}>
            隐藏背景
          </button>
        )}
      </div>
    </header>
  );
}

function VideoBackground({ src }) {
  if (!src) return null;
  return (
    <div className="video-background" aria-hidden="true">
      <video src={src} autoPlay muted loop playsInline />
      <div className="video-background-overlay" />
    </div>
  );
}

function WaterfallStage({ notes, now }) {
  const stageRef = useRef(null);
  const [stageHeight, setStageHeight] = useState(620);

  useEffect(() => {
    const updateHeight = () => {
      setStageHeight(stageRef.current?.clientHeight || 620);
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    if (stageRef.current) observer.observe(stageRef.current);
    window.addEventListener('resize', updateHeight);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateHeight);
    };
  }, []);

  return (
    <section className="waterfall-stage" aria-label="Piano waterfall" ref={stageRef}>
      <div className="waterfall-grid" aria-hidden="true" />
      <div className="waterfall-lanes">
        {notes.map((note) => {
          const midiOffset = note.midi - PIANO_START_MIDI;
          if (midiOffset < 0 || midiOffset >= PIANO_KEY_COUNT) return null;
          const heldUntil = note.releasedAt || now;
          const age = Math.max(0, heldUntil - note.startedAt);
          const releasedAge = note.releasedAt ? Math.max(0, now - note.releasedAt) : 0;
          const maxVisibleHeight = stageHeight + releasedAge * 0.34 + 80;
          const height = Math.min(maxVisibleHeight, 28 + age * 0.22);
          const bottom = releasedAge * 0.34;
          const opacity = note.releasedAt ? Math.max(0, 1 - releasedAge / 1500) : 1;
          return (
            <span
              className={`waterfall-note ${note.black ? 'is-black-note' : ''}`}
              key={note.id}
              style={{
                '--left': `${(midiOffset / PIANO_KEY_COUNT) * 100}%`,
                '--width': `${(1 / PIANO_KEY_COUNT) * 84}%`,
                '--height': `${height}px`,
                '--bottom': `${bottom}px`,
                '--opacity': opacity
              }}
            />
          );
        })}
      </div>
    </section>
  );
}

function PianoKeyboard({ activeMidiSet }) {
  return (
    <section className="piano-stage" aria-label="Piano key mapping">
      <div className="piano-scroll">
        <div className="piano-board">
          {pianoKeys.map((key) => (
            <span
              className={`piano-key ${key.black ? 'black-key' : 'white-key'} ${activeMidiSet.has(key.midi) ? 'is-active' : ''}`}
              key={key.midi}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function MusicNote({ value }) {
  if (!value) return null;
  if (value.note === 'rest') return <span className="music-note rest-note">~</span>;
  return (
    <span className={`music-note octave-${value.octave || 'mid'}`}>
      <span className="note-dot note-dot-third-top" />
      <span className="note-dot note-dot-extra-top" />
      <span className="note-dot note-dot-top" />
      <span className="note-number">{value.note}</span>
      <span className="note-dot note-dot-bottom" />
      <span className="note-dot note-dot-extra-bottom" />
    </span>
  );
}

function Keycap({ item, active, musicMode, keySignature, onPreviewStart, onPreviewEnd }) {
  if (item.gap) {
    return <span className="key-gap" style={{ '--units': item.gap }} aria-hidden="true" />;
  }
  if (item.skip) {
    return <span className="key-skip" aria-hidden="true" />;
  }
  const musicLabel = musicMode ? musicLabels[item.code] : null;
  const isMusicKey = Boolean(musicLabel);
  const isTransposeKey = musicMode && item.code === 'Space';
  return (
    <button
      className={`keycap ${active ? 'is-active' : ''} ${isMusicKey ? 'is-music-key' : ''} ${isTransposeKey ? 'is-transpose-key' : ''} tone-${item.tone || 'cyan'}`}
      style={{ '--w': item.w || 1, '--h': item.h || 1 }}
      type="button"
      aria-label={item.aria || item.label}
      data-code={item.code}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        onPreviewStart(item.code);
      }}
      onPointerUp={(event) => {
        event.currentTarget.releasePointerCapture(event.pointerId);
        onPreviewEnd(item.code);
      }}
      onPointerCancel={() => onPreviewEnd(item.code)}
      onPointerLeave={(event) => {
        if (event.buttons) onPreviewEnd(item.code);
      }}
    >
      {isTransposeKey ? (
        <>
          <span className="transpose-label">Key</span>
          <strong className="transpose-value">{keySignature}</strong>
          <span className="key-code">Mouse wheel transpose</span>
        </>
      ) : isMusicKey ? (
        <>
          <MusicNote value={musicLabel} />
          <span className="key-code">{item.label}</span>
        </>
      ) : (
        <>
          <span className="key-label">{item.label}</span>
          {item.sub && <span className="key-sub">{item.sub}</span>}
          <span className="key-code">{item.code.replace('Numpad', 'Num')}</span>
        </>
      )}
    </button>
  );
}

function KeyboardBoard({ activeCodes, musicMode, keySignature, activate, release }) {
  const renderRows = (rows, className) => (
    <div className={className}>
      {rows.map((row, index) => (
        <div className="keyboard-row" key={index}>
          {row.map((item, itemIndex) => (
            <Keycap
              key={item.code || `${index}-${itemIndex}`}
              item={item}
              active={activeCodes.has(item.code)}
              musicMode={musicMode}
              keySignature={keySignature}
              onPreviewStart={(code) => activate(code, 'pointer')}
              onPreviewEnd={(code) => release(code, 'pointer')}
            />
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <section className="keyboard-stage" aria-label="104 key keyboard">
      <div className="keyboard-glow" />
      <div className={`keyboard-frame ${musicMode ? 'music-mode' : ''}`}>
        <div className="keyboard-layout">
          {renderRows(mainRows, 'key-zone main-zone')}
          {renderRows(systemRows, 'key-zone system-zone')}
          {renderRows(navRows, 'key-zone nav-zone')}
          {renderRows(arrowRows, 'key-zone arrow-zone')}
          {renderRows(numpadRows, 'key-zone numpad-zone')}
        </div>
      </div>
    </section>
  );
}

function App() {
  const [musicMode, setMusicMode] = useState(true);
  const [sustain, setSustain] = useState(true);
  const [transpose, setTranspose] = useState(0);
  const [accidentalMode, setAccidentalMode] = useState('sharp');
  const [classicalTheme, setClassicalTheme] = useState(() => localStorage.getItem('keylight-theme') === 'classical');
  const [waterfallMode, setWaterfallMode] = useState(false);
  const [waterfallNotes, setWaterfallNotes] = useState([]);
  const [waterfallNow, setWaterfallNow] = useState(() => performance.now());
  const [videoBackground, setVideoBackground] = useState(null);
  const videoInputRef = useRef(null);
  const wheelDeltaRef = useRef(0);
  const waterfallIdRef = useRef(0);
  const activeWaterfallNotesRef = useRef(new Map());
  const keySignature = (accidentalMode === 'sharp' ? sharpKeySignatures : flatKeySignatures)[transpose];
  const audio = useSoundfontAudio({ sustain, transpose });

  const beginWaterfallNote = useCallback((code) => {
    const midi = musicLabelToMidi(musicLabels[code], transpose);
    if (!midi || activeWaterfallNotesRef.current.has(code)) return;
    const now = performance.now();
    const id = `${code}-${waterfallIdRef.current += 1}`;
    activeWaterfallNotesRef.current.set(code, id);
    setWaterfallNotes((current) => [
      ...current,
      {
        id,
        code,
        midi,
        black: pianoKeys[midi - PIANO_START_MIDI]?.black || false,
        startedAt: now,
        releasedAt: null
      }
    ]);
  }, [transpose]);

  const endWaterfallNote = useCallback((code) => {
    const id = activeWaterfallNotesRef.current.get(code);
    if (!id) return;
    activeWaterfallNotesRef.current.delete(code);
    const now = performance.now();
    setWaterfallNotes((current) => current.map((note) => (
      note.id === id ? { ...note, releasedAt: now } : note
    )));
  }, []);

  const stopWaterfallNotes = useCallback(() => {
    activeWaterfallNotesRef.current.clear();
    setWaterfallNotes([]);
  }, []);

  const handleNoteStart = useCallback((code) => {
    audio.play(code);
    if (musicMode && waterfallMode) beginWaterfallNote(code);
  }, [audio, beginWaterfallNote, musicMode, waterfallMode]);

  const handleNoteStop = useCallback((code) => {
    audio.stop(code);
    if (waterfallMode) endWaterfallNote(code);
  }, [audio, endWaterfallNote, waterfallMode]);

  const handleStopAll = useCallback(() => {
    audio.stopAll();
    stopWaterfallNotes();
  }, [audio, stopWaterfallNotes]);

  const { activeCodes, activate, release } = useKeyboardTelemetry({
    musicMode,
    onNoteStart: handleNoteStart,
    onNoteStop: handleNoteStop,
    onStopAll: handleStopAll
  });
  const activeMidiSet = useMemo(() => {
    if (!musicMode) return new Set();
    return new Set([...activeCodes].map((code) => musicLabelToMidi(musicLabels[code], transpose)).filter(Boolean));
  }, [activeCodes, musicMode, transpose]);

  useEffect(() => {
    if (!musicMode) return undefined;

    const handleWheel = (event) => {
      event.preventDefault();
      wheelDeltaRef.current += event.deltaY;

      if (Math.abs(wheelDeltaRef.current) < 80) return;
      const direction = wheelDeltaRef.current < 0 ? 1 : -1;
      wheelDeltaRef.current = 0;
      setTranspose((current) => (current + direction + 12) % 12);
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [musicMode]);

  useEffect(() => {
    document.body.classList.toggle('classical-theme', classicalTheme);
    localStorage.setItem('keylight-theme', classicalTheme ? 'classical' : 'modern');
  }, [classicalTheme]);

  useEffect(() => () => {
    if (videoBackground) URL.revokeObjectURL(videoBackground);
  }, [videoBackground]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      await document.documentElement.requestFullscreen();
    } catch (error) {
      console.warn('Fullscreen request failed', error);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenKey = (event) => {
      if (event.code !== 'F11') return;
      event.preventDefault();
      toggleFullscreen();
    };

    window.addEventListener('keydown', handleFullscreenKey);
    return () => window.removeEventListener('keydown', handleFullscreenKey);
  }, [toggleFullscreen]);

  useEffect(() => {
    if (!waterfallMode) return undefined;
    let frame = 0;

    const tick = () => {
      const now = performance.now();
      setWaterfallNow(now);
      setWaterfallNotes((current) => current.filter((note) => !note.releasedAt || now - note.releasedAt < 1800));
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [waterfallMode]);

  useEffect(() => {
    if (musicMode) return;
    setWaterfallMode(false);
    stopWaterfallNotes();
  }, [musicMode, stopWaterfallNotes]);

  const toggleWaterfallMode = useCallback(() => {
    setMusicMode(true);
    setWaterfallMode((current) => {
      const next = !current;
      if (!next) stopWaterfallNotes();
      return next;
    });
  }, [stopWaterfallNotes]);

  const importVideoBackground = useCallback(() => {
    videoInputRef.current?.click();
  }, []);

  const handleVideoSelection = useCallback((event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !file.type.startsWith('video/')) return;

    setVideoBackground((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
  }, []);

  const clearVideoBackground = useCallback(() => {
    setVideoBackground((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  }, []);

  return (
    <main className={`app-shell ${waterfallMode ? 'waterfall-mode' : ''} ${classicalTheme ? 'theme-classical' : ''} ${videoBackground ? 'has-video-bg' : ''}`}>
      <VideoBackground src={videoBackground} />
      <input
        ref={videoInputRef}
        className="video-file-input"
        type="file"
        accept="video/*"
        onChange={handleVideoSelection}
      />
      {musicMode && waterfallMode && (
        <WaterfallStage notes={waterfallNotes} now={waterfallNow} />
      )}
      {musicMode && <PianoKeyboard activeMidiSet={activeMidiSet} />}
      {!waterfallMode && (
        <KeyboardBoard
          activeCodes={activeCodes}
          musicMode={musicMode}
          keySignature={keySignature}
          activate={activate}
          release={release}
        />
      )}
      <StatusBar
        keySignature={keySignature}
        accidentalMode={accidentalMode}
        musicMode={musicMode}
        sustain={sustain}
        waterfallMode={waterfallMode}
        classicalTheme={classicalTheme}
        hasVideoBackground={Boolean(videoBackground)}
        onToggleAccidentalMode={() => setAccidentalMode((current) => (current === 'sharp' ? 'flat' : 'sharp'))}
        onToggleSustain={() => setSustain((current) => !current)}
        onToggleWaterfall={toggleWaterfallMode}
        onToggleTheme={() => setClassicalTheme((current) => !current)}
        onImportVideo={importVideoBackground}
        onClearVideo={clearVideoBackground}
      />
      <footer className="soundfont-credit">SoundFont: FluidR3_GM acoustic grand piano via gleitz/midi-js-soundfonts</footer>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
