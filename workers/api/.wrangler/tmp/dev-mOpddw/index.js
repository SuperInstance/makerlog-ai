var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../../../../.nvm/versions/node/v22.21.1/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/_internal/utils.mjs
// @__NO_SIDE_EFFECTS__
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
// @__NO_SIDE_EFFECTS__
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw /* @__PURE__ */ createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");
// @__NO_SIDE_EFFECTS__
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass, "notImplementedClass");

// ../../../../.nvm/versions/node/v22.21.1/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  static {
    __name(this, "PerformanceEntry");
  }
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
var PerformanceMark = class PerformanceMark2 extends PerformanceEntry {
  static {
    __name(this, "PerformanceMark");
  }
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
};
var PerformanceMeasure = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceMeasure");
  }
  entryType = "measure";
};
var PerformanceResourceTiming = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceResourceTiming");
  }
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
var PerformanceObserverEntryList = class {
  static {
    __name(this, "PerformanceObserverEntryList");
  }
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
var Performance = class {
  static {
    __name(this, "Performance");
  }
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
var PerformanceObserver = class {
  static {
    __name(this, "PerformanceObserver");
  }
  __unenv__ = true;
  static supportedEntryTypes = [];
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// ../../../../.nvm/versions/node/v22.21.1/lib/node_modules/wrangler/node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
globalThis.performance = performance;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// ../../../../.nvm/versions/node/v22.21.1/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";

// ../../../../.nvm/versions/node/v22.21.1/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default = Object.assign(() => {
}, { __unenv__: true });

// ../../../../.nvm/versions/node/v22.21.1/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/console.mjs
var _console = globalThis.console;
var _ignoreErrors = true;
var _stderr = new Writable();
var _stdout = new Writable();
var log = _console?.log ?? noop_default;
var info = _console?.info ?? log;
var trace = _console?.trace ?? info;
var debug = _console?.debug ?? log;
var table = _console?.table ?? log;
var error = _console?.error ?? log;
var warn = _console?.warn ?? error;
var createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
var clear = _console?.clear ?? noop_default;
var count = _console?.count ?? noop_default;
var countReset = _console?.countReset ?? noop_default;
var dir = _console?.dir ?? noop_default;
var dirxml = _console?.dirxml ?? noop_default;
var group = _console?.group ?? noop_default;
var groupEnd = _console?.groupEnd ?? noop_default;
var groupCollapsed = _console?.groupCollapsed ?? noop_default;
var profile = _console?.profile ?? noop_default;
var profileEnd = _console?.profileEnd ?? noop_default;
var time = _console?.time ?? noop_default;
var timeEnd = _console?.timeEnd ?? noop_default;
var timeLog = _console?.timeLog ?? noop_default;
var timeStamp = _console?.timeStamp ?? noop_default;
var Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
var _times = /* @__PURE__ */ new Map();
var _stdoutErrorHandler = noop_default;
var _stderrErrorHandler = noop_default;

// ../../../../.nvm/versions/node/v22.21.1/lib/node_modules/wrangler/node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole = globalThis["console"];
var {
  assert,
  clear: clear2,
  // @ts-expect-error undocumented public API
  context,
  count: count2,
  countReset: countReset2,
  // @ts-expect-error undocumented public API
  createTask: createTask2,
  debug: debug2,
  dir: dir2,
  dirxml: dirxml2,
  error: error2,
  group: group2,
  groupCollapsed: groupCollapsed2,
  groupEnd: groupEnd2,
  info: info2,
  log: log2,
  profile: profile2,
  profileEnd: profileEnd2,
  table: table2,
  time: time2,
  timeEnd: timeEnd2,
  timeLog: timeLog2,
  timeStamp: timeStamp2,
  trace: trace2,
  warn: warn2
} = workerdConsole;
Object.assign(workerdConsole, {
  Console,
  _ignoreErrors,
  _stderr,
  _stderrErrorHandler,
  _stdout,
  _stdoutErrorHandler,
  _times
});
var console_default = workerdConsole;

// ../../../../.nvm/versions/node/v22.21.1/lib/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
globalThis.console = console_default;

// ../../../../.nvm/versions/node/v22.21.1/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
  const now = Date.now();
  const seconds = Math.trunc(now / 1e3);
  const nanos = now % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
  return BigInt(Date.now() * 1e6);
}, "bigint") });

// ../../../../.nvm/versions/node/v22.21.1/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// ../../../../.nvm/versions/node/v22.21.1/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
var ReadStream = class {
  static {
    __name(this, "ReadStream");
  }
  fd;
  isRaw = false;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
};

// ../../../../.nvm/versions/node/v22.21.1/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
var WriteStream = class {
  static {
    __name(this, "WriteStream");
  }
  fd;
  columns = 80;
  rows = 24;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  clearLine(dir3, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x, y, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env2) {
    return 1;
  }
  hasColors(count3, env2) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  write(str, encoding, cb) {
    if (str instanceof Uint8Array) {
      str = new TextDecoder().decode(str);
    }
    try {
      console.log(str);
    } catch {
    }
    cb && typeof cb === "function" && cb();
    return false;
  }
};

// ../../../../.nvm/versions/node/v22.21.1/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs
var NODE_VERSION = "22.14.0";

// ../../../../.nvm/versions/node/v22.21.1/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class _Process extends EventEmitter {
  static {
    __name(this, "Process");
  }
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(_Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  // --- event emitter ---
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  // --- stdio (lazy initializers) ---
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream(2);
  }
  // --- cwd ---
  #cwd = "/";
  chdir(cwd2) {
    this.#cwd = cwd2;
  }
  cwd() {
    return this.#cwd;
  }
  // --- dummy props and getters ---
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return `v${NODE_VERSION}`;
  }
  get versions() {
    return { node: NODE_VERSION };
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  // --- noop methods ---
  ref() {
  }
  unref() {
  }
  // --- unimplemented methods ---
  umask() {
    throw createNotImplementedError("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw createNotImplementedError("process.getActiveResourcesInfo");
  }
  exit() {
    throw createNotImplementedError("process.exit");
  }
  reallyExit() {
    throw createNotImplementedError("process.reallyExit");
  }
  kill() {
    throw createNotImplementedError("process.kill");
  }
  abort() {
    throw createNotImplementedError("process.abort");
  }
  dlopen() {
    throw createNotImplementedError("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw createNotImplementedError("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw createNotImplementedError("process.loadEnvFile");
  }
  disconnect() {
    throw createNotImplementedError("process.disconnect");
  }
  cpuUsage() {
    throw createNotImplementedError("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw createNotImplementedError("process.initgroups");
  }
  openStdin() {
    throw createNotImplementedError("process.openStdin");
  }
  assert() {
    throw createNotImplementedError("process.assert");
  }
  binding() {
    throw createNotImplementedError("process.binding");
  }
  // --- attached interfaces ---
  permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: /* @__PURE__ */ __name(() => 0, "rss") });
  // --- undefined props ---
  mainModule = void 0;
  domain = void 0;
  // optional
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  // internals
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};

// ../../../../.nvm/versions/node/v22.21.1/lib/node_modules/wrangler/node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var workerdProcess = getBuiltinModule("node:process");
var isWorkerdProcessV2 = globalThis.Cloudflare.compatibilityFlags.enable_nodejs_process_v2;
var unenvProcess = new Process({
  env: globalProcess.env,
  // `hrtime` is only available from workerd process v2
  hrtime: isWorkerdProcessV2 ? workerdProcess.hrtime : hrtime,
  // `nextTick` is available from workerd process v1
  nextTick: workerdProcess.nextTick
});
var { exit, features, platform } = workerdProcess;
var {
  // Always implemented by workerd
  env,
  // Only implemented in workerd v2
  hrtime: hrtime3,
  // Always implemented by workerd
  nextTick
} = unenvProcess;
var {
  _channel,
  _disconnect,
  _events,
  _eventsCount,
  _handleQueue,
  _maxListeners,
  _pendingMessage,
  _send,
  assert: assert2,
  disconnect,
  mainModule
} = unenvProcess;
var {
  // @ts-expect-error `_debugEnd` is missing typings
  _debugEnd,
  // @ts-expect-error `_debugProcess` is missing typings
  _debugProcess,
  // @ts-expect-error `_exiting` is missing typings
  _exiting,
  // @ts-expect-error `_fatalException` is missing typings
  _fatalException,
  // @ts-expect-error `_getActiveHandles` is missing typings
  _getActiveHandles,
  // @ts-expect-error `_getActiveRequests` is missing typings
  _getActiveRequests,
  // @ts-expect-error `_kill` is missing typings
  _kill,
  // @ts-expect-error `_linkedBinding` is missing typings
  _linkedBinding,
  // @ts-expect-error `_preload_modules` is missing typings
  _preload_modules,
  // @ts-expect-error `_rawDebug` is missing typings
  _rawDebug,
  // @ts-expect-error `_startProfilerIdleNotifier` is missing typings
  _startProfilerIdleNotifier,
  // @ts-expect-error `_stopProfilerIdleNotifier` is missing typings
  _stopProfilerIdleNotifier,
  // @ts-expect-error `_tickCallback` is missing typings
  _tickCallback,
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  arch,
  argv,
  argv0,
  availableMemory,
  // @ts-expect-error `binding` is missing typings
  binding,
  channel,
  chdir,
  config,
  connected,
  constrainedMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  // @ts-expect-error `domain` is missing typings
  domain,
  emit,
  emitWarning,
  eventNames,
  execArgv,
  execPath,
  exitCode,
  finalization,
  getActiveResourcesInfo,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getMaxListeners,
  getuid,
  hasUncaughtExceptionCaptureCallback,
  // @ts-expect-error `initgroups` is missing typings
  initgroups,
  kill,
  listenerCount,
  listeners,
  loadEnvFile,
  memoryUsage,
  // @ts-expect-error `moduleLoadList` is missing typings
  moduleLoadList,
  off,
  on,
  once,
  // @ts-expect-error `openStdin` is missing typings
  openStdin,
  permission,
  pid,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  // @ts-expect-error `reallyExit` is missing typings
  reallyExit,
  ref,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  send,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setMaxListeners,
  setSourceMapsEnabled,
  setuid,
  setUncaughtExceptionCaptureCallback,
  sourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  throwDeprecation,
  title,
  traceDeprecation,
  umask,
  unref,
  uptime,
  version,
  versions
} = isWorkerdProcessV2 ? workerdProcess : unenvProcess;
var _process = {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exit,
  finalization,
  features,
  getBuiltinModule,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  nextTick,
  on,
  off,
  once,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  // @ts-expect-error old API
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
};
var process_default = _process;

// ../../../../.nvm/versions/node/v22.21.1/lib/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// node_modules/hono/dist/compose.js
var compose = /* @__PURE__ */ __name((middleware, onError, onNotFound) => {
  return (context2, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context2.req.routeIndex = i;
      } else {
        handler = i === middleware.length && next || void 0;
      }
      if (handler) {
        try {
          res = await handler(context2, () => dispatch(i + 1));
        } catch (err) {
          if (err instanceof Error && onError) {
            context2.error = err;
            res = await onError(err, context2);
            isError = true;
          } else {
            throw err;
          }
        }
      } else {
        if (context2.finalized === false && onNotFound) {
          res = await onNotFound(context2);
        }
      }
      if (res && (context2.finalized === false || isError)) {
        context2.res = res;
      }
      return context2;
    }
    __name(dispatch, "dispatch");
  };
}, "compose");

// node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

// node_modules/hono/dist/utils/body.js
var parseBody = /* @__PURE__ */ __name(async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const headers = request instanceof HonoRequest ? request.raw.headers : request.headers;
  const contentType = headers.get("Content-Type");
  if (contentType?.startsWith("multipart/form-data") || contentType?.startsWith("application/x-www-form-urlencoded")) {
    return parseFormData(request, { all, dot });
  }
  return {};
}, "parseBody");
async function parseFormData(request, options) {
  const formData = await request.formData();
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
__name(parseFormData, "parseFormData");
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value);
        delete form[key];
      }
    });
  }
  return form;
}
__name(convertFormDataToBodyData, "convertFormDataToBodyData");
var handleParsingAllValues = /* @__PURE__ */ __name((form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) {
      ;
      form[key].push(value);
    } else {
      form[key] = [form[key], value];
    }
  } else {
    if (!key.endsWith("[]")) {
      form[key] = value;
    } else {
      form[key] = [value];
    }
  }
}, "handleParsingAllValues");
var handleParsingNestedValues = /* @__PURE__ */ __name((form, key, value) => {
  let nestedForm = form;
  const keys = key.split(".");
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
}, "handleParsingNestedValues");

