async function publishToVercel() {
  var btn = document.getElementById('publish-btn');
  var PUB_JOB = window.PUBLISH_JOB_ID || 'f04b0460-445f-476c-bbf3-6f23da7cdd05';
  btn.innerHTML = '<span class="pub-spinner"></span> Publishing';
  btn.disabled = true; btn.classList.add('publishing');
  var startTs = Date.now();
  try {
    var resp = await fetch('/api/jobs/run', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appId: APP_ID, jobId: PUB_JOB })
    });
    var data = await resp.json();
    if (data.status === 'completed') {
      showPublishDone(btn);
    } else {
      btn.innerHTML = '<span class="pub-spinner"></span> Deploying';
      pollJobStatus(PUB_JOB, btn, startTs);
    }
  } catch (e) { publishFail(btn, e.message); }
}

async function pollJobStatus(jobId, btn, startTs) {
  for (var i = 0; i < 40; i++) {
    await new Promise(function(r) { setTimeout(r, 3000); });
    try {
      var r = await fetch('/api/jobs/list');
      var d = await r.json();
      var job = (d.jobs||[]).find(function(j){return j.id===jobId;});
      if (!job) continue;
      var done = job.completedAt && new Date(job.completedAt).getTime() > startTs;
      if (done && job.status === 'completed') { showPublishDone(btn); return; }
      if (done && job.status === 'failed') { publishFail(btn, 'deploy failed'); return; }
    } catch(e) {}
  }
  publishFail(btn, 'timed out');
}

function showPublishDone(btn) {
  btn.classList.remove('publishing');
  btn.classList.add('published');
  btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Published';
  btn.disabled = false;
  setTimeout(function() {
    btn.classList.remove('published');
    btn.innerHTML = 'Publish';
  }, 3000);
}

function publishFail(btn, msg) {
  btn.classList.remove('publishing');
  btn.classList.add('pub-failed');
  btn.innerHTML = 'Failed';
  btn.disabled = false;
  toast('Publish failed: ' + msg);
  setTimeout(function() {
    btn.classList.remove('pub-failed');
    btn.innerHTML = 'Publish';
  }, 3000);
}

function copyLink(btn) {
  var inp = btn.previousElementSibling;
  navigator.clipboard.writeText(inp.value);
  btn.textContent = 'Copied';
  setTimeout(function() { btn.textContent = 'Copy'; }, 1500);
}
