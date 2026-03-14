/* ── site.js — shared Supabase helpers ───────────────────────── */
var SB_URL = 'https://semwzkgamxlyhhcteyxt.supabase.co';
var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlbXd6a2dhbXhseWhoY3RleXh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjM1NjUsImV4cCI6MjA4ODUzOTU2NX0.A6mVDnyso-uFJEODCuytq8vpYTLK4TKux37BdF5f1XQ';

function sbFetch(path) {
  return fetch(SB_URL + '/rest/v1/' + path, {
    headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
  }).then(function(r) { return r.json(); });
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtDate(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  return d.toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
}

function loadLatestArticles(containerId, limit) {
  var el = document.getElementById(containerId);
  if (!el) return;
  sbFetch('articles?select=title,slug,excerpt,category,published_at&status=eq.published&order=published_at.desc&limit=' + (limit||3))
    .then(function(articles) {
      if (!articles || articles.length === 0) {
        el.innerHTML = '<p style="color:#888;width:100%;text-align:center">No articles yet — check back soon.</p>';
        return;
      }
      el.innerHTML = articles.map(function(a) {
        return '<div class="col-4 col-12-medium"><section class="highlight">' +
          (a.category ? '<p style="font-size:0.68rem;color:#49fcd4;font-family:Raleway,sans-serif;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:0.5rem">' + escHtml(a.category) + '</p>' : '') +
          '<h3><a href="article.html?slug=' + encodeURIComponent(a.slug) + '">' + escHtml(a.title) + '</a></h3>' +
          '<p>' + escHtml((a.excerpt||'').substring(0,130)) + ((a.excerpt||'').length>130?'…':'') + '</p>' +
          '<ul class="actions"><li><a href="article.html?slug=' + encodeURIComponent(a.slug) + '" class="button style1">Read Article</a></li></ul>' +
          '</section></div>';
      }).join('');
    })
    .catch(function() { el.innerHTML = '<p style="color:#888">Could not load articles.</p>'; });
}

function initContactForm(formId, notifyId) {
  var form = document.getElementById(formId);
  var notify = document.getElementById(notifyId);
  if (!form) return;
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    var btn = form.querySelector('input[type="submit"]');
    btn.value = 'Sending…';
    btn.disabled = true;
    fetch(SB_URL + '/rest/v1/contact_submissions', {
      method: 'POST',
      headers: {
        'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY,
        'Content-Type': 'application/json', 'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        name:    form.querySelector('[name="name"]').value,
        email:   form.querySelector('[name="email"]').value,
        message: form.querySelector('[name="message"]').value
      })
    }).then(function(res) {
      if (res.ok || res.status === 201) {
        notify.className = 'notify success'; notify.style.display = 'block';
        notify.textContent = "Message sent — thank you! I'll be in touch soon.";
        form.reset();
      } else { throw new Error(); }
    }).catch(function() {
      notify.className = 'notify error'; notify.style.display = 'block';
      notify.textContent = 'Something went wrong. Please try again.';
    }).finally(function() {
      btn.value = 'Send Message'; btn.disabled = false;
    });
  });
}
