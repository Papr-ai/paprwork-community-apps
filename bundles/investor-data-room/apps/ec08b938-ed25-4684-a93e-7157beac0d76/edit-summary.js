// Edit summary section (tagline, overview, URLs) and founder profile
function showSummaryEditModal(company) {
  var body = '<div class="sm-ed-wrap">' +
    '<label class="sm-ed-label">Tagline</label>' +
    '<input class="sm-ed-input" id="sm-tagline" value="' +
    esc(company.tagline || '') + '" placeholder="One-liner">' +
    '<label class="sm-ed-label">Overview (2-3 sentences)</label>' +
    '<textarea class="sm-ed-textarea" id="sm-overview" rows="3">' +
    esc(company.overview || '') + '</textarea>' +
    '<label class="sm-ed-label">Website URL</label>' +
    '<input class="sm-ed-input" id="sm-website" value="' +
    esc(company.website || '') + '" placeholder="https://">' +
    '<label class="sm-ed-label">LinkedIn URL</label>' +
    '<input class="sm-ed-input" id="sm-linkedin" value="' +
    esc(company.linkedin || '') + '" placeholder="https://linkedin.com/...">' +
    '<label class="sm-ed-label">Substack URL</label>' +
    '<input class="sm-ed-input" id="sm-substack" value="' +
    esc(company.substack || '') + '" placeholder="https://...">' +
    '<div class="sm-ed-actions">' +
    '<button class="sm-ed-save" id="sm-save">Save</button>' +
    '<button class="sm-ed-cancel" id="sm-cancel">Cancel</button>' +
    '</div></div>';
  openViewer({
    title: 'Edit \u2014 Company Summary',
    bodyHtml: body,
    afterBind: function(el) {
      el.querySelector('#sm-save').addEventListener('click', async function() {
        company.tagline = el.querySelector('#sm-tagline').value;
        company.overview = el.querySelector('#sm-overview').value;
        company.website = el.querySelector('#sm-website').value;
        company.linkedin = el.querySelector('#sm-linkedin').value;
        company.substack = el.querySelector('#sm-substack').value;
        await dbWrite("UPDATE company_info SET tagline=?, overview=?, website=?, linkedin=?, substack=? WHERE id='papr'",
          [company.tagline, company.overview, company.website, company.linkedin, company.substack]);
        localStorage.setItem('dr-company', JSON.stringify(company));
        if (window.ROOM_DATA) window.ROOM_DATA.company = company;
        closeViewer(true);
        toast('Summary saved');
        renderFounderView(document.getElementById('app'));
      });
      el.querySelector('#sm-cancel').addEventListener('click', function() {
        closeViewer(true);
      });
    }
  });
}

function showProfileEditModal(member) {
  var body = '<div class="sm-ed-wrap">' +
    '<label class="sm-ed-label">Name</label>' +
    '<input class="sm-ed-input" id="pf-name" value="' +
    esc(member.name || '') + '">' +
    '<label class="sm-ed-label">Role</label>' +
    '<input class="sm-ed-input" id="pf-role" value="' +
    esc(member.role || '') + '">' +
    '<label class="sm-ed-label">Bio</label>' +
    '<textarea class="sm-ed-textarea" id="pf-bio" rows="3">' +
    esc(member.bio || '') + '</textarea>' +
    '<label class="sm-ed-label">LinkedIn URL</label>' +
    '<input class="sm-ed-input" id="pf-linkedin" value="' +
    esc(member.linkedin || '') + '">' +
    '<label class="sm-ed-label">X / Twitter URL</label>' +
    '<input class="sm-ed-input" id="pf-x" value="' +
    esc(member.x_url || '') + '">' +
    '<div class="sm-ed-actions">' +
    '<button class="sm-ed-save" id="pf-save">Save</button>' +
    '<button class="sm-ed-cancel" id="pf-cancel">Cancel</button>' +
    '</div></div>';
  openViewer({
    title: 'Edit \u2014 ' + esc(member.name),
    bodyHtml: body,
    afterBind: function(el) {
      el.querySelector('#pf-save').addEventListener('click', async function() {
        var oldName = member.name;
        member.name = el.querySelector('#pf-name').value;
        member.role = el.querySelector('#pf-role').value;
        member.bio = el.querySelector('#pf-bio').value;
        member.linkedin = el.querySelector('#pf-linkedin').value;
        member.x_url = el.querySelector('#pf-x').value;
        await dbWrite("UPDATE team_members SET name=?, role=?, bio=?, linkedin=?, x_url=? WHERE name=?",
          [member.name, member.role, member.bio, member.linkedin, member.x_url, oldName]);
        closeViewer(true);
        toast('Profile saved');
        renderFounderView(document.getElementById('app'));
      });
      el.querySelector('#pf-cancel').addEventListener('click', function() {
        closeViewer(true);
      });
    }
  });
}
