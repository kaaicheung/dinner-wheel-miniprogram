var dishes = require('../../data/dishes.js');

// Appetizing, distinct segment colors (warm + a few cool for contrast).
var SEG_COLORS = [
  '#ff6b35', '#f7b32b', '#e94f37', '#2a9d8f',
  '#e76f51', '#ffca3a', '#c1666b', '#4d908e',
  '#f9844a', '#e9c46a', '#bc4749', '#43aa8b'
];

var CONFETTI_COLORS = ['#ff6b35', '#ffd23f', '#2a9d8f', '#e94f37', '#f9844a', '#faf3e6'];
var TWO_PI = Math.PI * 2;

Page({
  data: {
    categories: dishes.CATEGORIES,
    activeCat: 'all',
    items: [],
    spinning: false,
    result: null,
    confetti: false,
    confettiBits: []
  },

  // Non-observable runtime state (kept off setData for perf).
  _canvas: null,
  _ctx: null,
  _dpr: 1,
  _size: 0,        // CSS px size of the square canvas
  _rotation: 0,    // current rotation in radians
  _raf: null,

  onReady: function () {
    var self = this;
    // Canvas nodes are only reliably available in onReady (not onLoad).
    self._initCanvas(function () {
      self._loadCategory('all');
    });
  },

  onUnload: function () {
    if (this._raf && this._canvas) {
      this._canvas.cancelAnimationFrame(this._raf);
    }
  },

  _initCanvas: function (cb) {
    var self = this;
    var query = wx.createSelectorQuery();
    query.select('#wheel')
      .fields({ node: true, size: true })
      .exec(function (res) {
        if (!res || !res[0] || !res[0].node) {
          // Retry once if the node isn't ready yet.
          setTimeout(function () { self._initCanvas(cb); }, 60);
          return;
        }
        var canvas = res[0].node;
        var ctx = canvas.getContext('2d');
        var dpr = (wx.getSystemInfoSync && wx.getSystemInfoSync().pixelRatio) || 1;
        var cssSize = res[0].width || 320;

        canvas.width = cssSize * dpr;
        canvas.height = cssSize * dpr;
        ctx.scale(dpr, dpr);

        self._canvas = canvas;
        self._ctx = ctx;
        self._dpr = dpr;
        self._size = cssSize;
        if (cb) cb();
      });
  },

  onSelectCat: function (e) {
    if (this.data.spinning) return;
    var key = e.currentTarget.dataset.key;
    if (key === this.data.activeCat) return;
    this._loadCategory(key);
  },

  _loadCategory: function (key) {
    var items = dishes.getWheelItems(key);
    this._rotation = 0;
    this.setData({
      activeCat: key,
      items: items,
      result: null,
      confetti: false
    });
    this._draw();
  },

  _draw: function () {
    var ctx = this._ctx;
    if (!ctx) return;
    var items = this.data.items;
    var n = items.length;
    if (n === 0) return;

    var size = this._size;
    var cx = size / 2;
    var cy = size / 2;
    var radius = size / 2 - 6;
    var seg = TWO_PI / n;

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this._rotation);

    for (var i = 0; i < n; i++) {
      var start = i * seg;
      var end = start + seg;

      // wedge
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, start, end);
      ctx.closePath();
      ctx.fillStyle = SEG_COLORS[i % SEG_COLORS.length];
      ctx.fill();
      // thin divider
      ctx.strokeStyle = 'rgba(26,20,36,0.55)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // label
      ctx.save();
      ctx.rotate(start + seg / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#1a1424';
      var fontSize = n > 10 ? 13 : (n > 7 ? 15 : 17);
      ctx.font = '600 ' + fontSize + 'px -apple-system,"PingFang SC","Microsoft YaHei",sans-serif';
      var label = items[i].name;
      if (label.length > 7) label = label.slice(0, 6) + '…';
      ctx.fillText(label, radius - 16, 0);
      ctx.restore();
    }

    // outer rim
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, TWO_PI);
    ctx.strokeStyle = '#faf3e6';
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.restore();
  },

  onSpin: function () {
    if (this.data.spinning) return;
    var items = this.data.items;
    var n = items.length;
    if (n === 0 || !this._ctx) return;

    var self = this;
    var seg = TWO_PI / n;

    // Pick a random winning index up front, then compute the exact final
    // rotation that lands that segment's CENTER under the top pointer.
    // Pointer is at the top = angle -PI/2 (12 o'clock) in canvas coords.
    var winIndex = Math.floor(Math.random() * n);
    var segCenter = winIndex * seg + seg / 2;
    // We want (rotation + segCenter) ≡ -PI/2 (mod 2PI).
    var pointerAngle = -Math.PI / 2;
    var extraTurns = 5 + Math.floor(Math.random() * 3); // 5-7 full spins
    // base target within [0, 2PI)
    var target = pointerAngle - segCenter;
    // normalize target above current rotation and add full turns
    var current = self._rotation % TWO_PI;
    var normalizedTarget = ((target - current) % TWO_PI + TWO_PI) % TWO_PI;
    var totalDelta = extraTurns * TWO_PI + normalizedTarget;
    var startRotation = self._rotation;
    var endRotation = startRotation + totalDelta;

    var duration = 3500;
    var startTs = null;

    self.setData({ spinning: true, result: null, confetti: false });

    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

    function frame(ts) {
      if (startTs === null) startTs = ts;
      var elapsed = ts - startTs;
      var t = Math.min(elapsed / duration, 1);
      var eased = easeOutCubic(t);
      self._rotation = startRotation + totalDelta * eased;
      self._draw();
      if (t < 1) {
        self._raf = self._canvas.requestAnimationFrame(frame);
      } else {
        self._rotation = endRotation;
        self._draw();
        self._onLanded(winIndex);
      }
    }
    self._raf = self._canvas.requestAnimationFrame(frame);
  },

  _onLanded: function (winIndex) {
    var item = this.data.items[winIndex];
    var emojis = ['🍜', '🍲', '🍱', '🥘', '🍛', '🍢', '🥟'];
    var result = {
      name: item.name,
      cuisine: item.cuisine,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      line: dishes.pickFunLine()
    };
    this.setData({ spinning: false, result: result });
    this._celebrate();
  },

  _celebrate: function () {
    var bits = [];
    for (var i = 0; i < 40; i++) {
      bits.push({
        id: i,
        left: Math.floor(Math.random() * 100),
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        delay: (Math.random() * 0.4).toFixed(2),
        rot: Math.floor(Math.random() * 360)
      });
    }
    var self = this;
    this.setData({ confettiBits: bits, confetti: true });
    setTimeout(function () {
      self.setData({ confetti: false });
    }, 2200);
  }
});
