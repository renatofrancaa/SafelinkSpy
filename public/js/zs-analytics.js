/**
 * Zapspy funnel analytics client — presence + pageviews + stage events
 */
(function () {
  if (window.__ZS_ANALYTICS__) return;
  window.__ZS_ANALYTICS__ = true;

  function setCookie(name, value, days) {
    try {
      var maxAge = (days || 30) * 24 * 60 * 60;
      document.cookie =
        name +
        "=" +
        encodeURIComponent(value) +
        "; path=/; max-age=" +
        maxAge +
        "; SameSite=Lax";
    } catch (e) {}
  }

  /**
   * One stable visitor id across cookie (server zs_vid) + localStorage.
   * Previously server used zs_vid and client used funnelVisitorId → split uniques.
   */
  function uid() {
    try {
      var fromLs = localStorage.getItem("funnelVisitorId") || "";
      var fromCookie = "";
      try {
        var m = document.cookie.match(/(?:^|; )zs_vid=([^;]*)/);
        if (m) fromCookie = decodeURIComponent(m[1] || "");
      } catch (e0) {}
      var id = fromLs || fromCookie;
      if (!id) {
        id =
          "v_" +
          Date.now() +
          "_" +
          Math.random().toString(36).slice(2, 10);
      }
      // Prefer existing cookie if LS empty (server already assigned)
      if (!fromLs && fromCookie) id = fromCookie;
      localStorage.setItem("funnelVisitorId", id);
      setCookie("zs_vid", id, 30);
      return id;
    } catch (e) {
      return "v_anon_" + Math.random().toString(36).slice(2, 10);
    }
  }

  function qs(name) {
    try {
      return new URLSearchParams(location.search).get(name) || "";
    } catch (e) {
      return "";
    }
  }

  function getCookie(name) {
    try {
      var m = document.cookie.match(
        new RegExp("(?:^|; )" + name.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1") + "=([^;]*)")
      );
      return m ? decodeURIComponent(m[1]) : "";
    } catch (e) {
      return "";
    }
  }

  function detectLayer() {
    try {
      // Cookie set by middleware (rewrite keeps original URL, so path alone lies)
      var zl = getCookie("zs_layer");
      if (zl === "white") return "white";
      if (zl === "black") return "black";
      if (getCookie("force_black") === "1") return "black";
      if (getCookie("cat_valid") === "1") return "black";
      var p = location.pathname.toLowerCase();
      if (p.indexOf("famguard") !== -1 || p.indexOf("/white") !== -1)
        return "white";
      if (
        p.indexOf("step") !== -1 ||
        p.indexOf("index") !== -1 ||
        p.indexOf("backredirect") !== -1 ||
        p.indexOf("/en-m") !== -1
      )
        return "black";
    } catch (e) {}
    return "unknown";
  }

  function detectSource() {
    var utm = localStorage.getItem("utm_source") || qs("utm_source");
    if (utm) return utm;
    if (qs("fbclid") || qs("igshid")) return "meta";
    if (qs("gclid") || qs("wbraid") || qs("gbraid") || qs("gad_source"))
      return "google";
    var ref = (document.referrer || "").toLowerCase();
    if (ref.indexOf("facebook") !== -1 || ref.indexOf("instagram") !== -1)
      return "meta";
    if (ref.indexOf("google") !== -1 || ref.indexOf("youtube") !== -1)
      return "google";
    if (ref) {
      try {
        return new URL(ref).hostname.replace(/^www\./, "");
      } catch (e) {
        return "referral";
      }
    }
    return "direct";
  }

  function stageFromPath(path) {
    path = (path || "").toLowerCase();
    // White rewrite: URL may be / or /index.html but layer cookie says white
    try {
      if (getCookie("zs_layer") === "white") return "white";
    } catch (e) {}
    if (path.indexOf("famguard") !== -1 || path.indexOf("/white") !== -1)
      return "white";
    if (path.indexOf("step6") !== -1) return "cta";
    if (path.indexOf("step5") !== -1) return "conversas";
    if (path.indexOf("step4") !== -1) return "recovery";
    if (path.indexOf("step3") !== -1) return "scan";
    if (path.indexOf("step2") !== -1) return "phone";
    if (path.indexOf("backredirect") !== -1) return "cta";
    if (path.indexOf("index") !== -1 || path === "/" || path === "")
      return "entry";
    if (path.indexOf("cta-unified") !== -1 || path.indexOf("cta") !== -1)
      return "cta";
    if (path.indexOf("conversas") !== -1) return "conversas";
    if (path.indexOf("chat") !== -1) return "chat";
    if (path.indexOf("phone") !== -1) return "phone";
    if (path.indexOf("dashboard") !== -1) return "dashboard";
    if (
      path.indexOf("landing") !== -1 ||
      path.indexOf("bridge") !== -1 ||
      path.indexOf("login") !== -1
    )
      return "landing";
    return "other";
  }

  function landing() {
    try {
      var l = sessionStorage.getItem("zs_landing");
      if (!l) {
        l = location.pathname + location.search;
        sessionStorage.setItem("zs_landing", l);
      }
      return l;
    } catch (e) {
      return location.pathname;
    }
  }

  // Meta placement names look like Instagram_Feed, Facebook_Mobile_Reels, etc.
  function looksLikePlacement(s) {
    if (!s || typeof s !== "string") return false;
    return /instagram|facebook|messenger|audience_network|an_|reels|stories|feed|right_hand|marketplace|video_feeds|instant_article|search|tech_other|mobile_feed|desktop_feed|explore|profile_feed|facebook_mobile|facebook_desktop|ig_|fb_/i.test(
      s
    );
  }

  /**
   * Ad placement / posicionamento (Meta {{placement}} etc.)
   * Query keys: placement, utm_placement, publisher_platform, site_source_name
   * Fallback: utm_content when it looks like a Meta placement label
   */
  function capturePlacement() {
    try {
      var keys = [
        "placement",
        "utm_placement",
        "publisher_platform",
        "site_source_name",
      ];
      for (var i = 0; i < keys.length; i++) {
        var v = qs(keys[i]);
        if (v) {
          localStorage.setItem("ad_placement", v);
          return v;
        }
      }
      var content = qs("utm_content") || localStorage.getItem("utm_content") || "";
      if (looksLikePlacement(content)) {
        localStorage.setItem("ad_placement", content);
        return content;
      }
      return localStorage.getItem("ad_placement") || "";
    } catch (e) {
      return "";
    }
  }

  // Capture UTMs from URL (and keep last known values)
  try {
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach(
      function (k) {
        var v = qs(k);
        if (v) localStorage.setItem(k, v);
      }
    );
    capturePlacement();
  } catch (e) {}

  function detectDevice() {
    var u = (navigator.userAgent || "").toLowerCase();
    if (/bot|spider|crawler|facebookexternalhit|slurp|semrush|ahrefs/i.test(u))
      return "Bot";
    if (/ipad|tablet|kindle|playbook|silk|(android(?!.*mobile))/i.test(u))
      return "Tablet";
    if (
      /mobi|iphone|ipod|android.*mobile|windows phone|opera mini|iemobile/i.test(
        u
      )
    )
      return "Mobile";
    return "Desktop";
  }

  function detectParam() {
    try {
      if (getCookie("cat_valid") === "1") return true;
      if (getCookie("force_black") === "1") return true;
      if (getCookie("zs_has_param") === "1") return true;
      if (qs("cat") || qs("test") || qs("fbclid") || qs("gclid")) return true;
    } catch (e) {}
    return false;
  }

  function inferLayerReason() {
    var reason = getCookie("zs_reason") || "";
    var reasonLabel = getCookie("zs_reason_label") || "";
    try {
      if (!reason) reason = sessionStorage.getItem("zs_layer_reason") || "";
      if (!reasonLabel)
        reasonLabel = sessionStorage.getItem("zs_layer_reason_label") || "";
    } catch (e) {}

    var layer = detectLayer();
    var hasParam = detectParam();
    var isBot =
      getCookie("zs_is_bot") === "1" ||
      detectDevice() === "Bot" ||
      /bot|spider|crawler|facebookexternalhit/i.test(navigator.userAgent || "");

    if (!reason || !reasonLabel) {
      if (layer === "black") {
        if (getCookie("force_black") === "1") {
          reason = "force_black";
          reasonLabel = "Teste local / force black";
        } else if (getCookie("cat_valid") === "1") {
          reason = "cat_cookie";
          reasonLabel = "Com parâmetro cat (cookie)";
        } else {
          reason = "clean";
          reasonLabel = "Humano · passou em todos os filtros";
        }
      } else {
        // white
        if (isBot) {
          reason = "bot";
          reasonLabel = "Bot / crawler detectado";
        } else if (!hasParam) {
          reason = "no_cat_param";
          reasonLabel = "Sem parâmetro cat (cookie)";
        } else {
          reason = "white_blocked";
          reasonLabel = "Bloqueado (white)";
        }
      }
    }

    try {
      sessionStorage.setItem("zs_layer_reason", reason);
      sessionStorage.setItem("zs_layer_reason_label", reasonLabel);
    } catch (e) {}

    return {
      reason: reason,
      reasonLabel: reasonLabel,
      isBot: isBot,
      hasParam: hasParam,
      layer: layer,
    };
  }

  var state = {
    visitorId: uid(),
    page: location.pathname + location.search,
    stage: stageFromPath(location.pathname),
    layer: detectLayer(),
    source: detectSource(),
    landing: landing(),
    utmSource: localStorage.getItem("utm_source") || qs("utm_source") || "",
    utmMedium: localStorage.getItem("utm_medium") || qs("utm_medium") || "",
    utmCampaign:
      localStorage.getItem("utm_campaign") || qs("utm_campaign") || "",
    utmContent: localStorage.getItem("utm_content") || qs("utm_content") || "",
    placement: capturePlacement(),
    country:
      localStorage.getItem("userCountryCode") ||
      localStorage.getItem("detectedCountry") ||
      "",
    domain: location.hostname || "",
    device: detectDevice(),
    ua: navigator.userAgent || "",
    hasParam: detectParam(),
    isBot: detectDevice() === "Bot",
  };

  /**
   * Microsoft Clarity — session replay + heatmaps on funnel steps.
   * Skips admin dashboard. Tags stage/layer/visitor for filtering in Clarity.
   */
  function bootClarity(projectId) {
    if (!projectId || window.__ZS_CLARITY__) return;
    // Never track dashboard or white/safe page (famguard)
    try {
      var path = (location.pathname || "").toLowerCase();
      if (path.indexOf("/dashboard") === 0) return;
      if (path.indexOf("famguard") !== -1) return;
      if (path === "/white" || path === "/white/") return;
      if (stageFromPath(path) === "white") return;
    } catch (e0) {}
    window.__ZS_CLARITY__ = true;
    (function (c, l, a, r, i, t, y) {
      c[a] =
        c[a] ||
        function () {
          (c[a].q = c[a].q || []).push(arguments);
        };
      t = l.createElement(r);
      t.async = 1;
      t.src = "https://www.clarity.ms/tag/" + i;
      y = l.getElementsByTagName(r)[0];
      y.parentNode.insertBefore(t, y);
    })(window, document, "clarity", "script", projectId);

    try {
      // Custom tags → filter recordings by funnel step in Clarity UI
      window.clarity("identify", state.visitorId);
      window.clarity("set", "stage", state.stage || "");
      window.clarity("set", "layer", state.layer || "");
      window.clarity("set", "source", state.source || "");
      window.clarity("set", "page", location.pathname || "");
    } catch (e1) {}
  }

  function tagClarityStage(stage) {
    try {
      if (typeof window.clarity === "function") {
        window.clarity("set", "stage", stage || state.stage || "");
        window.clarity("set", "page", location.pathname || "");
      }
    } catch (e2) {}
  }

  // 1) window.CLARITY_PROJECT_ID (clarity-id.js or inline)
  // 2) /api/public-config → NEXT_PUBLIC_CLARITY_ID / CLARITY_PROJECT_ID on Vercel
  try {
    if (window.CLARITY_PROJECT_ID) {
      bootClarity(String(window.CLARITY_PROJECT_ID));
    } else {
      fetch("/api/public-config", { credentials: "same-origin" })
        .then(function (r) {
          return r.json();
        })
        .then(function (cfg) {
          if (cfg && cfg.clarityId) bootClarity(String(cfg.clarityId));
        })
        .catch(function () {});
    }
  } catch (e3) {}

  function payload(extra) {
    var o = {};
    for (var k in state) o[k] = state[k];
    if (extra) for (var j in extra) o[j] = extra[j];
    // refresh dynamic
    o.page = location.pathname + location.search;
    o.stage =
      extra && extra.stage ? extra.stage : stageFromPath(location.pathname);
    o.domain = location.hostname || o.domain || "";
    o.device = detectDevice();
    o.country =
      localStorage.getItem("userCountryCode") ||
      localStorage.getItem("detectedCountry") ||
      o.country ||
      "";

    var lr = inferLayerReason();
    o.layer = lr.layer;
    o.reason = lr.reason;
    o.reasonLabel = lr.reasonLabel;
    o.isBot = lr.isBot;
    o.hasParam = lr.hasParam;
    // Refresh UTMs + placement every send (URL or localStorage)
    try {
      o.utmSource =
        qs("utm_source") ||
        localStorage.getItem("utm_source") ||
        o.utmSource ||
        "";
      o.utmMedium =
        qs("utm_medium") ||
        localStorage.getItem("utm_medium") ||
        o.utmMedium ||
        "";
      o.utmCampaign =
        qs("utm_campaign") ||
        localStorage.getItem("utm_campaign") ||
        o.utmCampaign ||
        "";
      o.utmContent =
        qs("utm_content") ||
        localStorage.getItem("utm_content") ||
        o.utmContent ||
        "";
      o.placement = capturePlacement() || o.placement || "";
      if (o.utmSource) localStorage.setItem("utm_source", o.utmSource);
      if (o.utmMedium) localStorage.setItem("utm_medium", o.utmMedium);
      if (o.utmCampaign) localStorage.setItem("utm_campaign", o.utmCampaign);
      if (o.utmContent) localStorage.setItem("utm_content", o.utmContent);
    } catch (eUtm) {}
    o.meta = Object.assign({}, extra && extra.meta ? extra.meta : {}, {
      reason: lr.reason,
      reasonLabel: lr.reasonLabel,
      isBot: lr.isBot,
      placement: o.placement || "",
      utmContent: o.utmContent || "",
      isHuman: !lr.isBot,
      hasCatParam: lr.hasParam,
      hasCatCookie: getCookie("cat_valid") === "1",
      utmSource: o.utmSource,
      utmMedium: o.utmMedium,
      utmCampaign: o.utmCampaign,
    });
    return o;
  }

  function send(url, body, sync) {
    try {
      var data = JSON.stringify(body);
      // Prefer sendBeacon (survives navigation) + fetch keepalive backup
      var beaconOk = false;
      if (navigator.sendBeacon) {
        try {
          var blob = new Blob([data], { type: "application/json" });
          beaconOk = !!navigator.sendBeacon(url, blob);
        } catch (e1) {}
      }
      if (!beaconOk || sync) {
        // sync XHR only when we must guarantee delivery before redirect
        if (sync && typeof XMLHttpRequest !== "undefined") {
          try {
            var xhr = new XMLHttpRequest();
            xhr.open("POST", url, false); // synchronous — last resort before redirect
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.send(data);
            return xhr.status >= 200 && xhr.status < 300;
          } catch (e2) {}
        }
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: data,
          keepalive: true,
          credentials: "same-origin",
        }).catch(function () {});
      }
      return beaconOk;
    } catch (e) {
      return false;
    }
  }

  function heartbeat(extra) {
    send("/api/analytics/heartbeat", payload(extra || {}));
  }

  function track(type, meta, stage, opts) {
    opts = opts || {};
    if (type === "pageview" || type === "layer") {
      send(
        "/api/analytics/heartbeat",
        payload({ event: type, meta: meta, stage: stage })
      );
      return true;
    }
    var body = payload({ stage: stage || "other", meta: meta || {} });
    body.type = type;
    // Merge meta (do not wipe reason fields) + top-level plan fields
    body.meta = Object.assign({}, body.meta || {}, meta || {});
    if (meta) {
      if (meta.value != null) {
        body.checkoutValue = meta.value;
        body.meta.value = meta.value;
      }
      if (meta.tier) {
        body.checkoutTier = meta.tier;
        body.meta.tier = meta.tier;
      }
      if (meta.planLabel) {
        body.planLabel = meta.planLabel;
        body.meta.planLabel = meta.planLabel;
      }
      if (meta.code) body.meta.code = meta.code;
    }
    body.stage = stage || body.stage || "other";
    return send("/api/analytics/event", body, !!opts.sync);
  }

  // Public API
  window.ZSAnalytics = {
    track: track,
    heartbeat: heartbeat,
    setStage: function (stage) {
      state.stage = stage;
      tagClarityStage(stage);
      // One unique pageview per stage (server also dedupes visitor+stage+path)
      var sk = "zs_stage_" + stage;
      try {
        if (!sessionStorage.getItem(sk)) {
          sessionStorage.setItem(sk, "1");
          track("pageview", { stageSet: true }, stage);
        } else {
          heartbeat({ stage: stage }); // presence only
        }
      } catch (e) {
        track("pageview", { stageSet: true }, stage);
      }
    },
    checkout: function (extra) {
      extra = extra || {};
      var force = !!extra.force;

      // One checkout per visitor — only skip if already SUCCESSFULLY sent
      try {
        if (!force) {
          if (sessionStorage.getItem("zs_checkout_ok") === "1") return true;
          if (localStorage.getItem("zs_checkout_ok_" + state.visitorId) === "1")
            return true;
        }
      } catch (e) {}

      var tier = extra.tier || window.selectedTier || null;
      var value =
        extra.value != null
          ? Number(extra.value)
          : window.productValue != null
            ? Number(window.productValue)
            : null;
      if ((value == null || isNaN(value)) && tier === "basic") value = 37;
      if ((value == null || isNaN(value)) && tier === "complete") value = 67;
      if (!tier && (value === 37 || value === 47)) tier = "basic";
      if (!tier && value === 67) tier = "complete";
      if (value == null || isNaN(value)) {
        value = 67;
        tier = tier || "complete";
      }
      var planLabel =
        extra.planLabel ||
        (value === 37 || value === 47
          ? "$" + value + " Essentials"
          : value === 67
            ? "$67 Complete"
            : "$" + value);

      var place =
        extra.placement ||
        capturePlacement() ||
        localStorage.getItem("ad_placement") ||
        "";
      var meta = {
        value: value,
        tier: tier,
        planLabel: planLabel,
        code: extra.code || window.checkoutCode || null,
        checkoutValue: value,
        checkoutTier: tier,
        placement: place,
        utmContent:
          localStorage.getItem("utm_content") || state.utmContent || "",
      };

      // Use HEARTBEAT path (same as pageviews that already work in history)
      // + sync XHR so redirect to Centerpag does not drop the event
      var body = payload({
        stage: "checkout",
        event: "checkout_click",
        meta: meta,
        logHistory: true,
      });
      body.type = "checkout_click";
      body.checkoutValue = value;
      body.checkoutTier = tier;
      body.planLabel = planLabel;
      body.placement = place;
      body.meta = Object.assign({}, body.meta || {}, meta);

      // ONE request only (was sending 4x → inflated raw history)
      var ok = false;
      try {
        if (typeof XMLHttpRequest !== "undefined") {
          var xhr = new XMLHttpRequest();
          xhr.open("POST", "/api/analytics/heartbeat", false);
          xhr.setRequestHeader("Content-Type", "application/json");
          xhr.send(JSON.stringify(body));
          ok = xhr.status >= 200 && xhr.status < 300;
        }
      } catch (eXhr) {}
      if (!ok) {
        try {
          ok = !!send("/api/analytics/heartbeat", body, false);
        } catch (e3) {}
      }

      if (ok) {
        try {
          sessionStorage.setItem("zs_checkout_ok", "1");
          localStorage.setItem("zs_checkout_ok_" + state.visitorId, "1");
          sessionStorage.setItem("zs_checkout_plan", planLabel);
          localStorage.setItem(
            "zs_checkout_value_" + state.visitorId,
            String(value)
          );
        } catch (e4) {}
      }
      return ok;
    },
  };

  // Initial pageview once per path — ONE history event only (not track+heartbeat both)
  var pvKey = "zs_pv_" + location.pathname;
  try {
    if (!sessionStorage.getItem(pvKey)) {
      sessionStorage.setItem(pvKey, "1");
      track("pageview"); // logs history via heartbeat with event=pageview
    } else {
      heartbeat(); // presence only, no new history row
    }
  } catch (e) {
    track("pageview");
  }

  // Heartbeat every 20s
  setInterval(function () {
    heartbeat();
  }, 20000);

  // On visibility
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") heartbeat();
  });

  // No global click → checkout. Only proceedToCheckout() on CTA pages
  // may call ZSAnalytics.checkout (keeps panel in sync with UTMify / payment redirect).
})();
