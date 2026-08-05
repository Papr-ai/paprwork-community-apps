async function openCustomerData(editable) {
  var data = await Promise.all([
    loadRevenueHistory(), loadCustomers(), loadPipeline(), loadCaseStudies()
  ]);
  var history = data[0], customers = data[1], pipeline = data[2], cases = data[3];
  var md = buildCustomerDataMD(history, customers, pipeline, cases);
  var bodyHtml = '<div class="cd-body">' +
    renderCrmBanner() +
    renderRevenueSnapshot(history, customers) +
    renderRevenueChart(history) +
    renderPipelineWaterfall(pipeline) +
    renderTopCustomers(customers) +
    renderCaseStudies(cases) +
    '</div>';

  function renderCrmBanner() {
    var connected = window.ROOM_DATA && window.ROOM_DATA.config && window.ROOM_DATA.config.crm_connected === 'true';
    if (connected) return '';
    return '<div class="cd-crm-banner">' +
      '<div class="cd-crm-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
      '<path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>' +
      '</svg></div>' +
      '<div class="cd-crm-text">' +
      '<strong>Sample data</strong> — Connect your tools to show real metrics' +
      '<span class="cd-crm-hint">Tell Pen: "Connect my Stripe account" or "Sync customers from Attio"</span>' +
      '</div>' +
      '<button class="cd-crm-btn" onclick="this.closest(\'.cd-crm-banner\').remove()">Dismiss</button>' +
      '</div>';
  }
  openViewer({
    title: 'Customer Data',
    markdown: md,
    bodyHtml: bodyHtml
  });
}

function buildCustomerDataMD(history, customers, pipeline, cases) {
  var latest = history.length ? history[history.length-1] : {};
  var mrr = latest.mrr || 0;
  var md = '# Customer Data\n\n';
  md += '## Revenue\n- MRR: $' + mrr.toLocaleString() + '\n- ARR: $' + (mrr*12).toLocaleString() + '\n- Logo Retention: 100%\n\n';
  md += '## Top Customers\n';
  customers.slice(0,5).forEach(function(c){ md += '- ' + c.name + ': $' + c.mrr.toLocaleString() + '/mo (' + c.plan + ')\n'; });
  md += '\n## Pipeline\n';
  pipeline.filter(function(p){return p.stage!=='Lost';}).forEach(function(p){
    md += '- ' + p.name + ': ' + p.stage + ' ($' + p.value.toLocaleString() + ')\n';
  });
  md += '\n## Case Studies\n';
  cases.forEach(function(cs){ md += '### ' + cs.customer_name + '\n' + cs.result + '\n\n'; });
  return md;
}