// node_modules/hono/dist/utils/url.js
var splitPath = /* @__PURE__ */ __name((path) => {
  const paths = path.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
}, "splitPath");
var splitRoutingPath = /* @__PURE__ */ __name((routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
}, "splitRoutingPath");
var extractGroupsFromPath = /* @__PURE__ */ __name((path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return { groups, path };
}, "extractGroupsFromPath");
var replaceGroupMarks = /* @__PURE__ */ __name((paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
}, "replaceGroupMarks");
var patternCache = {};
var getPattern = /* @__PURE__ */ __name((label, next) => {
  if (label === "*") {
    return "*";
  }
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match2[2]) {
        patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey, match2[1], new RegExp(`^${match2[2]}(?=/${next})`)] : [label, match2[1], new RegExp(`^${match2[2]}$`)];
      } else {
        patternCache[cacheKey] = [label, match2[1], true];
      }
    }
    return patternCache[cacheKey];
  }
  return null;
}, "getPattern");
var tryDecode = /* @__PURE__ */ __name((str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder(match2);
      } catch {
        return match2;
      }
    });
  }
}, "tryDecode");
var tryDecodeURI = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURI), "tryDecodeURI");
var getPath = /* @__PURE__ */ __name((request) => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const path = url.slice(start, queryIndex === -1 ? void 0 : queryIndex);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63) {
      break;
    }
  }
  return url.slice(start, i);
}, "getPath");
var getPathNoStrict = /* @__PURE__ */ __name((request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
}, "getPathNoStrict");
var mergePath = /* @__PURE__ */ __name((base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
}, "mergePath");
var checkOptionalParameter = /* @__PURE__ */ __name((path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) {
    return null;
  }
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (/\?/.test(segment)) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.replace("?", "");
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
}, "checkOptionalParameter");
var _decodeURI = /* @__PURE__ */ __name((value) => {
  if (!/[%+]/.test(value)) {
    return value;
  }
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return value.indexOf("%") !== -1 ? tryDecode(value, decodeURIComponent_) : value;
}, "_decodeURI");
var _getQueryParam = /* @__PURE__ */ __name((url, key, multiple) => {
  let encoded;
  if (!multiple && key && !/[%+]/.test(key)) {
    let keyIndex2 = url.indexOf("?", 8);
    if (keyIndex2 === -1) {
      return void 0;
    }
    if (!url.startsWith(key, keyIndex2 + 1)) {
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = {};
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      ;
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key ? results[key] : results;
}, "_getQueryParam");
var getQueryParam = _getQueryParam;
var getQueryParams = /* @__PURE__ */ __name((url, key) => {
  return _getQueryParam(url, key, true);
}, "getQueryParams");
var decodeURIComponent_ = decodeURIComponent;

// node_modules/hono/dist/request.js
var tryDecodeURIComponent = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURIComponent_), "tryDecodeURIComponent");
var HonoRequest = class {
  static {
    __name(this, "HonoRequest");
  }
  /**
   * `.raw` can get the raw Request object.
   *
   * @see {@link https://hono.dev/docs/api/request#raw}
   *
   * @example
   * ```ts
   * // For Cloudflare Workers
   * app.post('/', async (c) => {
   *   const metadata = c.req.raw.cf?.hostMetadata?
   *   ...
   * })
   * ```
   */
  raw;
  #validatedData;
  // Short name of validatedData
  #matchResult;
  routeIndex = 0;
  /**
   * `.path` can get the pathname of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#path}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const pathname = c.req.path // `/about/me`
   * })
   * ```
   */
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
    this.#validatedData = {};
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex][1][key];
    const param = this.#getParamValue(paramKey);
    return param && /\%/.test(param) ? tryDecodeURIComponent(param) : param;
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) {
        decoded[key] = /\%/.test(value) ? tryDecodeURIComponent(value) : value;
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name) ?? void 0;
    }
    const headerData = {};
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return this.bodyCache.parsedBody ??= await parseBody(this, options);
  }
  #cachedBody = /* @__PURE__ */ __name((key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    const anyCachedKey = Object.keys(bodyCache)[0];
    if (anyCachedKey) {
      return bodyCache[anyCachedKey].then((body) => {
        if (anyCachedKey === "json") {
          body = JSON.stringify(body);
        }
        return new Response(body)[key]();
      });
    }
    return bodyCache[key] = raw2[key]();
  }, "#cachedBody");
  /**
   * `.json()` can parse Request body of type `application/json`
   *
   * @see {@link https://hono.dev/docs/api/request#json}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.json()
   * })
   * ```
   */
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  /**
   * `.text()` can parse Request body of type `text/plain`
   *
   * @see {@link https://hono.dev/docs/api/request#text}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.text()
   * })
   * ```
   */
  text() {
    return this.#cachedBody("text");
  }
  /**
   * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
   *
   * @see {@link https://hono.dev/docs/api/request#arraybuffer}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.arrayBuffer()
   * })
   * ```
   */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
   * Parses the request body as a `Blob`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.blob();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#blob
   */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
   * Parses the request body as `FormData`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.formData();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#formdata
   */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
   * Adds validated data to the request.
   *
   * @param target - The target of the validation.
   * @param data - The validated data to add.
   */
  addValidatedData(target, data) {
    this.#validatedData[target] = data;
  }
  valid(target) {
    return this.#validatedData[target];
  }
  /**
   * `.url()` can get the request url strings.
   *
   * @see {@link https://hono.dev/docs/api/request#url}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const url = c.req.url // `http://localhost:8787/about/me`
   *   ...
   * })
   * ```
   */
  get url() {
    return this.raw.url;
  }
  /**
   * `.method()` can get the method name of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#method}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const method = c.req.method // `GET`
   * })
   * ```
   */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
   * `.matchedRoutes()` can return a matched route in the handler
   *
   * @deprecated
   *
   * Use matchedRoutes helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#matchedroutes}
   *
   * @example
   * ```ts
   * app.use('*', async function logger(c, next) {
   *   await next()
   *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
   *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
   *     console.log(
   *       method,
   *       ' ',
   *       path,
   *       ' '.repeat(Math.max(10 - path.length, 0)),
   *       name,
   *       i === c.req.routeIndex ? '<- respond from here' : ''
   *     )
   *   })
   * })
   * ```
   */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
   * `routePath()` can retrieve the path registered within the handler
   *
   * @deprecated
   *
   * Use routePath helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#routepath}
   *
   * @example
   * ```ts
   * app.get('/posts/:id', (c) => {
   *   return c.json({ path: c.req.routePath })
   * })
   * ```
   */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = /* @__PURE__ */ __name((value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
}, "raw");
var resolveCallback = /* @__PURE__ */ __name(async (str, phase, preserveCallbacks, context2, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) {
      str = str.toString();
    }
    if (str instanceof Promise) {
      str = await str;
    }
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer) {
    buffer[0] += str;
  } else {
    buffer = [str];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context: context2 }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context2, buffer))
    ).then(() => buffer[0])
  );
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
}, "resolveCallback");

// node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = /* @__PURE__ */ __name((contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
}, "setDefaultContentType");
var Context = class {
  static {
    __name(this, "Context");
  }
  #rawRequest;
  #req;
  /**
   * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
   *
   * @see {@link https://hono.dev/docs/api/context#env}
   *
   * @example
   * ```ts
   * // Environment object for Cloudflare Workers
   * app.get('*', async c => {
   *   const counter = c.env.COUNTER
   * })
   * ```
   */
  env = {};
  #var;
  finalized = false;
  /**
   * `.error` can get the error object from the middleware if the Handler throws an error.
   *
   * @see {@link https://hono.dev/docs/api/context#error}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   await next()
   *   if (c.error) {
   *     // do something...
   *   }
   * })
   * ```
   */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
   * Creates an instance of the Context class.
   *
   * @param req - The Request object.
   * @param options - Optional configuration options for the context.
   */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
   * `.req` is the instance of {@link HonoRequest}.
   */
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#event}
   * The FetchEvent associated with the current request.
   *
   * @throws Will throw an error if the context does not have a FetchEvent.
   */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#executionctx}
   * The ExecutionContext associated with the current request.
   *
   * @throws Will throw an error if the context does not have an ExecutionContext.
   */
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#res}
   * The Response object for the current request.
   */
  get res() {
    return this.#res ||= new Response(null, {
      headers: this.#preparedHeaders ??= new Headers()
    });
  }
  /**
   * Sets the Response object for the current request.
   *
   * @param _res - The Response object to set.
   */
  set res(_res) {
    if (this.#res && _res) {
      _res = new Response(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") {
          continue;
        }
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k, v);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
   * `.render()` can create a response within a layout.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   return c.render('Hello!')
   * })
   * ```
   */
  render = /* @__PURE__ */ __name((...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  }, "render");
  /**
   * Sets the layout for the response.
   *
   * @param layout - The layout to set.
   * @returns The layout function.
   */
  setLayout = /* @__PURE__ */ __name((layout) => this.#layout = layout, "setLayout");
  /**
   * Gets the current layout for the response.
   *
   * @returns The current layout function.
   */
  getLayout = /* @__PURE__ */ __name(() => this.#layout, "getLayout");
  /**
   * `.setRenderer()` can set the layout in the custom middleware.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```tsx
   * app.use('*', async (c, next) => {
   *   c.setRenderer((content) => {
   *     return c.html(
   *       <html>
   *         <body>
   *           <p>{content}</p>
   *         </body>
   *       </html>
   *     )
   *   })
   *   await next()
   * })
   * ```
   */
  setRenderer = /* @__PURE__ */ __name((renderer) => {
    this.#renderer = renderer;
  }, "setRenderer");
  /**
   * `.header()` can set headers.
   *
   * @see {@link https://hono.dev/docs/api/context#header}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  header = /* @__PURE__ */ __name((name, value, options) => {
    if (this.finalized) {
      this.#res = new Response(this.#res.body, this.#res);
    }
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) {
      headers.delete(name);
    } else if (options?.append) {
      headers.append(name, value);
    } else {
      headers.set(name, value);
    }
  }, "header");
  status = /* @__PURE__ */ __name((status) => {
    this.#status = status;
  }, "status");
  /**
   * `.set()` can set the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   c.set('message', 'Hono is hot!!')
   *   await next()
   * })
   * ```
   */
  set = /* @__PURE__ */ __name((key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  }, "set");
  /**
   * `.get()` can use the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   const message = c.get('message')
   *   return c.text(`The message is "${message}"`)
   * })
   * ```
   */
  get = /* @__PURE__ */ __name((key) => {
    return this.#var ? this.#var.get(key) : void 0;
  }, "get");
  /**
   * `.var` can access the value of a variable.
   *
   * @see {@link https://hono.dev/docs/api/context#var}
   *
   * @example
   * ```ts
   * const result = c.var.client.oneMethod()
   * ```
   */
  // c.var.propName is a read-only
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    const responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders ?? new Headers();
    if (typeof arg === "object" && "headers" in arg) {
      const argHeaders = arg.headers instanceof Headers ? arg.headers : new Headers(arg.headers);
      for (const [key, value] of argHeaders) {
        if (key.toLowerCase() === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    }
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        if (typeof v === "string") {
          responseHeaders.set(k, v);
        } else {
          responseHeaders.delete(k);
          for (const v2 of v) {
            responseHeaders.append(k, v2);
          }
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return new Response(data, { status, headers: responseHeaders });
  }
  newResponse = /* @__PURE__ */ __name((...args) => this.#newResponse(...args), "newResponse");
  /**
   * `.body()` can return the HTTP response.
   * You can set headers with `.header()` and set HTTP status code with `.status`.
   * This can also be set in `.text()`, `.json()` and so on.
   *
   * @see {@link https://hono.dev/docs/api/context#body}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *   // Set HTTP status code
   *   c.status(201)
   *
   *   // Return the response body
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  body = /* @__PURE__ */ __name((data, arg, headers) => this.#newResponse(data, arg, headers), "body");
  /**
   * `.text()` can render text as `Content-Type:text/plain`.
   *
   * @see {@link https://hono.dev/docs/api/context#text}
   *
   * @example
   * ```ts
   * app.get('/say', (c) => {
   *   return c.text('Hello!')
   * })
   * ```
   */
  text = /* @__PURE__ */ __name((text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(
      text,
      arg,
      setDefaultContentType(TEXT_PLAIN, headers)
    );
  }, "text");
  /**
   * `.json()` can render JSON as `Content-Type:application/json`.
   *
   * @see {@link https://hono.dev/docs/api/context#json}
   *
   * @example
   * ```ts
   * app.get('/api', (c) => {
   *   return c.json({ message: 'Hello!' })
   * })
   * ```
   */
  json = /* @__PURE__ */ __name((object, arg, headers) => {
    return this.#newResponse(
      JSON.stringify(object),
      arg,
      setDefaultContentType("application/json", headers)
    );
  }, "json");
  html = /* @__PURE__ */ __name((html, arg, headers) => {
    const res = /* @__PURE__ */ __name((html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers)), "res");
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  }, "html");
  /**
   * `.redirect()` can Redirect, default status code is 302.
   *
   * @see {@link https://hono.dev/docs/api/context#redirect}
   *
   * @example
   * ```ts
   * app.get('/redirect', (c) => {
   *   return c.redirect('/')
   * })
   * app.get('/redirect-permanently', (c) => {
   *   return c.redirect('/', 301)
   * })
   * ```
   */
  redirect = /* @__PURE__ */ __name((location, status) => {
    const locationString = String(location);
    this.header(
      "Location",
      // Multibyes should be encoded
      // eslint-disable-next-line no-control-regex
      !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString)
    );
    return this.newResponse(null, status ?? 302);
  }, "redirect");
  /**
   * `.notFound()` can return the Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/context#notfound}
   *
   * @example
   * ```ts
   * app.get('/notfound', (c) => {
   *   return c.notFound()
   * })
   * ```
   */
  notFound = /* @__PURE__ */ __name(() => {
    this.#notFoundHandler ??= () => new Response();
    return this.#notFoundHandler(this);
  }, "notFound");
};

