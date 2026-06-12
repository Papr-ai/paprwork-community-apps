// Reliable One-Pager PDF download.
// No browser PDF rendering. Local Papr app runs the server-side PDF job, which
// writes directly to ~/Downloads. Deployed dataroom downloads the static PDF
// generated during publish at /one-pager.pdf.

var ONE_PAGER_PDF_JOB_ID = '0d52d2e3-2865-4849-b74c-11263414c762';

function pdfopTimestamp() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0')
    + '-' + String(d.getDate()).padStart(2,'0') + '_'
    + String(d.getHours()).padStart(2,'0')
    + String(d.getMinutes()).padStart(2,'0');
}

function _downloadStaticOnePager() {
  var a = document.createElement('a');
  a.href = '/one-pager.pdf?v=' + Date.now();
  a.download = 'Papr_One_Pager_' + pdfopTimestamp() + '.pdf';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function _runOnePagerJobToDownloads() {
  var btn = document.getElementById('vw-pdf');
  if (btn) btn.disabled = true;
  if (typeof showToast === 'function') showToast('Generating PDF in Downloads…');
  try {
    var r = await fetch('/api/jobs/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appId: (window.APP_ID || APP_ID), jobId: ONE_PAGER_PDF_JOB_ID })
    });
    var d = await r.json().catch(function(){ return {}; });
    if (!r.ok || d.success === false || (d.data && d.data.status === 'failed')) {
      throw new Error((d.error || (d.data && d.data.error) || 'PDF job failed'));
    }
    if (typeof showToast === 'function') showToast('PDF generated in Downloads ✓');
  } catch (e) {
    console.error('One-pager PDF job failed', e);
    if (typeof showToast === 'function') showToast('PDF generation failed');
    // Last-resort for deployed/local static availability
    _downloadStaticOnePager();
  } finally {
    if (btn) btn.disabled = false;
  }
}

window.generatePDF = function(title, md) {
  // Live investor data room cannot call local Papr jobs, so download the static
  // server-generated PDF that publish bakes into Vercel.
  var isLive = location.hostname === 'your-dataroom.vercel.app' || location.hostname.indexOf('vercel.app') > -1;
  if (isLive) return _downloadStaticOnePager();
  return _runOnePagerJobToDownloads();
};
