(function () {
  'use strict';

  var STATUS_LABELS = {
    under_review: 'Under review',
    maintainer_applied: 'Maintainer applied',
    upstream: 'Upstream'
  };

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char];
    });
  }

  function dateValue(item) { return new Date(item.submitted_at || 0).getTime(); }
  function dateLabel(value) {
    return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)) : 'Date unknown';
  }
  function updateLiveLabel(value) {
    var label = document.getElementById('contributions-live-label');
    if (!label) return;
    label.textContent = value ? 'Live feed · updated ' + dateLabel(value) : 'Live feed · updating automatically';
  }
  function upstreamUrl(item) {
    var matches = item.status_evidence && item.status_evidence.upstream && item.status_evidence.upstream.matched_patches;
    return matches && matches[0] && matches[0].url;
  }
  function links(item) {
    var result = [];
    if (item.url) result.push('<a href="' + escapeHtml(item.url) + '" target="_blank" rel="noopener">' + (item.source === 'github' ? 'GitHub PR' : 'Lore thread') + '</a>');
    var commit = upstreamUrl(item);
    if (commit) result.push('<a href="' + escapeHtml(commit) + '" target="_blank" rel="noopener">Upstream commit</a>');
    return result.join(' <span aria-hidden="true">·</span> ');
  }
  function patchCount(item) { return item.patches && item.patches.length ? item.patches.length : 1; }
  function card(item) {
    var count = patchCount(item);
    var series = count > 1;
    return '<article class="contribution-card' + (series ? ' contribution-card--series' : '') + '" role="link" tabindex="0" data-href="' + escapeHtml(item.url || upstreamUrl(item) || '') + '"><div class="contribution-card__sheet contribution-card__sheet--back"></div><div class="contribution-card__sheet contribution-card__sheet--mid"></div><div class="contribution-card__body"><div class="contribution-card__top"><span class="contribution-project">' + escapeHtml(item.project) + '</span><span class="contribution-status contribution-status--' + escapeHtml(item.status) + '">' + escapeHtml(STATUS_LABELS[item.status] || item.status) + '</span></div><div class="contribution-card__type">' + (series ? count + '-patch series' : 'Individual patch') + '</div><h3>' + escapeHtml(item.title) + '</h3><div class="contribution-meta"><span>' + escapeHtml(item.subsystem || 'Cross-subsystem') + '</span><span>' + escapeHtml(dateLabel(item.submitted_at)) + '</span></div><div class="contribution-links">Open Lore thread →</div></div></article>';
  }

  fetch((document.body.dataset.contributionsPath || 'data/contributions.json'), { cache: 'no-store' })
    .then(function (response) { if (!response.ok) throw new Error('Contribution feed unavailable'); return response.json(); })
    .then(function (data) {
      updateLiveLabel(data.generated_at);
      var items = (data.contributions || []).slice().sort(function (a, b) { return dateValue(b) - dateValue(a); });
      var latest = document.getElementById('latest-contribution');
      if (latest && items[0]) latest.innerHTML = escapeHtml(items[0].title) + '<br><small>' + escapeHtml(items[0].project) + ' · ' + escapeHtml(STATUS_LABELS[items[0].status] || items[0].status) + '</small>';

      var list = document.getElementById('contributions-list');
      if (!list) return;
      var projectFilter = document.getElementById('contribution-project-filter');
      var statusFilter = document.getElementById('contribution-status-filter');
      Array.from(new Set(items.map(function (item) { return item.project; }))).sort().forEach(function (project) { projectFilter.insertAdjacentHTML('beforeend', '<option value="' + escapeHtml(project) + '">' + escapeHtml(project) + '</option>'); });
      function render() {
        var filtered = items.filter(function (item) { return (!projectFilter.value || item.project === projectFilter.value) && (!statusFilter.value || item.status === statusFilter.value); });
        list.innerHTML = filtered.length ? filtered.map(card).join('') : '<p class="contributions-empty">No contributions match these filters.</p>';
        list.querySelectorAll('.contribution-card[data-href]').forEach(function (item) {
          item.addEventListener('click', function (event) { if (!event.target.closest('a')) window.open(item.dataset.href, '_blank', 'noopener'); });
          item.addEventListener('keydown', function (event) { if ((event.key === 'Enter' || event.key === ' ') && !event.target.closest('a')) { event.preventDefault(); window.open(item.dataset.href, '_blank', 'noopener'); } });
        });
        var count = document.getElementById('contribution-count');
        if (count) {
          var patches = filtered.reduce(function (total, item) { return total + patchCount(item); }, 0);
          count.textContent = patches + ' patch' + (patches === 1 ? '' : 'es') + ' sent';
        }
      }
      projectFilter.addEventListener('change', render); statusFilter.addEventListener('change', render); render();
      window.setInterval(function () { window.location.reload(); }, 300000);
    })
    .catch(function () {
      var latest = document.getElementById('latest-contribution');
      var list = document.getElementById('contributions-list');
      if (latest) latest.textContent = 'Contribution feed unavailable';
      if (list) list.innerHTML = '<p class="contributions-empty">The contribution feed could not be loaded.</p>';
    });
}());
