/**
 * Face Age Insights collector.
 *
 * Add this script beside a face-age embed. It listens to the public widget
 * API and posts anonymized events to a dashboard you host.
 *
 * Checked against face-age 2.4.13:
 * - API.getAdvisorData(callback) receives { analysis, activeSelections }.
 *   In that release, analysis is the problems array
 *   ({ key, title, number, format, colors, description }), not an object that
 *   includes skin age. skinAge and damagePercentage are on the analysis object
 *   the widget keeps in memory. This collector reads those two numbers when
 *   they are present, buckets the age, and never sends the photo, quiz
 *   answers, product ids, or exact age.
 * - onDisplayProducts, onClickProduct, onAddToCart, and onCheckout are public
 *   methods. Their payloads are counted and then discarded.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.FaceAgeInsights = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var OPT_OUT_KEY = "faceage_insights_opt_out";
  var PROBLEM_KEYS = {
    fineWrinkles: true,
    eyeWrinkles: true,
    deepWrinkles: true,
    darkCircle: true,
    eyeBag: true,
    pores: true,
    pigment: true,
    redness: true,
    oiliness: true,
    dryness: true,
    sagginess: true,
    dullness: true,
    acne: true,
  };

  function storageOf(options) {
    if (options && options.storage) return options.storage;
    try {
      if (typeof localStorage !== "undefined") return localStorage;
    } catch {
      return memoryStorage();
    }
    return memoryStorage();
  }

  function memoryStorage() {
    var data = {};
    return {
      getItem: function (key) {
        return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
      },
      setItem: function (key, value) {
        data[key] = String(value);
      },
      removeItem: function (key) {
        delete data[key];
      },
    };
  }

  function isOptedOut(storage) {
    return storage.getItem(OPT_OUT_KEY) === "1";
  }

  function createSessionId() {
    var bytes = new Uint8Array(16);
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      crypto.getRandomValues(bytes);
    } else {
      for (var index = 0; index < bytes.length; index += 1) {
        bytes[index] = Math.floor(Math.random() * 256);
      }
    }
    var hex = "";
    for (var i = 0; i < bytes.length; i += 1) {
      hex += bytes[i].toString(16).padStart(2, "0");
    }
    return hex;
  }

  function finiteNumber(value) {
    var number = typeof value === "number" ? value : Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function bucketSkinAge(age) {
    var number = finiteNumber(age);
    if (number == null) return null;
    var rounded = Math.round(number);
    if (rounded < 0 || rounded > 120) return null;
    if (rounded < 18) return "under_18";
    if (rounded <= 24) return "18_24";
    if (rounded <= 34) return "25_34";
    if (rounded <= 44) return "35_44";
    if (rounded <= 54) return "45_54";
    if (rounded <= 64) return "55_64";
    return "65_plus";
  }

  function skinHealthFromDamage(damage) {
    var number = finiteNumber(damage);
    if (number == null) return null;
    var clamped = Math.min(100, Math.max(0, number));
    if (clamped === 0) return 99;
    return Math.max(0, Math.min(100, Math.round(100 - clamped)));
  }

  function sanitizeLanguage(value) {
    if (typeof value !== "string") return undefined;
    var primary = value.trim().toLowerCase().split(/[-_]/)[0];
    return /^[a-z]{2}$/.test(primary) ? primary : undefined;
  }

  function problemList(analysis) {
    if (Array.isArray(analysis)) return analysis;
    if (analysis && Array.isArray(analysis.problems)) return analysis.problems;
    return [];
  }

  function readNumbers(widget, analysis) {
    var skinAge = null;
    var damage = null;
    if (analysis && !Array.isArray(analysis) && typeof analysis === "object") {
      skinAge = finiteNumber(analysis.skinAge);
      damage = finiteNumber(analysis.damagePercentage);
    }
    var internal =
      widget && widget.w && widget.w.globals && widget.w.globals.skinAnalyzeData;
    if (internal && typeof internal === "object" && !Array.isArray(internal)) {
      if (skinAge == null) skinAge = finiteNumber(internal.skinAge);
      if (damage == null) damage = finiteNumber(internal.damagePercentage);
    }
    return { skinAge: skinAge, damage: damage };
  }

  function buildScanEvent(widget, data, options) {
    var settings = options || {};
    var threshold = Number.isFinite(settings.concernThreshold) ? settings.concernThreshold : 40;
    var analysis = data && data.analysis;
    var numbers = readNumbers(widget, analysis);
    var problems = [];
    problemList(analysis).forEach(function (problem) {
      if (!problem || !PROBLEM_KEYS[problem.key]) return;
      var score = finiteNumber(problem.number != null ? problem.number : problem.score);
      if (score != null && score < threshold) return;
      problems.push(score == null ? { key: problem.key } : { key: problem.key, score: score });
    });
    var event = {
      type: "scan_completed",
      sessionId: settings.sessionId || createSessionId(),
      problems: problems,
    };
    var language = sanitizeLanguage(settings.language);
    if (language) event.language = language;
    var bucket = bucketSkinAge(numbers.skinAge);
    if (bucket) event.skinAgeBucket = bucket;
    var health = skinHealthFromDamage(numbers.damage);
    if (health != null) event.skinHealth = health;
    return event;
  }

  function containsDisallowed(payload) {
    return /@/.test(payload) || /data:/i.test(payload) || /base64/i.test(payload);
  }

  function post(options, body) {
    var payload = JSON.stringify(body);
    if (containsDisallowed(payload)) {
      return Promise.resolve({ ok: false, skipped: true });
    }
    var fetchImpl = options.fetch || (typeof fetch !== "undefined" ? fetch : null);
    if (!fetchImpl) return Promise.resolve({ ok: false, skipped: true });
    return fetchImpl(options.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Write-Key": options.writeKey,
      },
      body: payload,
      mode: "cors",
      keepalive: true,
    }).then(
      function (response) {
        return { ok: response.ok, status: response.status };
      },
      function () {
        return { ok: false };
      },
    );
  }

  function attach(widget, options) {
    if (!widget || !options || !options.endpoint || !options.writeKey) {
      throw new Error("FaceAgeInsights.attach requires a widget, endpoint, and writeKey.");
    }
    var storage = storageOf(options);
    var sessionId = options.sessionId || createSessionId();

    function send(body) {
      if (isOptedOut(storage)) return Promise.resolve({ ok: false, optedOut: true });
      return post(options, body);
    }

    if (widget.API && typeof widget.API.getAdvisorData === "function") {
      widget.API.getAdvisorData(function (data) {
        sessionId = createSessionId();
        send(buildScanEvent(widget, data, {
          language: options.language,
          sessionId: sessionId,
          concernThreshold: options.concernThreshold,
        }));
      });
    }

    function on(name, type) {
      if (typeof widget[name] !== "function") return;
      widget[name](function () {
        send({ type: type, sessionId: sessionId });
      });
    }

    on("onDisplayProducts", "product_view");
    on("onClickProduct", "product_click");
    on("onAddToCart", "add_to_cart");
    on("onCheckout", "checkout");

    return {
      getSessionId: function () {
        return sessionId;
      },
    };
  }

  function sendSample(options) {
    if (isOptedOut(storageOf(options))) {
      return Promise.resolve({ optedOut: true, results: [] });
    }
    var sessionId = createSessionId();
    var widget = {
      w: { globals: { skinAnalyzeData: { skinAge: 37, damagePercentage: 32 } } },
    };
    var scan = buildScanEvent(
      widget,
      {
        analysis: [
          { key: "acne", number: 72 },
          { key: "pores", number: 55 },
          { key: "dryness", number: 10 },
        ],
        activeSelections: { email: "should-not-send@example.com" },
      },
      { language: options.language || "en", sessionId: sessionId, concernThreshold: 40 },
    );
    return Promise.all([
      post(options, scan),
      post(options, { type: "product_view", sessionId: sessionId }),
      post(options, { type: "add_to_cart", sessionId: sessionId }),
    ]).then(function (results) {
      return { sessionId: sessionId, scan: scan, results: results };
    });
  }

  return {
    attach: attach,
    buildScanEvent: buildScanEvent,
    bucketSkinAge: bucketSkinAge,
    skinHealthFromDamage: skinHealthFromDamage,
    createSessionId: createSessionId,
    sendSample: sendSample,
    optOut: function (storage) {
      storageOf({ storage: storage }).setItem(OPT_OUT_KEY, "1");
    },
    optIn: function (storage) {
      storageOf({ storage: storage }).removeItem(OPT_OUT_KEY);
    },
    isOptedOut: function (storage) {
      return isOptedOut(storageOf({ storage: storage }));
    },
  };
});