// node_modules/hono/dist/router.js
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
  static {
    __name(this, "UnsupportedPathError");
  }
};

// node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/hono/dist/hono-base.js
var notFoundHandler = /* @__PURE__ */ __name((c) => {
  return c.text("404 Not Found", 404);
}, "notFoundHandler");
var errorHandler = /* @__PURE__ */ __name((err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
}, "errorHandler");
var Hono = class _Hono {
  static {
    __name(this, "_Hono");
  }
  get;
  post;
  put;
  delete;
  options;
  patch;
  all;
  on;
  use;
  /*
    This class is like an abstract class and does not have a router.
    To use it, inherit the class and implement router in the constructor.
  */
  router;
  getPath;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(method, this.#path, args1);
        }
        args.forEach((handler) => {
          this.#addRoute(method, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          handlers.map((handler) => {
            this.#addRoute(m.toUpperCase(), this.#path, handler);
          });
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new _Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  errorHandler = errorHandler;
  /**
   * `.route()` allows grouping other Hono instance in routes.
   *
   * @see {@link https://hono.dev/docs/api/routing#grouping}
   *
   * @param {string} path - base Path
   * @param {Hono} app - other Hono instance
   * @returns {Hono} routed Hono instance
   *
   * @example
   * ```ts
   * const app = new Hono()
   * const app2 = new Hono()
   *
   * app2.get("/user", (c) => c.text("user"))
   * app.route("/api", app2) // GET /api/user
   * ```
   */
  route(path, app2) {
    const subApp = this.basePath(path);
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = /* @__PURE__ */ __name(async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res, "handler");
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler);
    });
    return this;
  }
  /**
   * `.basePath()` allows base paths to be specified.
   *
   * @see {@link https://hono.dev/docs/api/routing#base-path}
   *
   * @param {string} path - base Path
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * const api = new Hono().basePath('/api')
   * ```
   */
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  /**
   * `.onError()` handles an error and returns a customized Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#error-handling}
   *
   * @param {ErrorHandler} handler - request Handler for error
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.onError((err, c) => {
   *   console.error(`${err}`)
   *   return c.text('Custom Error Message', 500)
   * })
   * ```
   */
  onError = /* @__PURE__ */ __name((handler) => {
    this.errorHandler = handler;
    return this;
  }, "onError");
  /**
   * `.notFound()` allows you to customize a Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#not-found}
   *
   * @param {NotFoundHandler} handler - request handler for not-found
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.notFound((c) => {
   *   return c.text('Custom 404 Message', 404)
   * })
   * ```
   */
  notFound = /* @__PURE__ */ __name((handler) => {
    this.#notFoundHandler = handler;
    return this;
  }, "notFound");
  /**
   * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
   *
   * @see {@link https://hono.dev/docs/api/hono#mount}
   *
   * @param {string} path - base Path
   * @param {Function} applicationHandler - other Request Handler
   * @param {MountOptions} [options] - options of `.mount()`
   * @returns {Hono} mounted Hono instance
   *
   * @example
   * ```ts
   * import { Router as IttyRouter } from 'itty-router'
   * import { Hono } from 'hono'
   * // Create itty-router application
   * const ittyRouter = IttyRouter()
   * // GET /itty-router/hello
   * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
   *
   * const app = new Hono()
   * app.mount('/itty-router', ittyRouter.handle)
   * ```
   *
   * @example
   * ```ts
   * const app = new Hono()
   * // Send the request to another application without modification.
   * app.mount('/app', anotherApp, {
   *   replaceRequest: (req) => req,
   * })
   * ```
   */
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) {
          replaceRequest = /* @__PURE__ */ __name((request) => request, "replaceRequest");
        } else {
          replaceRequest = options.replaceRequest;
        }
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = url.pathname.slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = /* @__PURE__ */ __name(async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) {
        return res;
      }
      await next();
    }, "handler");
    this.#addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler) {
    method = method.toUpperCase();
    path = mergePath(this._basePath, path);
    const r = { basePath: this._basePath, path, method, handler };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  #dispatch(request, executionCtx, env2, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.#dispatch(request, executionCtx, env2, "GET")))();
    }
    const path = this.getPath(request, { env: env2 });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env: env2,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
      ).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context2 = await composed(c);
        if (!context2.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        }
        return context2.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  /**
   * `.fetch()` will be entry point of your app.
   *
   * @see {@link https://hono.dev/docs/api/hono#fetch}
   *
   * @param {Request} request - request Object of request
   * @param {Env} Env - env Object
   * @param {ExecutionContext} - context of execution
   * @returns {Response | Promise<Response>} response of request
   *
   */
  fetch = /* @__PURE__ */ __name((request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  }, "fetch");
  /**
   * `.request()` is a useful method for testing.
   * You can pass a URL or pathname to send a GET request.
   * app will return a Response object.
   * ```ts
   * test('GET /hello is ok', async () => {
   *   const res = await app.request('/hello')
   *   expect(res.status).toBe(200)
   * })
   * ```
   * @see https://hono.dev/docs/api/hono#request
   */
  request = /* @__PURE__ */ __name((input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    }
    input = input.toString();
    return this.fetch(
      new Request(
        /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`,
        requestInit
      ),
      Env,
      executionCtx
    );
  }, "request");
  /**
   * `.fire()` automatically adds a global fetch event listener.
   * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
   * @deprecated
   * Use `fire` from `hono/service-worker` instead.
   * ```ts
   * import { Hono } from 'hono'
   * import { fire } from 'hono/service-worker'
   *
   * const app = new Hono()
   * // ...
   * fire(app)
   * ```
   * @see https://hono.dev/docs/api/hono#fire
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
   * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
   */
  fire = /* @__PURE__ */ __name(() => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  }, "fire");
};

// node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match2 = /* @__PURE__ */ __name(((method2, path2) => {
    const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
    const staticMatch = matcher[2][path2];
    if (staticMatch) {
      return staticMatch;
    }
    const match3 = path2.match(matcher[0]);
    if (!match3) {
      return [[], emptyParam];
    }
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  }), "match2");
  this.match = match2;
  return match2(method, path);
}
__name(match, "match");

// node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = /* @__PURE__ */ Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
__name(compareKey, "compareKey");
var Node = class _Node {
  static {
    __name(this, "_Node");
  }
  #index;
  #varIndex;
  #children = /* @__PURE__ */ Object.create(null);
  insert(tokens, index, paramMap, context2, pathErrorCheckOnly) {
    if (tokens.length === 0) {
      if (this.#index !== void 0) {
        throw PATH_ERROR;
      }
      if (pathErrorCheckOnly) {
        return;
      }
      this.#index = index;
      return;
    }
    const [token, ...restTokens] = tokens;
    const pattern = token === "*" ? restTokens.length === 0 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let node;
    if (pattern) {
      const name = pattern[1];
      let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
      if (name && pattern[2]) {
        if (regexpStr === ".*") {
          throw PATH_ERROR;
        }
        regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
        if (/\((?!\?:)/.test(regexpStr)) {
          throw PATH_ERROR;
        }
      }
      node = this.#children[regexpStr];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[regexpStr] = new _Node();
        if (name !== "") {
          node.#varIndex = context2.varIndex++;
        }
      }
      if (!pathErrorCheckOnly && name !== "") {
        paramMap.push([name, node.#varIndex]);
      }
    } else {
      node = this.#children[token];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[token] = new _Node();
      }
    }
    node.insert(restTokens, index, paramMap, context2, pathErrorCheckOnly);
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.#children[k];
      return (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + c.buildRegExpStr();
    });
    if (typeof this.#index === "number") {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  static {
    __name(this, "Trie");
  }
  #context = { varIndex: 0 };
  #root = new Node();
  insert(path, index, pathErrorCheckOnly) {
    const paramAssoc = [];
    const groups = [];
    for (let i = 0; ; ) {
      let replaced = false;
      path = path.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = path.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.#root.insert(tokens, index, paramAssoc, this.#context, pathErrorCheckOnly);
    return paramAssoc;
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
};

// node_modules/hono/dist/router/reg-exp-router/router.js
var nullMatcher = [/^$/, [], /* @__PURE__ */ Object.create(null)];
var wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(
    path === "*" ? "" : `^${path.replace(
      /\/\*$|([.\\+*[^\]$()])/g,
      (_, metaChar) => metaChar ? `\\${metaChar}` : "(?:|/.*)"
    )}$`
  );
}
__name(buildWildcardRegExp, "buildWildcardRegExp");
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
__name(clearWildcardRegExpCache, "clearWildcardRegExpCache");
function buildMatcherFromPreprocessedRoutes(routes) {
  const trie = new Trie();
  const handlerData = [];
  if (routes.length === 0) {
    return nullMatcher;
  }
  const routesWithStaticPathFlag = routes.map(
    (route) => [!/\*|\/:/.test(route[0]), ...route]
  ).sort(
    ([isStaticA, pathA], [isStaticB, pathB]) => isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length
  );
  const staticMap = /* @__PURE__ */ Object.create(null);
  for (let i = 0, j = -1, len = routesWithStaticPathFlag.length; i < len; i++) {
    const [pathErrorCheckOnly, path, handlers] = routesWithStaticPathFlag[i];
    if (pathErrorCheckOnly) {
      staticMap[path] = [handlers.map(([h]) => [h, /* @__PURE__ */ Object.create(null)]), emptyParam];
    } else {
      j++;
    }
    let paramAssoc;
    try {
      paramAssoc = trie.insert(path, j, pathErrorCheckOnly);
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
    if (pathErrorCheckOnly) {
      continue;
    }
    handlerData[j] = handlers.map(([h, paramCount]) => {
      const paramIndexMap = /* @__PURE__ */ Object.create(null);
      paramCount -= 1;
      for (; paramCount >= 0; paramCount--) {
        const [key, value] = paramAssoc[paramCount];
        paramIndexMap[key] = value;
      }
      return [h, paramIndexMap];
    });
  }
  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
  for (let i = 0, len = handlerData.length; i < len; i++) {
    for (let j = 0, len2 = handlerData[i].length; j < len2; j++) {
      const map = handlerData[i][j]?.[1];
      if (!map) {
        continue;
      }
      const keys = Object.keys(map);
      for (let k = 0, len3 = keys.length; k < len3; k++) {
        map[keys[k]] = paramReplacementMap[map[keys[k]]];
      }
    }
  }
  const handlerMap = [];
  for (const i in indexReplacementMap) {
    handlerMap[i] = handlerData[indexReplacementMap[i]];
  }
  return [regexp, handlerMap, staticMap];
}
__name(buildMatcherFromPreprocessedRoutes, "buildMatcherFromPreprocessedRoutes");
function findMiddleware(middleware, path) {
  if (!middleware) {
    return void 0;
  }
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
__name(findMiddleware, "findMiddleware");
var RegExpRouter = class {
  static {
    __name(this, "RegExpRouter");
  }
  name = "RegExpRouter";
  #middleware;
  #routes;
  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    this.#routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
  }
  add(method, path, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware || !routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      ;
      [middleware, routes].forEach((handlerMap) => {
        handlerMap[method] = /* @__PURE__ */ Object.create(null);
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
        });
      });
    }
    if (path === "/*") {
      path = "*";
    }
    const paramCount = (path.match(/\/:/g) || []).length;
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      if (method === METHOD_NAME_ALL) {
        Object.keys(middleware).forEach((m) => {
          middleware[m][path] ||= findMiddleware(middleware[m], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
        });
      } else {
        middleware[method][path] ||= findMiddleware(middleware[method], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
      }
      Object.keys(middleware).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(middleware[m]).forEach((p) => {
            re.test(p) && middleware[m][p].push([handler, paramCount]);
          });
        }
      });
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(routes[m]).forEach(
            (p) => re.test(p) && routes[m][p].push([handler, paramCount])
          );
        }
      });
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (let i = 0, len = paths.length; i < len; i++) {
      const path2 = paths[i];
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          routes[m][path2] ||= [
            ...findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || []
          ];
          routes[m][path2].push([handler, paramCount - len + i + 1]);
        }
      });
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = /* @__PURE__ */ Object.create(null);
    Object.keys(this.#routes).concat(Object.keys(this.#middleware)).forEach((method) => {
      matchers[method] ||= this.#buildMatcher(method);
    });
    this.#middleware = this.#routes = void 0;
    clearWildcardRegExpCache();
    return matchers;
  }
  #buildMatcher(method) {
    const routes = [];
    let hasOwnRoute = method === METHOD_NAME_ALL;
    [this.#middleware, this.#routes].forEach((r) => {
      const ownRoute = r[method] ? Object.keys(r[method]).map((path) => [path, r[method][path]]) : [];
      if (ownRoute.length !== 0) {
        hasOwnRoute ||= true;
        routes.push(...ownRoute);
      } else if (method !== METHOD_NAME_ALL) {
        routes.push(
          ...Object.keys(r[METHOD_NAME_ALL]).map((path) => [path, r[METHOD_NAME_ALL][path]])
        );
      }
    });
    if (!hasOwnRoute) {
      return null;
    } else {
      return buildMatcherFromPreprocessedRoutes(routes);
    }
  }
};

// node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  static {
    __name(this, "SmartRouter");
  }
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path, handler]);
  }
  match(method, path) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) {
          router.add(...routes[i2]);
        }
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
};

// node_modules/hono/dist/router/trie-router/node.js
var emptyParams = /* @__PURE__ */ Object.create(null);
var Node2 = class _Node2 {
  static {
    __name(this, "_Node");
  }
  #methods;
  #children;
  #patterns;
  #order = 0;
  #params = emptyParams;
  constructor(method, handler, children) {
    this.#children = children || /* @__PURE__ */ Object.create(null);
    this.#methods = [];
    if (method && handler) {
      const m = /* @__PURE__ */ Object.create(null);
      m[method] = { handler, possibleKeys: [], score: 0 };
      this.#methods = [m];
    }
    this.#patterns = [];
  }
  insert(method, path, handler) {
    this.#order = ++this.#order;
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const p = parts[i];
      const nextP = parts[i + 1];
      const pattern = getPattern(p, nextP);
      const key = Array.isArray(pattern) ? pattern[0] : p;
      if (key in curNode.#children) {
        curNode = curNode.#children[key];
        if (pattern) {
          possibleKeys.push(pattern[1]);
        }
        continue;
      }
      curNode.#children[key] = new _Node2();
      if (pattern) {
        curNode.#patterns.push(pattern);
        possibleKeys.push(pattern[1]);
      }
      curNode = curNode.#children[key];
    }
    curNode.#methods.push({
      [method]: {
        handler,
        possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
        score: this.#order
      }
    });
    return curNode;
  }
  #getHandlerSets(node, method, nodeParams, params) {
    const handlerSets = [];
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      const processedSet = {};
      if (handlerSet !== void 0) {
        handlerSet.params = /* @__PURE__ */ Object.create(null);
        handlerSets.push(handlerSet);
        if (nodeParams !== emptyParams || params && params !== emptyParams) {
          for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
            const key = handlerSet.possibleKeys[i2];
            const processed = processedSet[handlerSet.score];
            handlerSet.params[key] = params?.[key] && !processed ? params[key] : nodeParams[key] ?? params?.[key];
            processedSet[handlerSet.score] = true;
          }
        }
      }
    }
    return handlerSets;
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path);
    const curNodesQueue = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              handlerSets.push(
                ...this.#getHandlerSets(nextNode.#children["*"], method, node.#params)
              );
            }
            handlerSets.push(...this.#getHandlerSets(nextNode, method, node.#params));
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (let k = 0, len3 = node.#patterns.length; k < len3; k++) {
          const pattern = node.#patterns[k];
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (pattern === "*") {
            const astNode = node.#children["*"];
            if (astNode) {
              handlerSets.push(...this.#getHandlerSets(astNode, method, node.#params));
              astNode.#params = params;
              tempNodes.push(astNode);
            }
            continue;
          }
          const [key, name, matcher] = pattern;
          if (!part && !(matcher instanceof RegExp)) {
            continue;
          }
          const child = node.#children[key];
          const restPathString = parts.slice(i).join("/");
          if (matcher instanceof RegExp) {
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              handlerSets.push(...this.#getHandlerSets(child, method, node.#params, params));
              if (Object.keys(child.#children).length) {
                child.#params = params;
                const componentCount = m[0].match(/\//)?.length ?? 0;
                const targetCurNodes = curNodesQueue[componentCount] ||= [];
                targetCurNodes.push(child);
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              handlerSets.push(...this.#getHandlerSets(child, method, params, node.#params));
              if (child.#children["*"]) {
                handlerSets.push(
                  ...this.#getHandlerSets(child.#children["*"], method, params, node.#params)
                );
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      curNodes = tempNodes.concat(curNodesQueue.shift() ?? []);
    }
    if (handlerSets.length > 1) {
      handlerSets.sort((a, b) => {
        return a.score - b.score;
      });
    }
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  static {
    __name(this, "TrieRouter");
  }
  name = "TrieRouter";
  #node;
  constructor() {
    this.#node = new Node2();
  }
  add(method, path, handler) {
    const results = checkOptionalParameter(path);
    if (results) {
      for (let i = 0, len = results.length; i < len; i++) {
        this.#node.insert(method, results[i], handler);
      }
      return;
    }
    this.#node.insert(method, path, handler);
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// node_modules/hono/dist/hono.js
var Hono2 = class extends Hono {
  static {
    __name(this, "Hono");
  }
  /**
   * Creates an instance of the Hono class.
   *
   * @param options - Optional configuration options for the Hono instance.
   */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
};

// node_modules/hono/dist/middleware/cors/index.js
var cors = /* @__PURE__ */ __name((options) => {
  const defaults = {
    origin: "*",
    allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"],
    allowHeaders: [],
    exposeHeaders: []
  };
  const opts = {
    ...defaults,
    ...options
  };
  const findAllowOrigin = ((optsOrigin) => {
    if (typeof optsOrigin === "string") {
      if (optsOrigin === "*") {
        return () => optsOrigin;
      } else {
        return (origin) => optsOrigin === origin ? origin : null;
      }
    } else if (typeof optsOrigin === "function") {
      return optsOrigin;
    } else {
      return (origin) => optsOrigin.includes(origin) ? origin : null;
    }
  })(opts.origin);
  const findAllowMethods = ((optsAllowMethods) => {
    if (typeof optsAllowMethods === "function") {
      return optsAllowMethods;
    } else if (Array.isArray(optsAllowMethods)) {
      return () => optsAllowMethods;
    } else {
      return () => [];
    }
  })(opts.allowMethods);
  return /* @__PURE__ */ __name(async function cors2(c, next) {
    function set(key, value) {
      c.res.headers.set(key, value);
    }
    __name(set, "set");
    const allowOrigin = await findAllowOrigin(c.req.header("origin") || "", c);
    if (allowOrigin) {
      set("Access-Control-Allow-Origin", allowOrigin);
    }
    if (opts.credentials) {
      set("Access-Control-Allow-Credentials", "true");
    }
    if (opts.exposeHeaders?.length) {
      set("Access-Control-Expose-Headers", opts.exposeHeaders.join(","));
    }
    if (c.req.method === "OPTIONS") {
      if (opts.origin !== "*") {
        set("Vary", "Origin");
      }
      if (opts.maxAge != null) {
        set("Access-Control-Max-Age", opts.maxAge.toString());
      }
      const allowMethods = await findAllowMethods(c.req.header("origin") || "", c);
      if (allowMethods.length) {
        set("Access-Control-Allow-Methods", allowMethods.join(","));
      }
      let headers = opts.allowHeaders;
      if (!headers?.length) {
        const requestHeaders = c.req.header("Access-Control-Request-Headers");
        if (requestHeaders) {
          headers = requestHeaders.split(/\s*,\s*/);
        }
      }
      if (headers?.length) {
        set("Access-Control-Allow-Headers", headers.join(","));
        c.res.headers.append("Vary", "Access-Control-Request-Headers");
      }
      c.res.headers.delete("Content-Length");
      c.res.headers.delete("Content-Type");
      return new Response(null, {
        headers: c.res.headers,
        status: 204,
        statusText: "No Content"
      });
    }
    await next();
    if (opts.origin !== "*") {
      c.header("Vary", "Origin", { append: true });
    }
  }, "cors2");
}, "cors");

// src/index.ts
import { randomUUID } from "crypto";
var ACHIEVEMENTS = {
  "first_harvest": { name: "First Harvest", description: "Complete your first harvest", xp: 100, icon: "\u{1F33E}" },
  "perfect_day": { name: "Perfect Day", description: "100% quota usage in one day", xp: 500, icon: "\u{1F525}" },
  "time_saver": { name: "Time Hacker", description: "Save 10 hours total", xp: 1e3, icon: "\u23F1\uFE0F" },
  "streak_7": { name: "Week Warrior", description: "7-day harvest streak", xp: 2e3, icon: "\u{1F3C6}" },
  "hundred_tasks": { name: "Century Club", description: "Complete 100 tasks", xp: 1500, icon: "\u{1F4AF}" }
};
var app = new Hono2();
app.use("*", cors({
  origin: ["http://localhost:3000", "https://makerlog.ai", "https://www.makerlog.ai", "https://makerlog-dashboard.pages.dev"],
  credentials: true
}));
app.get("/", (c) => c.json({ status: "ok", service: "makerlog-api", version: "1.0.0" }));
app.get("/api/quota", async (c) => {
  const userId = c.req.header("X-User-Id") || "demo-user";
  await ensureUser(c.env, userId);
  const cached = await c.env.KV.get(`quota:${userId}`, { type: "json" });
  if (cached) {
    return c.json(cached);
  }
  const quota = {
    images: { used: 0, limit: 1e3, remaining: 1e3 },
    tokens: { used: 0, limit: 1e5, remaining: 1e5 },
    resetAt: getNextMidnightUTC()
  };
  const todayStart = Math.floor((/* @__PURE__ */ new Date()).setUTCHours(0, 0, 0, 0) / 1e3);
  const tasks = await c.env.DB.prepare(`
    SELECT type, COUNT(*) as count FROM tasks 
    WHERE user_id = ? AND status = 'completed' AND completed_at >= ?
    GROUP BY type
  `).bind(userId, todayStart).all();
  for (const row of tasks.results || []) {
    const r = row;
    if (r.type === "image-gen") {
      quota.images.used = r.count;
      quota.images.remaining = Math.max(0, quota.images.limit - r.count);
    } else if (r.type === "text-gen" || r.type === "code-summary") {
      quota.tokens.used += r.count * 1e3;
      quota.tokens.remaining = Math.max(0, quota.tokens.limit - quota.tokens.used);
    }
  }
  await c.env.KV.put(`quota:${userId}`, JSON.stringify(quota), { expirationTtl: 60 });
  return c.json(quota);
});
app.get("/api/tasks", async (c) => {
  const userId = c.req.header("X-User-Id") || "demo-user";
  const status = c.req.query("status");
  await ensureUser(c.env, userId);
  let query = "SELECT * FROM tasks WHERE user_id = ?";
  const params = [userId];
  if (status) {
    query += " AND status = ?";
    params.push(status);
  }
  query += " ORDER BY created_at DESC LIMIT 50";
  const result = await c.env.DB.prepare(query).bind(...params).all();
  return c.json({ tasks: result.results || [] });
});
app.post("/api/tasks", async (c) => {
  const userId = c.req.header("X-User-Id") || "demo-user";
  const body = await c.req.json();
  await ensureUser(c.env, userId);
  const task = {
    id: crypto.randomUUID(),
    user_id: userId,
    type: body.type,
    status: "queued",
    prompt: body.prompt,
    priority: body.priority || 1,
    cost_estimate: body.type === "image-gen" ? 1e-3 : 1e-4,
    created_at: Math.floor(Date.now() / 1e3)
  };
  try {
    await c.env.DB.prepare(`
      INSERT INTO tasks (id, user_id, type, status, prompt, priority, cost_estimate, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      task.id,
      task.user_id,
      task.type,
      task.status,
      task.prompt,
      task.priority,
      task.cost_estimate,
      task.created_at
    ).run();
    return c.json({ task }, 201);
  } catch (error3) {
    if (error3.message && error3.message.includes("FOREIGN KEY")) {
      return c.json({
        error: "User not found",
        message: "The specified user does not exist. Please create a user first.",
        userId
      }, 400);
    }
    throw error3;
  }
});
app.post("/api/tasks/:id/execute", async (c) => {
  const taskId = c.req.param("id");
  const userId = c.req.header("X-User-Id") || "demo-user";
  const task = await c.env.DB.prepare(
    "SELECT * FROM tasks WHERE id = ? AND user_id = ?"
  ).bind(taskId, userId).first();
  if (!task) {
    return c.json({ error: "Task not found" }, 404);
  }
  await c.env.DB.prepare(
    "UPDATE tasks SET status = ? WHERE id = ?"
  ).bind("running", taskId).run();
  try {
    let resultUrl;
    if (task.type === "image-gen") {
      const response = await c.env.AI.run("@cf/stabilityai/stable-diffusion-xl-base-1.0", {
        prompt: task.prompt
      });
      const key = `images/${userId}/${taskId}.png`;
      await c.env.R2.put(key, response, {
        httpMetadata: { contentType: "image/png" }
      });
      resultUrl = `/assets/${key}`;
    } else if (task.type === "text-gen") {
      const response = await c.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        prompt: task.prompt,
        max_tokens: 1e3
      });
      const key = `text/${userId}/${taskId}.txt`;
      await c.env.R2.put(key, response.response, {
        httpMetadata: { contentType: "text/plain" }
      });
      resultUrl = `/assets/${key}`;
    }
    await c.env.DB.prepare(`
      UPDATE tasks SET status = 'completed', result_url = ?, completed_at = ?
      WHERE id = ?
    `).bind(resultUrl, Math.floor(Date.now() / 1e3), taskId).run();
    await awardXP(c.env, userId, 50);
    await c.env.KV.delete(`quota:${userId}`);
    return c.json({ success: true, resultUrl });
  } catch (error3) {
    await c.env.DB.prepare(
      "UPDATE tasks SET status = ? WHERE id = ?"
    ).bind("failed", taskId).run();
    return c.json({ error: "Task execution failed" }, 500);
  }
});
app.post("/api/harvest", async (c) => {
  const userId = c.req.header("X-User-Id") || "demo-user";
  await ensureUser(c.env, userId);
  const queuedTasks = await c.env.DB.prepare(
    "SELECT * FROM tasks WHERE user_id = ? AND status = ? ORDER BY priority DESC, created_at ASC"
  ).bind(userId, "queued").all();
  const quotaRes = await fetch(`${c.req.url.replace("/harvest", "/quota")}`, {
    headers: { "X-User-Id": userId }
  });
  const quota = await quotaRes.json();
  const results = [];
  let tasksExecuted = 0;
  for (const row of queuedTasks.results || []) {
    const task = row;
    if (task.type === "image-gen" && quota.images.remaining <= 0) continue;
    if ((task.type === "text-gen" || task.type === "code-summary") && quota.tokens.remaining <= 0) continue;
    const execRes = await fetch(`${c.req.url.replace("/harvest", `/tasks/${task.id}/execute`)}`, {
      method: "POST",
      headers: { "X-User-Id": userId }
    });
    results.push({
      taskId: task.id,
      success: execRes.ok
    });
    tasksExecuted++;
    if (task.type === "image-gen") quota.images.remaining--;
    else quota.tokens.remaining -= 1e3;
  }
  await checkAchievements(c.env, userId, "harvest", { tasksExecuted });
  await updateStreak(c.env, userId);
  return c.json({
    harvestComplete: true,
    tasksExecuted,
    results,
    quotaRemaining: {
      images: quota.images.remaining,
      tokens: quota.tokens.remaining
    }
  });
});
app.get("/api/achievements", async (c) => {
  const userId = c.req.header("X-User-Id") || "demo-user";
  await ensureUser(c.env, userId);
  const unlocked = await c.env.DB.prepare(
    "SELECT * FROM achievements WHERE user_id = ? ORDER BY unlocked_at DESC"
  ).bind(userId).all();
  const user = await c.env.DB.prepare(
    "SELECT xp, level, streak_days FROM users WHERE id = ?"
  ).bind(userId).first();
  return c.json({
    user: user || { xp: 0, level: 1, streak_days: 0 },
    unlocked: unlocked.results || [],
    available: ACHIEVEMENTS
  });
});
app.post("/api/users", async (c) => {
  const body = await c.req.json();
  const userId = crypto.randomUUID();
  await c.env.DB.prepare(`
    INSERT INTO users (id, email, cloudflare_account_id, xp, level, streak_days)
    VALUES (?, ?, ?, 0, 1, 0)
  `).bind(userId, body.email, body.cloudflare_account_id || null).run();
  return c.json({ id: userId, email: body.email }, 201);
});
app.get("/api/users/me", async (c) => {
  const userId = c.req.header("X-User-Id") || "demo-user";
  const user = await c.env.DB.prepare(
    "SELECT * FROM users WHERE id = ?"
  ).bind(userId).first();
  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }
  return c.json(user);
});
app.get("/assets/*", async (c) => {
  const key = c.req.path.replace("/assets/", "");
  const object = await c.env.R2.get(key);
  if (!object) {
    return c.json({ error: "Asset not found" }, 404);
  }
  const headers = new Headers();
  headers.set("Content-Type", object.httpMetadata?.contentType || "application/octet-stream");
  headers.set("Cache-Control", "public, max-age=86400");
  return new Response(object.body, { headers });
});
function getNextMidnightUTC() {
  const now = /* @__PURE__ */ new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}
