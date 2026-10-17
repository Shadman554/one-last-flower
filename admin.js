(function() {
  const $ = id => document.getElementById(id);
  let adminKey = sessionStorage.getItem('flower_admin_key') || '';
  let cachedPlayers = [];
  let cachedMeetings = [];

  const authPanel = $('auth-panel');
  const dashboard = $('dashboard');
  const authForm = $('auth-form');
  const authInput = $('admin-key-input');
  const authError = $('auth-error');
  const logoutBtn = $('logout-btn');

  function showAuth(error = '') {
    authPanel.hidden = false;
    dashboard.hidden = true;
    logoutBtn.hidden = true;
    if (error) {
      authError.textContent = error;
      authError.hidden = false;
    } else {
      authError.hidden = true;
    }
    authInput.value = '';
    authInput.focus();
  }

  function showDashboard() {
    authPanel.hidden = true;
    dashboard.hidden = false;
    logoutBtn.hidden = false;
    loadDashboardData();
  }

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const key = authInput.value.trim();
    if (!key) return;
    adminKey = key;
    try {
      const res = await fetch(`/api/player-stats?key=${encodeURIComponent(adminKey)}`);
      if (res.status === 401) {
        showAuth('Invalid admin key. Please try again.');
        return;
      }
      if (!res.ok) throw new Error('Network error');
      sessionStorage.setItem('flower_admin_key', adminKey);
      showDashboard();
    } catch (err) {
      showAuth('Could not connect to server.');
    }
  });

  logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('flower_admin_key');
    adminKey = '';
    showAuth();
  });

  async function loadDashboardData() {
    if (!adminKey) {
      showAuth();
      return;
    }

    try {
      const [statsRes, dataRes] = await Promise.all([
        fetch(`/api/player-stats?key=${encodeURIComponent(adminKey)}`),
        fetch(`/api/player-data?key=${encodeURIComponent(adminKey)}`)
      ]);

      if (statsRes.status === 401 || dataRes.status === 401) {
        sessionStorage.removeItem('flower_admin_key');
        showAuth('Session expired. Please enter admin key.');
        return;
      }

      const stats = await statsRes.json();
      const data = await dataRes.json();

      cachedPlayers = data.players || [];
      cachedMeetings = data.meetings || [];

      renderKPIs(stats);
      renderConfirmedDates(cachedMeetings, cachedPlayers);
      renderPlayersTable(cachedPlayers);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    }
  }

  function renderKPIs(stats) {
    $('kpi-total').textContent = stats.totalSessions || 0;
    $('kpi-completed').textContent = stats.completedSessions || 0;
    $('kpi-dates').textContent = stats.totalConfirmedDates || 0;

    const totalSecret = (stats.secretAnswers?.yes || 0) + (stats.secretAnswers?.no || 0);
    const yesPct = totalSecret ? Math.round(((stats.secretAnswers?.yes || 0) / totalSecret) * 100) : 0;
    $('kpi-secret').textContent = totalSecret ? `${yesPct}% (${stats.secretAnswers.yes}/${totalSecret})` : 'N/A';
  }

  function renderConfirmedDates(meetings, players) {
    const container = $('confirmed-dates-list');
    const badge = $('confirmed-count-badge');
    badge.textContent = `${meetings.length} saved`;

    if (!meetings.length) {
      container.innerHTML = '<p class="empty-text">No confirmed meeting dates yet. When a player picks a date, it will appear here!</p>';
      return;
    }

    container.innerHTML = meetings.map(m => {
      const matchPlayer = players.find(p => p.meeting_date === m.meeting_date);
      const name = matchPlayer?.player_name ? `by ${escapeHtml(matchPlayer.player_name)}` : '';
      const dateObj = new Date(m.meeting_date + 'T12:00:00');
      const formatted = !isNaN(dateObj) ? dateObj.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : m.meeting_date;
      const confirmedTime = new Date(m.confirmed_at).toLocaleString();

      return `
        <div class="date-pill">
          <span class="date-pill-icon">🌸</span>
          <div class="date-pill-text">
            <strong>${formatted}</strong>
            <small>Confirmed: ${confirmedTime} ${name}</small>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderPlayersTable(players) {
    const tbody = $('players-table-body');
    if (!players.length) {
      tbody.innerHTML = '<tr><td colspan="10" class="empty-text">No player sessions recorded yet!</td></tr>';
      return;
    }

    tbody.innerHTML = players.map(p => {
      const time = new Date(p.updated_at).toLocaleString();
      const name = escapeHtml(p.player_name || 'Cute Little Mouse');
      const flowers = `${p.flowers_collected || 0}/4 ${p.special_flower ? '🌸 + Bouquet' : ''}`;
      const minutes = Math.floor((p.play_time_seconds || 0) / 60);
      const seconds = Math.floor((p.play_time_seconds || 0) % 60);
      const duration = `${minutes}m ${seconds}s`;

      let ratingBadge = p.love_rating ? `<span class="badge-rating">${escapeHtml(p.love_rating)}</span>` : '<span style="color:#aaa">-</span>';
      let secretBadge = '<span style="color:#aaa">-</span>';
      if (p.secret_answer) {
        const isYes = p.secret_answer.toLowerCase().includes('yes');
        secretBadge = `<span class="${isYes ? 'badge-yes' : 'badge-no'}">${escapeHtml(p.secret_answer)}</span>`;
      }

      let choiceText = p.meeting_choice ? escapeHtml(p.meeting_choice) : '<span style="color:#aaa">-</span>';
      let confirmedDate = p.meeting_date ? `<strong>${escapeHtml(p.meeting_date)}</strong>` : '<span style="color:#aaa">-</span>';
      let statusBadge = p.completed ? '<span class="badge-completed">Completed 🌸</span>' : '<span class="badge-progress">In Progress ⏳</span>';

      return `
        <tr>
          <td><small>${time}</small></td>
          <td><strong>${name}</strong></td>
          <td>${ratingBadge}</td>
          <td>${secretBadge}</td>
          <td>${choiceText}</td>
          <td>${confirmedDate}</td>
          <td>${flowers}</td>
          <td>${duration}</td>
          <td>${statusBadge}</td>
          <td>
            <button class="btn-del" data-id="${p.session_id}">Delete</button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.btn-del').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (!confirm('Are you sure you want to delete this player session?')) return;
        try {
          const res = await fetch(`/api/player-data?sessionId=${encodeURIComponent(id)}&key=${encodeURIComponent(adminKey)}`, {
            method: 'DELETE'
          });
          if (res.ok) {
            loadDashboardData();
          } else {
            alert('Could not delete session.');
          }
        } catch (e) {
          alert('Failed to delete session.');
        }
      });
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[m]);
  }

  // Tools: Refresh, CSV, JSON
  $('refresh-btn').addEventListener('click', loadDashboardData);

  $('export-csv-btn').addEventListener('click', () => {
    if (!cachedPlayers.length) {
      alert('No player data to export.');
      return;
    }
    const headers = ['Session ID', 'Player Name', 'Flowers', 'Special Flower', 'Jump Attempts', 'Love Rating', 'Secret Answer', 'Meeting Choice', 'Meeting Date', 'Completed', 'Play Time (s)', 'Created At', 'Updated At'];
    const rows = cachedPlayers.map(p => [
      `"${p.session_id}"`,
      `"${p.player_name || ''}"`,
      p.flowers_collected,
      p.special_flower,
      p.jump_attempts,
      `"${p.love_rating || ''}"`,
      `"${p.secret_answer || ''}"`,
      `"${p.meeting_choice || ''}"`,
      `"${p.meeting_date || ''}"`,
      p.completed,
      p.play_time_seconds,
      `"${p.created_at}"`,
      `"${p.updated_at}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `one-last-flower-players-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  });

  $('export-json-btn').addEventListener('click', () => {
    if (!cachedPlayers.length) {
      alert('No player data to export.');
      return;
    }
    const exportData = {
      exportedAt: new Date().toISOString(),
      confirmedMeetings: cachedMeetings,
      players: cachedPlayers
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `one-last-flower-export-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  });

  // Initial check
  if (adminKey) {
    showDashboard();
  } else {
    showAuth();
  }
})();
