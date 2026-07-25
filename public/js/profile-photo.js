/**
 * WhatsApp profile photo — same API as funnel-love-vision (Auralink webhook)
 * Webhook: GET ?tel={digits} → image/* OR JSON { link | url | picture }
 */
(function (global) {
  'use strict';

  var AURALINK_WEBHOOK =
    'https://thigato.auralink.com.br/webhook/03255d22-821e-4441-ad4e-bc93f6fe906d';

  var STORAGE_URL = 'sl_avatar';
  var STORAGE_BLUR = 'sl_avatar_blurred';
  var STORAGE_PHONE = 'sl_avatar_phone';

  var _cache = {};
  var _inflight = {};

  function digitsOnly(v) {
    return String(v || '').replace(/\D/g, '');
  }

  function normalizePhone(phone) {
    return digitsOnly(phone);
  }

  /**
   * Webhook often returns a generic "no user" image URL instead of empty.
   * Those must count as "no photo" → blur + PROFILE HIDDEN.
   */
  function isRealPhotoUrl(url) {
    if (!url || typeof url !== 'string') return false;
    var u = url.trim();
    if (u.indexOf('http') !== 0) return false;
    var low = u.toLowerCase();
    var fakePatterns = [
      'no-user-image',
      'no_user_image',
      'nouser',
      'default-avatar',
      'default_avatar',
      'default-user',
      'default_user',
      'placeholder',
      'no-photo',
      'nophoto',
      'anonymous',
      'blank-avatar',
      'blank_avatar',
      'user-icon',
      'user_icon',
      'avatar-placeholder',
      '3da39-no-user-image',
      'digitalhealthskills.com',
      'gravatar.com/avatar/000',
      'via.placeholder',
      'placehold.it',
      'placekitten',
      'ui-avatars.com',
    ];
    for (var i = 0; i < fakePatterns.length; i++) {
      if (low.indexOf(fakePatterns[i]) !== -1) return false;
    }
    return true;
  }

  function sanitizePhotoUrl(url) {
    return isRealPhotoUrl(url) ? url.trim() : null;
  }

  function getStored(phone) {
    var dig = normalizePhone(phone);
    if (!dig) return null;
    if (_cache[dig] !== undefined) {
      return sanitizePhotoUrl(_cache[dig]);
    }
    try {
      var storedPhone = sessionStorage.getItem(STORAGE_PHONE) || '';
      var url = sessionStorage.getItem(STORAGE_URL);
      if (storedPhone === dig && url && url.indexOf('http') === 0) {
        var clean = sanitizePhotoUrl(url);
        _cache[dig] = clean;
        if (!clean) {
          sessionStorage.removeItem(STORAGE_URL);
          sessionStorage.setItem(STORAGE_BLUR, 'true');
        }
        return clean;
      }
    } catch (e) {}
    return null;
  }

  function setStored(phone, url) {
    var dig = normalizePhone(phone);
    if (!dig) return;
    var clean = sanitizePhotoUrl(url);
    _cache[dig] = clean;
    try {
      sessionStorage.setItem(STORAGE_PHONE, dig);
      if (clean) {
        sessionStorage.setItem(STORAGE_URL, clean);
        sessionStorage.setItem(STORAGE_BLUR, 'false');
        localStorage.setItem('targetAvatar', clean);
        localStorage.setItem('targetAvatarBlurred', 'false');
        localStorage.setItem('targetPhone', dig);
      } else {
        sessionStorage.removeItem(STORAGE_URL);
        sessionStorage.setItem(STORAGE_BLUR, 'true');
        localStorage.setItem('targetAvatarBlurred', 'true');
        try { localStorage.removeItem('targetAvatar'); } catch (e2) {}
      }
    } catch (e) {}
  }

  function isBlurredStored() {
    try {
      return sessionStorage.getItem(STORAGE_BLUR) === 'true';
    } catch (e) {
      return true;
    }
  }

  /**
   * Fetch profile picture URL for full international phone (digits only, with country code).
   * Returns Promise<string|null>
   */
  function fetchProfilePicture(phone) {
    var dig = normalizePhone(phone);
    if (!dig || dig.length < 8) return Promise.resolve(null);

    var cached = getStored(dig);
    if (cached) return Promise.resolve(cached);
    if (_cache[dig] === null) return Promise.resolve(null);

    if (_inflight[dig]) return _inflight[dig];

    var webhookUrl = AURALINK_WEBHOOK + '?tel=' + encodeURIComponent(dig);

    function doFetch(attempt) {
      var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var timedOut = false;
      var timer = setTimeout(function () {
        timedOut = true;
        if (controller) controller.abort();
      }, 35000);

      return fetch(webhookUrl, {
        signal: controller ? controller.signal : undefined,
        cache: 'no-store',
      })
        .then(function (r) {
          clearTimeout(timer);
          if (!r.ok) {
            var err = new Error('http_' + r.status);
            err.status = r.status;
            throw err;
          }
          var ct = (r.headers.get('content-type') || '').toLowerCase();
          if (ct.indexOf('image') !== -1) {
            // Direct image from webhook — treat as real photo URL
            return webhookUrl;
          }
          return r.json().then(function (j) {
            var link = j && (j.link || j.url || j.picture || j.urlImage);
            return sanitizePhotoUrl(link);
          });
        })
        .catch(function (e) {
          clearTimeout(timer);
          var status = e && e.status;
          var transient =
            (!timedOut && e && e.name !== 'AbortError' && !status) ||
            (status >= 500 && status < 600);
          if (transient && attempt < 1) {
            return new Promise(function (res) {
              setTimeout(function () {
                res(doFetch(attempt + 1));
              }, 2500);
            });
          }
          return null;
        });
    }

    var p = doFetch(0).then(function (url) {
      var clean = sanitizePhotoUrl(url);
      setStored(dig, clean);
      delete _inflight[dig];
      return clean;
    });

    _inflight[dig] = p;
    return p;
  }

  /**
   * Prefetch and store (fire-and-forget friendly).
   */
  function prefetchProfilePicture(phone) {
    return fetchProfilePicture(phone);
  }

  /**
   * Apply avatar into a container element.
   * options: { size, blurredFallback, onResult(url|null) }
   */
  function applyAvatar(containerEl, phone, options) {
    options = options || {};
    if (!containerEl) return Promise.resolve(null);

    var dig = normalizePhone(phone);
    var size = options.size || null;

    function paint(url) {
      var clean = sanitizePhotoUrl(url);
      if (clean) {
        // Keep blur until the image actually loads successfully
        var img = document.createElement('img');
        img.alt = '';
        img.decoding = 'async';
        if (size) {
          img.width = size;
          img.height = size;
        }
        img.style.cssText =
          'width:100%;height:100%;object-fit:cover;object-position:center top;display:block;border-radius:50%;';
        img.onerror = function () {
          if (options.blurredFallback !== false) {
            containerEl.classList.add('blurred');
            containerEl.classList.remove('has-photo');
          }
          if (typeof options.onResult === 'function') options.onResult(null);
        };
        img.onload = function () {
          containerEl.classList.remove('blurred', 'av-blurred');
          containerEl.classList.add('has-photo');
          containerEl.style.filter = 'none';
          containerEl.style.webkitFilter = 'none';
          if (typeof options.onResult === 'function') options.onResult(clean);
        };
        if (options.blurredFallback !== false) {
          containerEl.classList.add('blurred');
          containerEl.classList.remove('has-photo');
        }
        containerEl.innerHTML = '';
        containerEl.appendChild(img);
        img.src = clean;
      } else {
        // No real photo → caller keeps placeholder + blur + PROFILE HIDDEN
        if (options.blurredFallback !== false) {
          containerEl.classList.add('blurred');
          containerEl.classList.remove('has-photo');
        }
        if (typeof options.onResult === 'function') options.onResult(null);
      }
      return clean;
    }

    // Instant paint from cache (only real photos)
    var cached = getStored(dig);
    if (cached) {
      paint(cached);
      return Promise.resolve(cached);
    }
    // Negative cache (explicit null) — don't refetch every time
    if (_cache[dig] === null) {
      paint(null);
      return Promise.resolve(null);
    }

    return fetchProfilePicture(dig).then(paint);
  }

  /**
   * Apply to multiple containers (same phone).
   */
  function applyAvatarAll(selectorOrNodes, phone, options) {
    var nodes;
    if (typeof selectorOrNodes === 'string') {
      nodes = Array.prototype.slice.call(document.querySelectorAll(selectorOrNodes));
    } else if (selectorOrNodes && selectorOrNodes.length !== undefined) {
      nodes = Array.prototype.slice.call(selectorOrNodes);
    } else if (selectorOrNodes) {
      nodes = [selectorOrNodes];
    } else {
      nodes = [];
    }
    return fetchProfilePicture(phone).then(function (url) {
      nodes.forEach(function (el) {
        applyAvatar(el, phone, Object.assign({}, options, { /* already fetched via cache */ }));
      });
      return url;
    });
  }

  global.ProfilePhoto = {
    webhook: AURALINK_WEBHOOK,
    normalizePhone: normalizePhone,
    isRealPhotoUrl: isRealPhotoUrl,
    fetch: fetchProfilePicture,
    prefetch: prefetchProfilePicture,
    apply: applyAvatar,
    applyAll: applyAvatarAll,
    getStored: getStored,
    isBlurred: isBlurredStored,
    /** Clear cached avatar (useful after fixing fake-placeholder cache) */
    clearCache: function (phone) {
      var dig = normalizePhone(phone);
      if (dig) delete _cache[dig];
      try {
        sessionStorage.removeItem(STORAGE_URL);
        sessionStorage.removeItem(STORAGE_BLUR);
        sessionStorage.removeItem(STORAGE_PHONE);
        localStorage.removeItem('targetAvatar');
        localStorage.setItem('targetAvatarBlurred', 'true');
      } catch (e) {}
    },
  };
})(typeof window !== 'undefined' ? window : this);