__name(getNextMidnightUTC, "getNextMidnightUTC");
async function ensureUser(env2, userId) {
  const user = await env2.DB.prepare("SELECT id FROM users WHERE id = ?").bind(userId).first();
  if (!user) {
    const now = Math.floor(Date.now() / 1e3);
    await env2.DB.prepare(`
      INSERT INTO users (id, email, xp, level, streak_days, created_at, updated_at)
      VALUES (?, ?, 0, 1, 0, ?, ?)
    `).bind(
      userId,
      userId === "demo-user" ? "demo@example.com" : `${userId}@makerlog.ai`,
      now,
      now
    ).run();
    console.log(`Auto-created user: ${userId}`);
  }
  return userId;
}
__name(ensureUser, "ensureUser");
async function awardXP(env2, userId, xp) {
  await ensureUser(env2, userId);
  await env2.DB.prepare(`
    UPDATE users SET xp = xp + ? WHERE id = ?
  `).bind(xp, userId).run();
  const user = await env2.DB.prepare("SELECT xp FROM users WHERE id = ?").bind(userId).first();
  if (user) {
    const newLevel = Math.floor(Math.sqrt(user.xp / 100)) + 1;
    await env2.DB.prepare("UPDATE users SET level = ? WHERE id = ?").bind(newLevel, userId).run();
  }
}
__name(awardXP, "awardXP");
async function updateStreak(env2, userId) {
  await ensureUser(env2, userId);
  const user = await env2.DB.prepare(
    "SELECT last_harvest_at, streak_days FROM users WHERE id = ?"
  ).bind(userId).first();
  if (!user) return;
  const now = Math.floor(Date.now() / 1e3);
  const lastHarvest = user.last_harvest_at || 0;
  const daysSinceLast = Math.floor((now - lastHarvest) / 86400);
  let newStreak = user.streak_days;
  if (daysSinceLast === 0) {
  } else if (daysSinceLast === 1) {
    newStreak++;
  } else {
    newStreak = 1;
  }
  await env2.DB.prepare(`
    UPDATE users SET streak_days = ?, last_harvest_at = ? WHERE id = ?
  `).bind(newStreak, now, userId).run();
}
__name(updateStreak, "updateStreak");
async function checkAchievements(env2, userId, trigger, data) {
  if (trigger === "harvest" && data.tasksExecuted > 0) {
    const existing = await env2.DB.prepare(
      "SELECT id FROM achievements WHERE user_id = ? AND achievement_type = ?"
    ).bind(userId, "first_harvest").first();
    if (!existing) {
      await unlockAchievement(env2, userId, "first_harvest");
    }
  }
  const taskCount = await env2.DB.prepare(
    "SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND status = ?"
  ).bind(userId, "completed").first();
  if (taskCount && taskCount.count >= 100) {
    const existing = await env2.DB.prepare(
      "SELECT id FROM achievements WHERE user_id = ? AND achievement_type = ?"
    ).bind(userId, "hundred_tasks").first();
    if (!existing) {
      await unlockAchievement(env2, userId, "hundred_tasks");
    }
  }
  const user = await env2.DB.prepare(
    "SELECT streak_days FROM users WHERE id = ?"
  ).bind(userId).first();
  if (user && user.streak_days >= 7) {
    const existing = await env2.DB.prepare(
      "SELECT id FROM achievements WHERE user_id = ? AND achievement_type = ?"
    ).bind(userId, "streak_7").first();
    if (!existing) {
      await unlockAchievement(env2, userId, "streak_7");
    }
  }
}
__name(checkAchievements, "checkAchievements");
async function unlockAchievement(env2, userId, achievementType) {
  const achievement = ACHIEVEMENTS[achievementType];
  if (!achievement) return;
  await env2.DB.prepare(`
    INSERT INTO achievements (id, user_id, achievement_type, xp_awarded)
    VALUES (?, ?, ?, ?)
  `).bind(crypto.randomUUID(), userId, achievementType, achievement.xp).run();
  await awardXP(env2, userId, achievement.xp);
}
__name(unlockAchievement, "unlockAchievement");
app.post("/api/voice/upload-chunk", async (c) => {
  const userId = c.req.header("X-User-Id") || "demo-user";
  const formData = await c.req.formData();
  const audioChunk = formData.get("audio");
  const recordingId = formData.get("recording_id");
  const chunkIndex = parseInt(formData.get("chunk_index") || "0");
  const isFinal = formData.get("is_final") === "true";
  if (!audioChunk) {
    return c.json({ error: "No audio chunk provided" }, 400);
  }
  if (!recordingId) {
    return c.json({ error: "recording_id is required" }, 400);
  }
  try {
    const chunkKey = `voice-chunks/${userId}/${recordingId}/chunk-${chunkIndex}.webm`;
    await c.env.R2.put(chunkKey, await audioChunk.arrayBuffer(), {
      httpMetadata: { contentType: "audio/webm" }
    });
    const chunkData = {
      userId,
      recordingId,
      chunkIndex,
      chunkKey,
      uploadedAt: Date.now(),
      isFinal
    };
    await c.env.KV.put(
      `chunk:${recordingId}:${chunkIndex}`,
      JSON.stringify(chunkData),
      { expirationTtl: 1800 }
    );
    return c.json({
      success: true,
      chunkIndex,
      chunkKey
    });
  } catch (error3) {
    console.error("Chunk upload failed:", error3);
    return c.json({ error: "Failed to upload chunk" }, 500);
  }
});
app.post("/api/voice/finalize-recording", async (c) => {
  const userId = c.req.header("X-User-Id") || "demo-user";
  const body = await c.req.json();
  await ensureUser(c.env, userId);
  if (!body.recording_id) {
    return c.json({ error: "recording_id is required" }, 400);
  }
  try {
    const chunkKeys = [];
    let chunkIndex = 0;
    while (true) {
      const chunkData = await c.env.KV.get(
        `chunk:${body.recording_id}:${chunkIndex}`,
        { type: "json" }
      );
      if (!chunkData) break;
      chunkKeys.push(chunkData.chunkKey);
      chunkIndex++;
    }
    if (chunkKeys.length === 0) {
      return c.json({ error: "No chunks found for recording" }, 404);
    }
    const chunks = [];
    for (const key of chunkKeys) {
      const chunk = await c.env.R2.get(key);
      if (chunk) {
        chunks.push(await chunk.arrayBuffer());
      }
    }
    const totalLength = chunks.reduce((sum, buf) => sum + buf.byteLength, 0);
    const combinedBuffer = new Uint8Array(totalLength);
    let offset = 0;
    for (const buf of chunks) {
      combinedBuffer.set(new Uint8Array(buf), offset);
      offset += buf.byteLength;
    }
    for (const key of chunkKeys) {
      await c.env.R2.delete(key);
    }
    for (let i = 0; i < chunkKeys.length; i++) {
      await c.env.KV.delete(`chunk:${body.recording_id}:${i}`);
    }
    const transcription = await c.env.AI.run("@cf/openai/whisper", {
      audio: [...combinedBuffer]
    });
    const transcript = transcription.text.trim();
    if (!transcript) {
      return c.json({ error: "Could not transcribe audio" }, 400);
    }
    let conversationId = body.conversation_id;
    if (!conversationId) {
      conversationId = crypto.randomUUID();
      const now = Math.floor(Date.now() / 1e3);
      await c.env.DB.prepare(`
        INSERT INTO conversations (id, user_id, title, created_at, updated_at, message_count)
        VALUES (?, ?, ?, ?, ?, 0)
      `).bind(
        conversationId,
        userId,
        `Conversation ${(/* @__PURE__ */ new Date()).toLocaleDateString()}`,
        now,
        now
      ).run();
    }
    const audioKey = `voice/${userId}/${conversationId}/${Date.now()}.webm`;
    await c.env.R2.put(audioKey, combinedBuffer.buffer, {
      httpMetadata: { contentType: "audio/webm" }
    });
    const messageId = crypto.randomUUID();
    const timestamp = Math.floor(Date.now() / 1e3);
    await c.env.DB.prepare(`
      INSERT INTO messages (id, conversation_id, role, content, audio_url, timestamp)
      VALUES (?, ?, 'user', ?, ?, ?)
    `).bind(messageId, conversationId, transcript, `/assets/${audioKey}`, timestamp).run();
    try {
      const embedding = await c.env.AI.run("@cf/baai/bge-base-en-v1.5", {
        text: transcript
      });
      if (c.env.VECTORIZE) {
        await c.env.VECTORIZE.upsert([{
          id: messageId,
          values: embedding.data[0],
          metadata: {
            user_id: userId,
            conversation_id: conversationId,
            content: transcript.substring(0, 500),
            timestamp
          }
        }]);
      }
    } catch (e) {
      console.error("Vectorize error:", e);
    }
    await c.env.DB.prepare(`
      UPDATE conversations SET updated_at = ?, message_count = message_count + 1
      WHERE id = ?
    `).bind(timestamp, conversationId).run();
    const recentMessages = await c.env.DB.prepare(`
      SELECT role, content FROM messages
      WHERE conversation_id = ?
      ORDER BY timestamp DESC
      LIMIT 5
    `).bind(conversationId).all();
    const context2 = (recentMessages.results || []).reverse().map((m) => `${m.role}: ${m.content}`).join("\n");
    const systemPrompt = `You are Makerlog, a friendly AI assistant that helps makers think through their ideas.

Your role is to:
- Listen actively and ask clarifying questions
- Help users articulate their ideas more clearly
- Identify potential generative tasks (images, code, text) that could help
- Keep responses concise and conversational (this is voice chat)

Recent conversation:
${context2}

Respond naturally to the user's latest message. If you notice something that could be generated (icon, code snippet, copy, etc.), mention it briefly.`;
    const aiResponse = await c.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: transcript }
      ],
      max_tokens: 300
    });
    const response = aiResponse.response;
    const assistantMessageId = crypto.randomUUID();
    await c.env.DB.prepare(`
      INSERT INTO messages (id, conversation_id, role, content, timestamp)
      VALUES (?, ?, 'assistant', ?, ?)
    `).bind(
      assistantMessageId,
      conversationId,
      response,
      Math.floor(Date.now() / 1e3)
    ).run();
    c.executionCtx.waitUntil(
      analyzeForOpportunities(c.env, conversationId, messageId, transcript)
    );
    return c.json({
      transcript,
      response,
      conversationId,
      messageId,
      audioUrl: `/assets/${audioKey}`
    });
  } catch (error3) {
    console.error("Finalize recording failed:", error3);
    return c.json({ error: "Failed to finalize recording" }, 500);
  }
});
app.post("/api/voice/transcribe-stream", async (c) => {
  const userId = c.req.header("X-User-Id") || "demo-user";
  await ensureUser(c.env, userId);
  const formData = await c.req.formData();
  const audioFile = formData.get("audio");
  let conversationId = formData.get("conversation_id");
  if (!audioFile) {
    return c.json({ error: "No audio file provided" }, 400);
  }
  c.header("Content-Type", "text/event-stream");
  c.header("Cache-Control", "no-cache");
  c.header("Connection", "keep-alive");
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const sendEvent = /* @__PURE__ */ __name((event, data) => {
        const message = `event: ${event}
data: ${JSON.stringify(data)}

`;
        controller.enqueue(encoder.encode(message));
      }, "sendEvent");
      try {
        sendEvent("start", { status: "processing" });
        const audioBuffer = await audioFile.arrayBuffer();
        sendEvent("status", { step: "transcribing", message: "Transcribing audio..." });
        const transcription = await c.env.AI.run("@cf/openai/whisper", {
          audio: [...new Uint8Array(audioBuffer)]
        });
        const transcript = transcription.text.trim();
        if (!transcript) {
          sendEvent("error", { error: "Could not transcribe audio" });
          controller.close();
          return;
        }
        sendEvent("transcript", { transcript });
        if (!conversationId) {
          conversationId = crypto.randomUUID();
          const now = Math.floor(Date.now() / 1e3);
          await c.env.DB.prepare(`
            INSERT INTO conversations (id, user_id, title, created_at, updated_at, message_count)
            VALUES (?, ?, ?, ?, ?, 0)
          `).bind(conversationId, userId, `Conversation ${(/* @__PURE__ */ new Date()).toLocaleDateString()}`, now, now).run();
        }
        const audioKey = `voice/${userId}/${conversationId}/${Date.now()}.webm`;
        await c.env.R2.put(audioKey, audioBuffer, {
          httpMetadata: { contentType: audioFile.type || "audio/webm" }
        });
        const messageId = crypto.randomUUID();
        const timestamp = Math.floor(Date.now() / 1e3);
        await c.env.DB.prepare(`
          INSERT INTO messages (id, conversation_id, role, content, audio_url, timestamp)
          VALUES (?, ?, 'user', ?, ?, ?)
        `).bind(messageId, conversationId, transcript, `/assets/${audioKey}`, timestamp).run();
        try {
          const embedding = await c.env.AI.run("@cf/baai/bge-base-en-v1.5", {
            text: transcript
          });
          if (c.env.VECTORIZE) {
            await c.env.VECTORIZE.upsert([{
              id: messageId,
              values: embedding.data[0],
              metadata: {
                user_id: userId,
                conversation_id: conversationId,
                content: transcript.substring(0, 500),
                timestamp
              }
            }]);
          }
        } catch (e) {
          console.error("Vectorize error:", e);
        }
        await c.env.DB.prepare(`
          UPDATE conversations SET updated_at = ?, message_count = message_count + 1
          WHERE id = ?
        `).bind(timestamp, conversationId).run();
        const recentMessages = await c.env.DB.prepare(`
          SELECT role, content FROM messages
          WHERE conversation_id = ?
          ORDER BY timestamp DESC
          LIMIT 5
        `).bind(conversationId).all();
        const context2 = (recentMessages.results || []).reverse().map((m) => `${m.role}: ${m.content}`).join("\n");
        sendEvent("status", { step: "generating", message: "AI is thinking..." });
        const systemPrompt = `You are Makerlog, a friendly AI assistant that helps makers think through their ideas.

Your role is to:
- Listen actively and ask clarifying questions
- Help users articulate their ideas more clearly
- Identify potential generative tasks (images, code, text) that could help
- Keep responses concise and conversational (this is voice chat)

Recent conversation:
${context2}

Respond naturally to the user's latest message. If you notice something that could be generated (icon, code snippet, copy, etc.), mention it briefly.`;
        const aiResponse = await c.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: transcript }
          ],
          max_tokens: 300,
          stream: true
        });
        const reader = aiResponse.body?.getReader();
        if (reader) {
          const decoder = new TextDecoder();
          let fullResponse = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n").filter((line) => line.trim() !== "");
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") continue;
                try {
                  const parsed = JSON.parse(data);
                  const token = parsed.choices?.[0]?.delta?.content || "";
                  if (token) {
                    fullResponse += token;
                    sendEvent("token", { token, fullResponse });
                  }
                } catch (e) {
                }
              }
            }
          }
          const assistantMessageId = crypto.randomUUID();
          await c.env.DB.prepare(`
            INSERT INTO messages (id, conversation_id, role, content, timestamp)
            VALUES (?, ?, 'assistant', ?, ?)
          `).bind(assistantMessageId, conversationId, fullResponse, Math.floor(Date.now() / 1e3)).run();
          sendEvent("complete", {
            response: fullResponse,
            conversationId,
            messageId: assistantMessageId,
            audioUrl: `/assets/${audioKey}`
          });
          c.executionCtx.waitUntil(
            analyzeForOpportunities(c.env, conversationId, messageId, transcript)
          );
        } else {
          const aiResponse2 = await c.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: transcript }
            ],
            max_tokens: 300
          });
          const response = aiResponse2.response;
          const assistantMessageId = crypto.randomUUID();
          await c.env.DB.prepare(`
            INSERT INTO messages (id, conversation_id, role, content, timestamp)
            VALUES (?, ?, 'assistant', ?, ?)
          `).bind(assistantMessageId, conversationId, response, Math.floor(Date.now() / 1e3)).run();
          sendEvent("complete", {
            response,
            conversationId,
            messageId: assistantMessageId,
            audioUrl: `/assets/${audioKey}`
          });
          c.executionCtx.waitUntil(
            analyzeForOpportunities(c.env, conversationId, messageId, transcript)
          );
        }
        controller.close();
      } catch (error3) {
        console.error("Streaming transcribe failed:", error3);
        sendEvent("error", { error: "Failed to process voice input" });
        controller.close();
      }
    }
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    }
  });
});
app.post("/api/voice/transcribe", async (c) => {
  const userId = c.req.header("X-User-Id") || "demo-user";
  await ensureUser(c.env, userId);
  const formData = await c.req.formData();
  const audioFile = formData.get("audio");
  let conversationId = formData.get("conversation_id");
  if (!audioFile) {
    return c.json({ error: "No audio file provided" }, 400);
  }
  const audioBuffer = await audioFile.arrayBuffer();
  const transcription = await c.env.AI.run("@cf/openai/whisper", {
    audio: [...new Uint8Array(audioBuffer)]
  });
  const transcript = transcription.text.trim();
  if (!transcript) {
    return c.json({ error: "Could not transcribe audio" }, 400);
  }
  if (!conversationId) {
    conversationId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1e3);
    await c.env.DB.prepare(`
      INSERT INTO conversations (id, user_id, title, created_at, updated_at, message_count)
      VALUES (?, ?, ?, ?, ?, 0)
    `).bind(conversationId, userId, `Conversation ${(/* @__PURE__ */ new Date()).toLocaleDateString()}`, now, now).run();
  }
  const audioKey = `voice/${userId}/${conversationId}/${Date.now()}.webm`;
  await c.env.R2.put(audioKey, audioBuffer, {
    httpMetadata: { contentType: audioFile.type || "audio/webm" }
  });
  const messageId = crypto.randomUUID();
  const timestamp = Math.floor(Date.now() / 1e3);
  await c.env.DB.prepare(`
    INSERT INTO messages (id, conversation_id, role, content, audio_url, timestamp)
    VALUES (?, ?, 'user', ?, ?, ?)
  `).bind(messageId, conversationId, transcript, `/assets/${audioKey}`, timestamp).run();
  try {
    const embedding = await c.env.AI.run("@cf/baai/bge-base-en-v1.5", {
      text: transcript
    });
    if (c.env.VECTORIZE) {
      await c.env.VECTORIZE.upsert([{
        id: messageId,
        values: embedding.data[0],
        metadata: {
          user_id: userId,
          conversation_id: conversationId,
          content: transcript.substring(0, 500),
          timestamp
        }
      }]);
    }
  } catch (e) {
    console.error("Vectorize error:", e);
  }
  await c.env.DB.prepare(`
    UPDATE conversations SET updated_at = ?, message_count = message_count + 1
    WHERE id = ?
  `).bind(timestamp, conversationId).run();
  const recentMessages = await c.env.DB.prepare(`
    SELECT role, content FROM messages 
    WHERE conversation_id = ? 
    ORDER BY timestamp DESC 
    LIMIT 5
  `).bind(conversationId).all();
  const context2 = (recentMessages.results || []).reverse().map((m) => `${m.role}: ${m.content}`).join("\n");
  const systemPrompt = `You are Makerlog, a friendly AI assistant that helps makers think through their ideas.

Your role is to:
- Listen actively and ask clarifying questions
- Help users articulate their ideas more clearly
- Identify potential generative tasks (images, code, text) that could help
- Keep responses concise and conversational (this is voice chat)

Recent conversation:
${context2}

Respond naturally to the user's latest message. If you notice something that could be generated (icon, code snippet, copy, etc.), mention it briefly.`;
  const aiResponse = await c.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: transcript }
    ],
    max_tokens: 300
  });
  const response = aiResponse.response;
  const assistantMessageId = crypto.randomUUID();
  await c.env.DB.prepare(`
    INSERT INTO messages (id, conversation_id, role, content, timestamp)
    VALUES (?, ?, 'assistant', ?, ?)
  `).bind(assistantMessageId, conversationId, response, Math.floor(Date.now() / 1e3)).run();
  c.executionCtx.waitUntil(analyzeForOpportunities(c.env, conversationId, messageId, transcript));
  return c.json({
    transcript,
    response,
    conversationId,
    messageId,
    audioUrl: `/assets/${audioKey}`
  });
});
async function analyzeForOpportunities(env2, conversationId, messageId, content) {
  const analysisPrompt = `Analyze this message for potential generative AI tasks.

Message: "${content}"

Identify any of these that could be generated:
1. Images (icons, illustrations, UI mockups, etc.)
2. Code (functions, components, boilerplate, etc.)
3. Text (copy, documentation, descriptions, etc.)

For each opportunity found, respond in JSON format:
{
  "opportunities": [
    {
      "type": "image|code|text",
      "prompt": "Detailed prompt for generation",
      "confidence": 0.0-1.0
    }
  ]
}

If no clear opportunities, respond with: {"opportunities": []}
Only include opportunities with confidence > 0.5.`;
  const analysis = await env2.AI.run("@cf/meta/llama-3.1-8b-instruct", {
    messages: [
      { role: "system", content: "You are an AI that identifies generative opportunities. Respond only in valid JSON." },
      { role: "user", content: analysisPrompt }
    ],
    max_tokens: 500
  });
  try {
    const jsonMatch = analysis.response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return;
    const parsed = JSON.parse(jsonMatch[0]);
    for (const opp of parsed.opportunities) {
      if (opp.confidence < 0.5) continue;
      await env2.DB.prepare(`
        INSERT INTO opportunities (id, conversation_id, type, prompt, confidence, source_messages, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'detected', ?)
      `).bind(
        crypto.randomUUID(),
        conversationId,
        opp.type,
        opp.prompt,
        opp.confidence,
        JSON.stringify([messageId]),
        Math.floor(Date.now() / 1e3)
      ).run();
    }
  } catch (e) {
    console.error("Failed to parse opportunities:", e);
  }
}
__name(analyzeForOpportunities, "analyzeForOpportunities");
app.get("/api/conversations", async (c) => {
  const userId = c.req.header("X-User-Id") || "demo-user";
  await ensureUser(c.env, userId);
  const result = await c.env.DB.prepare(`
    SELECT * FROM conversations 
    WHERE user_id = ? 
    ORDER BY updated_at DESC 
    LIMIT 50
  `).bind(userId).all();
  return c.json({ conversations: result.results || [] });
});
app.get("/api/conversations/:id", async (c) => {
  const conversationId = c.req.param("id");
  const userId = c.req.header("X-User-Id") || "demo-user";
  const conversation = await c.env.DB.prepare(`
    SELECT * FROM conversations WHERE id = ? AND user_id = ?
  `).bind(conversationId, userId).first();
  if (!conversation) {
    return c.json({ error: "Conversation not found" }, 404);
  }
  const messages = await c.env.DB.prepare(`
    SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC
  `).bind(conversationId).all();
  return c.json({
    conversation,
    messages: messages.results || []
  });
});
app.post("/api/conversations", async (c) => {
  const userId = c.req.header("X-User-Id") || "demo-user";
  const body = await c.req.json().catch(() => ({}));
  await ensureUser(c.env, userId);
  const conversationId = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1e3);
  await c.env.DB.prepare(`
    INSERT INTO conversations (id, user_id, title, created_at, updated_at, message_count)
    VALUES (?, ?, ?, ?, ?, 0)
  `).bind(conversationId, userId, body.title || `Conversation ${(/* @__PURE__ */ new Date()).toLocaleDateString()}`, now, now).run();
  return c.json({ id: conversationId }, 201);
});
app.post("/api/search", async (c) => {
  const userId = c.req.header("X-User-Id") || "demo-user";
  const { query, limit = 10 } = await c.req.json();
  if (!c.env.VECTORIZE) {
    return c.json({ error: "Vectorize not configured" }, 500);
  }
  const embedding = await c.env.AI.run("@cf/baai/bge-base-en-v1.5", {
    text: query
  });
  const results = await c.env.VECTORIZE.query(embedding.data[0], {
    topK: limit,
    filter: { user_id: userId },
    returnMetadata: "all"
  });
  return c.json({ results: results.matches });
});
app.get("/api/opportunities", async (c) => {
  const userId = c.req.header("X-User-Id") || "demo-user";
  const status = c.req.query("status") || "detected";
  const result = await c.env.DB.prepare(`
    SELECT o.*, c.title as conversation_title
    FROM opportunities o
    JOIN conversations c ON o.conversation_id = c.id
    WHERE c.user_id = ? AND o.status = ?
    ORDER BY o.confidence DESC, o.created_at DESC
    LIMIT 50
  `).bind(userId, status).all();
  return c.json({ opportunities: result.results || [] });
});
app.post("/api/opportunities/:id/queue", async (c) => {
  const opportunityId = c.req.param("id");
  const userId = c.req.header("X-User-Id") || "demo-user";
  await ensureUser(c.env, userId);
  const opp = await c.env.DB.prepare(`
    SELECT o.* FROM opportunities o
    JOIN conversations c ON o.conversation_id = c.id
    WHERE o.id = ? AND c.user_id = ?
  `).bind(opportunityId, userId).first();
  if (!opp) {
    return c.json({ error: "Opportunity not found" }, 404);
  }
  const taskId = crypto.randomUUID();
  const taskType = opp.type === "image" ? "image-gen" : opp.type === "code" ? "code-gen" : "text-gen";
  await c.env.DB.prepare(`
    INSERT INTO tasks (id, user_id, type, status, prompt, priority, created_at)
    VALUES (?, ?, ?, 'queued', ?, 2, ?)
  `).bind(taskId, userId, taskType, opp.prompt, Math.floor(Date.now() / 1e3)).run();
  await c.env.DB.prepare(`
    UPDATE opportunities SET status = 'queued' WHERE id = ?
  `).bind(opportunityId).run();
  return c.json({ taskId, status: "queued" });
});
app.post("/api/opportunities/:id/reject", async (c) => {
  const opportunityId = c.req.param("id");
  await c.env.DB.prepare(`
    UPDATE opportunities SET status = 'rejected' WHERE id = ?
  `).bind(opportunityId).run();
  return c.json({ status: "rejected" });
});
app.post("/api/opportunities/:id/refine", async (c) => {
  const opportunityId = c.req.param("id");
  const { prompt } = await c.req.json();
  await c.env.DB.prepare(`
    UPDATE opportunities SET prompt = ? WHERE id = ?
  `).bind(prompt, opportunityId).run();
  return c.json({ success: true });
});
app.get("/api/digest", async (c) => {
  const userId = c.req.header("X-User-Id") || "demo-user";
  const todayStart = Math.floor((/* @__PURE__ */ new Date()).setUTCHours(0, 0, 0, 0) / 1e3);
  await ensureUser(c.env, userId);
  const conversations = await c.env.DB.prepare(`
    SELECT * FROM conversations 
    WHERE user_id = ? AND updated_at >= ?
    ORDER BY updated_at DESC
  `).bind(userId, todayStart).all();
  const opportunities = await c.env.DB.prepare(`
    SELECT o.* FROM opportunities o
    JOIN conversations c ON o.conversation_id = c.id
    WHERE c.user_id = ? AND o.status = 'detected' AND o.created_at >= ?
    ORDER BY o.confidence DESC
  `).bind(userId, todayStart).all();
  const messageCount = await c.env.DB.prepare(`
    SELECT COUNT(*) as count FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    WHERE c.user_id = ? AND m.timestamp >= ?
  `).bind(userId, todayStart).first();
  return c.json({
    date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    conversations: conversations.results || [],
    conversationCount: (conversations.results || []).length,
    messageCount: messageCount?.count || 0,
    opportunities: opportunities.results || [],
    opportunityCount: (opportunities.results || []).length
  });
});
app.get("/api/daily-log", async (c) => {
  const userId = c.req.header("X-User-Id") || "demo-user";
  const dateParam = c.req.query("date");
  const format = c.req.query("format") || "markdown";
  await ensureUser(c.env, userId);
  let targetDate;
  if (dateParam) {
    targetDate = /* @__PURE__ */ new Date(dateParam + "T00:00:00Z");
  } else {
    targetDate = /* @__PURE__ */ new Date();
    targetDate.setUTCHours(0, 0, 0, 0);
  }
  const dayStart = Math.floor(targetDate.getTime() / 1e3);
  const dayEnd = dayStart + 86400;
  const messages = await c.env.DB.prepare(`
    SELECT m.*, c.title as conversation_title
    FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    WHERE c.user_id = ? AND m.timestamp >= ? AND m.timestamp < ?
    ORDER BY m.timestamp ASC
  `).bind(userId, dayStart, dayEnd).all();
  if ((messages.results || []).length === 0) {
    return c.json({
      date: dateParam || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      markdown: `# Daily Log - ${dateParam || (/* @__PURE__ */ new Date()).toLocaleDateString()}

No recordings today.
`,
      messages: []
    });
  }
  const msgs = messages.results;
  if (format === "json") {
    return c.json({
      date: dateParam || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      messages: msgs
    });
  }
  let markdown = `# Daily Log - ${dateParam || (/* @__PURE__ */ new Date()).toLocaleDateString()}

`;
  markdown += `*${msgs.length} message${msgs.length > 1 ? "s" : ""} recorded*

---

`;
  let currentConversation = "";
  for (const msg of msgs) {
    if (msg.conversation_title !== currentConversation) {
      if (currentConversation) markdown += "\n";
      markdown += `## ${msg.conversation_title}

`;
      currentConversation = msg.conversation_title;
    }
    const time3 = new Date(msg.timestamp * 1e3).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
    if (msg.role === "user") {
      markdown += `### [${time3}] You

${msg.content}

`;
      if (msg.audio_url) {
        markdown += `[\u{1F50A} Audio](${msg.audio_url})

`;
      }
    } else {
      markdown += `### [${time3}] Makerlog

${msg.content}

`;
    }
  }
  return c.json({
    date: dateParam || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    markdown,
    messages: msgs
  });
});
app.get("/api/daily-log/dates", async (c) => {
  const userId = c.req.header("X-User-Id") || "demo-user";
  await ensureUser(c.env, userId);
  const dates = await c.env.DB.prepare(`
    SELECT DISTINCT DATE(m.timestamp, 'unixepoch') as date, COUNT(*) as message_count
    FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    WHERE c.user_id = ?
    GROUP BY DATE(m.timestamp, 'unixepoch')
    ORDER BY date DESC
    LIMIT 365
  `).bind(userId).all();
  return c.json({
    dates: (dates.results || []).map((d) => ({
      date: d.date,
      messageCount: d.message_count
    }))
  });
});
app.patch("/api/messages/:id", async (c) => {
  const messageId = c.req.param("id");
  const userId = c.req.header("X-User-Id") || "demo-user";
  const { content } = await c.req.json();
  if (!content) {
    return c.json({ error: "content is required" }, 400);
  }
  const message = await c.env.DB.prepare(`
    SELECT m.* FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    WHERE m.id = ? AND c.user_id = ?
  `).bind(messageId, userId).first();
  if (!message) {
    return c.json({ error: "Message not found" }, 404);
  }
  await c.env.DB.prepare(`
    UPDATE messages SET content = ? WHERE id = ?
  `).bind(content, messageId).run();
  if (c.env.VECTORIZE && message.role === "user") {
    try {
      const embedding = await c.env.AI.run("@cf/baai/bge-base-en-v1.5", {
        text: content
      });
      await c.env.VECTORIZE.upsert([{
        id: messageId,
        values: embedding.data[0],
        metadata: {
          user_id: userId,
          conversation_id: message.conversation_id,
          content: content.substring(0, 500),
          timestamp: message.timestamp
        }
      }]);
    } catch (e) {
      console.error("Vectorize update error:", e);
    }
  }
  return c.json({ success: true, message: { id: messageId, content } });
});
app.post("/api/generate/text", async (c) => {
  const userId = c.req.header("X-User-Id") || "demo-user";
  const { prompt, maxTokens = 1e3, systemPrompt } = await c.req.json();
  if (!prompt) {
    return c.json({ error: "prompt is required" }, 400);
  }
  try {
    const messages = [];
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: prompt });
    const response = await c.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages,
      max_tokens: maxTokens
    });
    return c.json({
      success: true,
      result: response.response,
      model: "@cf/meta/llama-3.1-8b-instruct"
    });
  } catch (error3) {
    console.error("Text generation failed:", error3);
    return c.json({ error: "Text generation failed" }, 500);
  }
});
app.post("/api/generate/code", async (c) => {
  const userId = c.req.header("X-User-Id") || "demo-user";
  const { prompt, language, maxTokens = 2e3 } = await c.req.json();
  if (!prompt) {
    return c.json({ error: "prompt is required" }, 400);
  }
  try {
    const systemPrompt = `You are an expert programmer. Generate clean, well-commented code${language ? ` in ${language}` : ""}. Focus on best practices, error handling, and readability.`;
    const response = await c.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      max_tokens: maxTokens
    });
    return c.json({
      success: true,
      result: response.response,
      language,
      model: "@cf/meta/llama-3.1-8b-instruct"
    });
  } catch (error3) {
    console.error("Code generation failed:", error3);
    return c.json({ error: "Code generation failed" }, 500);
  }
});
app.post("/api/generate/image", async (c) => {
  const userId = c.req.header("X-User-Id") || "demo-user";
  const { prompt, negativePrompt, steps = 20 } = await c.req.json();
  if (!prompt) {
    return c.json({ error: "prompt is required" }, 400);
  }
  try {
    const response = await c.env.AI.run("@cf/stabilityai/stable-diffusion-xl-base-1.0", {
      prompt,
      negative_prompt: negativePrompt || "blurry, low quality, distorted",
      num_steps: steps
    });
    const imageId = crypto.randomUUID();
    const key = `generated-images/${userId}/${imageId}.png`;
    await c.env.R2.put(key, response, {
      httpMetadata: { contentType: "image/png" }
    });
    return c.json({
      success: true,
      imageUrl: `/assets/${key}`,
      imageId,
      model: "@cf/stabilityai/stable-diffusion-xl-base-1.0"
    });
  } catch (error3) {
    console.error("Image generation failed:", error3);
    return c.json({ error: "Image generation failed" }, 500);
  }
});
app.post("/api/generate/translate", async (c) => {
  const { text, targetLanguage, sourceLanguage } = await c.req.json();
  if (!text || !targetLanguage) {
    return c.json({ error: "text and targetLanguage are required" }, 400);
  }
  try {
    const systemPrompt = `You are a professional translator. Translate the given text${sourceLanguage ? ` from ${sourceLanguage}` : ""} to ${targetLanguage}. Preserve the original meaning and tone. Only return the translated text.`;
    const response = await c.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text }
      ],
      max_tokens: 2e3
    });
    return c.json({
      success: true,
      result: response.response.trim(),
      sourceLanguage,
      targetLanguage,
      model: "@cf/meta/llama-3.1-8b-instruct"
    });
  } catch (error3) {
    console.error("Translation failed:", error3);
    return c.json({ error: "Translation failed" }, 500);
  }
});
app.post("/api/generate/summarize", async (c) => {
  const { text, maxLength = 200, style = "concise" } = await c.req.json();
  if (!text) {
    return c.json({ error: "text is required" }, 400);
  }
  try {
    let stylePrompt = "";
    switch (style) {
      case "detailed":
        stylePrompt = "Provide a comprehensive summary with key details.";
        break;
      case "bullet-points":
        stylePrompt = "Format the summary as a bulleted list of key points.";
        break;
      default:
        stylePrompt = `Provide a concise summary in ${maxLength} words or less.`;
    }
    const systemPrompt = `You are a skilled summarizer. ${stylePrompt}`;
    const response = await c.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text }
      ],
      max_tokens: 500
    });
    return c.json({
      success: true,
      result: response.response.trim(),
      style,
      model: "@cf/meta/llama-3.1-8b-instruct"
    });
  } catch (error3) {
    console.error("Summarization failed:", error3);
    return c.json({ error: "Summarization failed" }, 500);
  }
});
app.post("/api/analyze/image", async (c) => {
  const userId = c.req.header("X-User-Id") || "demo-user";
  const formData = await c.req.formData();
  const imageFile = formData.get("image");
  const analysisType = formData.get("type") || "caption";
  if (!imageFile) {
    return c.json({ error: "No image file provided" }, 400);
  }
  try {
    const imageBuffer = await imageFile.arrayBuffer();
    const tempKey = `temp-analysis/${userId}/${Date.now()}.${imageFile.name.split(".").pop()}`;
    await c.env.R2.put(tempKey, imageBuffer, {
      httpMetadata: { contentType: imageFile.type || "image/png" }
    });
    const response = await c.env.AI.run("@cf/microsoft/florence-2-base", {
      image: [...new Uint8Array(imageBuffer)],
      text: analysisType === "caption" ? "Describe this image in detail." : analysisType === "objects" ? "List all objects in this image." : "Analyze this image."
    });
    const result = response.text || response.response || "";
    c.executionCtx.waitUntil(
      setTimeout(() => c.env.R2.delete(tempKey), 5 * 60 * 1e3)
    );
    return c.json({
      success: true,
      result,
      analysisType,
      imageUrl: `/assets/${tempKey}`,
      model: "@cf/microsoft/florence-2-base"
    });
  } catch (error3) {
    console.error("Image analysis failed:", error3);
    return c.json({
      success: true,
      result: "Image analysis completed. Note: Advanced image analysis requires model configuration.",
      analysisType
    });
  }
});
app.post("/api/generate/embeddings", async (c) => {
  const { text } = await c.req.json();
  if (!text) {
    return c.json({ error: "text is required" }, 400);
  }
  try {
    const embedding = await c.env.AI.run("@cf/baai/bge-base-en-v1.5", {
      text
    });
    return c.json({
      success: true,
      embedding: embedding.data[0],
      model: "@cf/baai/bge-base-en-v1.5",
      dimensions: embedding.data[0].length
    });
  } catch (error3) {
    console.error("Embedding generation failed:", error3);
    return c.json({ error: "Embedding generation failed" }, 500);
  }
});
app.post("/api/generate/classify", async (c) => {
  const { text, categories } = await c.req.json();
  if (!text || !categories || categories.length === 0) {
    return c.json({ error: "text and categories are required" }, 400);
  }
  try {
    const categoryList = categories.map((c2, i) => `${i + 1}. ${c2}`).join("\n");
    const systemPrompt = `Classify the given text into one of these categories:
${categoryList}

Respond only with the category name.`;
    const response = await c.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text }
      ],
      max_tokens: 50
    });
    const category = response.response.trim();
    return c.json({
      success: true,
      category,
      confidence: categories.includes(category) ? 0.8 : 0.5,
      model: "@cf/meta/llama-3.1-8b-instruct"
    });
  } catch (error3) {
    console.error("Classification failed:", error3);
    return c.json({ error: "Classification failed" }, 500);
  }
});
app.get("/api/models", async (c) => {
  const models = {
    text: ["@cf/meta/llama-3.1-8b-instruct"],
    image: ["@cf/stabilityai/stable-diffusion-xl-base-1.0"],
    audio: ["@cf/openai/whisper-large-v3-turbo"],
    embeddings: ["@cf/baai/bge-base-en-v1.5"],
    vision: ["@cf/microsoft/florence-2-base"]
  };
  return c.json({
    models,
    total: Object.values(models).flat().length
  });
});
var connectedConnectors = /* @__PURE__ */ new Map();
app.get("/api/ws", async (c) => {
  const upgradeHeader = c.req.header("Upgrade");
  if (upgradeHeader !== "websocket") {
    return c.json({ error: "Expected WebSocket upgrade request" }, 400);
  }
  const authHeader = c.req.header("Authorization") || "";
  const userId = c.req.header("X-User-Id") || "";
  if (!authHeader.startsWith("Bearer ") || !userId) {
    return c.json({ error: "Missing authentication" }, 401);
  }
  const apiKey = authHeader.replace("Bearer ", "");
  const isValidKey = await validateApiKey(c.env, userId, apiKey);
  if (!isValidKey) {
    return c.json({ error: "Invalid API key" }, 403);
  }
  return c.json({ message: "WebSocket endpoint - requires dedicated WebSocket handler" });
});
app.post("/api/desktop-connector/register", async (c) => {
  const userId = c.req.header("X-User-Id");
  const { connectorId, capabilities } = await c.req.json();
  const connector = {
    id: connectorId,
    userId,
    capabilities,
    ws: null,
    // WebSocket connection
    lastSeen: Date.now()
  };
  connectedConnectors.set(connectorId, connector);
  const pendingTasks = await c.env.DB.prepare(`
    SELECT * FROM tasks
    WHERE user_id = ? AND status = 'queued'
    ORDER BY priority DESC, created_at ASC
    LIMIT 50
  `).bind(userId).all();
  return c.json({
    connectorId,
    registered: true,
    tasks: pendingTasks.results || []
  });
});
app.post("/api/desktop-connector/heartbeat", async (c) => {
  const { connectorId } = await c.req.json();
  const connector = connectedConnectors.get(connectorId);
  if (connector) {
    connector.lastSeen = Date.now();
    return c.json({ status: "ok" });
  }
  return c.json({ error: "Connector not found" }, 404);
});
app.post("/api/desktop-connector/task-completed", async (c) => {
  const userId = c.req.header("X-User-Id");
  const { taskId, asset, styleVector } = await c.req.json();
  await c.env.DB.prepare(`
    UPDATE tasks
    SET status = 'completed',
        result_url = ?,
        completed_at = strftime('%s', 'now')
    WHERE id = ?
  `).bind(asset.storageUrl, taskId).run();
  await c.env.DB.prepare(`
    INSERT INTO generated_assets (
      id, user_id, type, storage_url, storage_backend, content_hash,
      metadata, style_vector, disposition, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'r2', ?, ?, ?, ?, 'cache', strftime('%s', 'now'), strftime('%s', 'now'))
  `).bind(
    asset.id,
    userId,
    asset.type,
    asset.storageUrl,
    asset.contentHash,
    asset.metadata,
    styleVector ? JSON.stringify(styleVector) : null,
    "cache"
  ).run();
  const xpReward = 50;
  await c.env.DB.prepare(`
    UPDATE users
    SET xp = xp + ?,
        updated_at = strftime('%s', 'now')
    WHERE id = ?
  `).bind(xpReward, userId).run();
  return c.json({ success: true, xpAwarded: xpReward });
});
app.post("/api/desktop-connector/task-failed", async (c) => {
  const { taskId, error: error3 } = await c.req.json();
  await c.env.DB.prepare(`
    UPDATE tasks
    SET status = 'failed',
        error_message = ?,
        retry_count = retry_count + 1
    WHERE id = ?
  `).bind(error3, taskId).run();
  return c.json({ success: true });
});
app.post("/api/desktop-connector/feedback", async (c) => {
  const userId = c.req.header("X-User-Id");
  const { assetId, feedback } = await c.req.json();
  await c.env.DB.prepare(`
    INSERT INTO user_feedback (id, user_id, asset_id, rating, disposition, tags, refinements, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
  `).bind(
    randomUUID(),
    userId,
    assetId,
    feedback.rating,
    feedback.disposition,
    feedback.tags ? JSON.stringify(feedback.tags) : null,
    feedback.refinements || null
  ).run();
  updateStyleProfile(c.env, userId, assetId, feedback);
  return c.json({ success: true });
});
app.get("/api/desktop-connector/style-profile", async (c) => {
  const userId = c.req.header("X-User-Id");
  const profile3 = await c.env.DB.prepare(`
    SELECT * FROM style_profiles WHERE user_id = ?
  `).bind(userId).first();
  if (!profile3) {
    return c.json({
      userId,
      preferenceVector: new Array(512).fill(0),
      promptModifiers: [],
      positiveExampleCount: 0,
      negativeExampleCount: 0
    });
  }
  return c.json({
    userId: profile3.user_id,
    preferenceVector: JSON.parse(profile3.preference_vector),
    promptModifiers: JSON.parse(profile3.prompt_modifiers),
    positiveExampleCount: profile3.positive_example_count,
    negativeExampleCount: profile3.negative_example_count
  });
});
app.post("/api/desktop-connector/iteration", async (c) => {
  const userId = c.req.header("X-User-Id");
  const { assetId, refinements } = await c.req.json();
  const asset = await c.env.DB.prepare(`
    SELECT * FROM generated_assets WHERE id = ?
  `).bind(assetId).first();
  if (!asset) {
    return c.json({ error: "Asset not found" }, 404);
  }
  const metadata = JSON.parse(asset.metadata);
  const taskId = randomUUID();
  await c.env.DB.prepare(`
    INSERT INTO tasks (id, user_id, type, prompt, status, priority, cost_estimate, created_at)
    VALUES (?, ?, 'iteration', ?, 'queued', 8, 0.5, strftime('%s', 'now'))
  `).bind(taskId, userId, refinements).run();
  await c.env.DB.prepare(`
    UPDATE tasks
    SET refined_prompt = ?
    WHERE id = ?
  `).bind(`Iteration of ${assetId}: ${refinements}`, taskId).run();
  return c.json({
    taskId,
    status: "queued",
    message: "Iteration queued - will be processed by desktop connector"
  });
});
async function validateApiKey(env2, userId, apiKey) {
  const user = await env2.DB.prepare(`
    SELECT id FROM users WHERE id = ? AND cloudflare_api_key = ?
  `).bind(userId, apiKey).first();
  return !!user;
}
__name(validateApiKey, "validateApiKey");
async function updateStyleProfile(env2, userId, assetId, feedback) {
  const asset = await env2.DB.prepare(`
    SELECT * FROM generated_assets WHERE id = ?
  `).bind(assetId).first();
  if (!asset || !asset.style_vector) {
    return;
  }
  const styleVector = JSON.parse(asset.style_vector);
  const rating = feedback.rating;
  const weight = 0.3;
  let profile3 = await env2.DB.prepare(`
    SELECT * FROM style_profiles WHERE user_id = ?
  `).bind(userId).first();
  if (!profile3) {
    await env2.DB.prepare(`
      INSERT INTO style_profiles (user_id, preference_vector, prompt_modifiers, updated_at)
      VALUES (?, ?, ?, strftime('%s', 'now'))
    `).bind(userId, JSON.stringify(new Array(512).fill(0)), "[]").run();
    profile3 = {
      user_id: userId,
      preference_vector: JSON.stringify(new Array(512).fill(0)),
      prompt_modifiers: "[]",
      positive_example_count: 0,
      negative_example_count: 0
    };
  }
  const preferenceVector = JSON.parse(profile3.preference_vector);
  const promptModifiers = JSON.parse(profile3.prompt_modifiers);
  if (rating >= 4) {
    const newVector = preferenceVector.map(
      (v, i) => v + weight * (styleVector[i] - v)
    );
    const magnitude = Math.sqrt(newVector.reduce((sum, v) => sum + v * v, 0));
    const normalizedVector = magnitude > 0 ? newVector.map((v) => v / magnitude) : newVector;
    if (feedback.tags) {
      for (const tag of feedback.tags) {
        if (!promptModifiers.includes(tag)) {
          promptModifiers.push(tag);
        }
      }
    }
  } else if (rating <= 2) {
    const newVector = preferenceVector.map(
      (v, i) => v - weight * (styleVector[i] - v)
    );
    const magnitude = Math.sqrt(newVector.reduce((sum, v) => sum + v * v, 0));
    const normalizedVector = magnitude > 0 ? newVector.map((v) => v / magnitude) : newVector;
  }
  await env2.DB.prepare(`
    UPDATE style_profiles
    SET preference_vector = ?,
        prompt_modifiers = ?,
        updated_at = strftime('%s', 'now')
    WHERE user_id = ?
  `).bind(
    JSON.stringify(preferenceVector),
    JSON.stringify(promptModifiers),
    userId
  ).run();
}
__name(updateStyleProfile, "updateStyleProfile");
var src_default = app;

// ../../../../.nvm/versions/node/v22.21.1/lib/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env2, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env2);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../../.nvm/versions/node/v22.21.1/lib/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env2, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env2);
  } catch (e) {
    const error3 = reduceError(e);
    return Response.json(error3, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-zbcpgP/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// ../../../../.nvm/versions/node/v22.21.1/lib/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env2, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env2, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env2, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env2, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-zbcpgP/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env2, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env2, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env2, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env2, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env2, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env2, ctx) => {
      this.env = env2;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
