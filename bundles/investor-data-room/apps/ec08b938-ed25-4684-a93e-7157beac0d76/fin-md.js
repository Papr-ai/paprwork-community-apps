/* Financial Model markdown builder */
function buildFinMarkdown(d) {
  var md = '# Financial Model\n\n';
  d.pages.forEach(function(p) {
    md += '## ' + p.label + '\n\n**' + p.headline + '**\n\n' + p.sub + '\n\n';
    if (p.projections) {
      md += '| Period | ARR | Customers | Note |\n|--------|-----|-----------|------|\n';
      p.projections.forEach(function(pr) {
        var arr = pr.arr >= 1000 ? '$' + (pr.arr/1000) + 'M' : '$' + pr.arr + 'K';
        md += '| ' + pr.year + ' | ' + arr + ' | ' + pr.customers + ' | ' + pr.note + ' |\n';
      });
      md += '\n';
    }
    if (p.drivers) {
      p.drivers.forEach(function(dr) {
        md += '**' + dr.title + '** — ' + dr.desc + ' *(' + dr.impact + ')*\n\n';
      });
    }
    if (p.timeline) {
      md += '**Built to Compound:**\n\n';
      p.timeline.forEach(function(t) {
        md += '- **' + t.stage + '**: ' + t.metric + ' — ' + t.detail + '\n';
      });
      md += '\n';
    }
    if (p.proofs) {
      p.proofs.forEach(function(pr) {
        md += '- **' + pr.value + ' ' + pr.label + '** — ' + pr.desc + '\n';
      });
      md += '\n';
    }
    if (p.allocation) {
      md += '**Allocation:**\n\n';
      p.allocation.forEach(function(a) {
        md += '- **' + a.name + '** (' + a.pct + '%) — ' + a.desc + '\n';
      });
      md += '\n';
    }
  });
  return md;
}
