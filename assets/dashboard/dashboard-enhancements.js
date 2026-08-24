const jobState = {jobs: [], runs: [], queue: [], selectedJob: null, selectedRun: null};
const baseRefresh = refresh;
refresh = async () => {
  await baseRefresh();
  const [jobs, runs, queue] = await Promise.all(['/api/jobs', '/api/runs', '/api/queue'].map(async url => { const response = await fetch(url); return response.ok ? response.json() : []; }));
  jobState.jobs = jobs; jobState.runs = runs; jobState.queue = queue;
  if (!jobState.selectedJob && jobs.length) jobState.selectedJob = jobs[0].metadata.id;
  renderJobs();
};

renderSystem = snapshot => {
  const items = [['Scheduler', snapshot.paused ? 'PAUSED' : 'ACTIVE'], ['Job runs', snapshot.jobs.running], ['Queued', snapshot.jobs.queued], ['Jobs', snapshot.jobs.total], ['Approvals', snapshot.outstandingApprovals], ['Resources', snapshot.resources.length]];
  document.querySelector('#system-summary').innerHTML = `<div class="summary-grid">${items.map(([label, value]) => `<div class="summary-item"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join('')}</div>`;
};

const baseLaneRender = renderLane;
renderLane = lane => {
  baseLaneRender(lane);
  if (!lane) return;
  const activity = document.querySelector('#tab-activity .data-grid');
  const elapsed = lane.elapsedMs ? `${Math.round(lane.elapsedMs / 1000)}s` : 'Not running';
  activity.insertAdjacentHTML('beforeend', `<div class="data-card"><label>Execution target</label><p>${esc(lane.executionTarget || 'Not assigned')}</p></div><div class="data-card"><label>Elapsed execution</label><p>${esc(elapsed)}</p></div>`);
  const evidence = document.querySelector('#tab-evidence');
  const sources = lane.contextSources.map(source => { const reference = source.url ? `<a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.description)}</a>` : `<span>${esc(source.description)} · ${esc(source.localRef || source.id)}</span>`; return `<div class="evidence-row"><span class="evidence-type">${esc(source.type)}</span>${reference}<span class="status-pill">${esc(source.accessibility)}</span></div>`; }).join('');
  evidence.insertAdjacentHTML('beforeend', `<h3>Context sources</h3><div class="evidence-list">${sources || '<div class="data-card"><p>No external context source is attached.</p></div>'}</div>`);
};

function scheduleLabel(job) { return job.schedules.length ? job.schedules.map(item => `${item.spec.cron} ${item.spec.timezone}`).join(' · ') : 'Manual'; }
function statusClass(status) { return ['FAILED', 'DEGRADED', 'DISCONNECTED'].includes(status) ? 'error' : ['QUEUED', 'WAITING_FOR_WORKER', 'WAITING_FOR_RESOURCE', 'WAITING_FOR_APPROVAL', 'RETRY_PENDING'].includes(status) ? 'waiting' : ''; }
function renderJobs() {
  const jobs = jobState.jobs, selected = jobs.find(job => job.metadata.id === jobState.selectedJob);
  document.querySelector('#job-count').textContent = jobs.length;
  document.querySelector('#job-list').innerHTML = jobs.length ? jobs.map(job => `<button class="job-card ${job.metadata.id === jobState.selectedJob ? 'active' : ''}" data-job="${esc(job.metadata.id)}"><span><strong>${esc(job.metadata.name)}</strong><small>${esc(job.metadata.id)} · v${esc(job.metadata.version)}</small></span><span class="status-pill ${statusClass(job.latestRun?.status)}">${esc(job.latestRun?.status || 'NEVER RUN')}</span><small>${esc(scheduleLabel(job))}</small></button>`).join('') : '<div class="data-card"><p>No Job manifests loaded.</p></div>';
  document.querySelectorAll('[data-job]').forEach(button => button.addEventListener('click', () => { jobState.selectedJob = button.dataset.job; jobState.selectedRun = null; renderJobs(); }));
  renderJobDetail(selected); renderQueue(); renderRunHistory();
}
function renderJobDetail(job) {
  document.querySelector('#job-empty').hidden = Boolean(job); const detail = document.querySelector('#job-detail'); detail.hidden = !job; if (!job) return;
  const selectedRun = jobState.selectedRun ? jobState.runs.find(run => run.id === jobState.selectedRun) : job.latestRun;
  const steps = (selectedRun?.steps || job.spec.steps).map(step => `<div class="job-step"><span class="step-mark ${statusClass(step.status)}">${esc(step.status === 'SUCCEEDED' ? '✓' : step.status === 'RUNNING' ? '●' : '○')}</span><div><strong>${esc(step.name || step.id)}</strong><small>${esc(step.action)}${step.placement?.selected ? ` · ${esc(step.placement.selected)}` : ''}</small>${step.waitingReason ? `<p>${esc(step.waitingReason)}</p>` : ''}</div><span class="status-pill ${statusClass(step.status)}">${esc(step.status || 'DEFINED')}</span></div>`).join('');
  const schedule = job.schedules[0], scheduleState = schedule?.state;
  detail.innerHTML = `<div class="job-header"><div><span class="eyebrow">${esc(job.metadata.id)} · v${esc(job.metadata.version)}</span><h2>${esc(job.metadata.name)}</h2><p>${esc(job.metadata.description || '')}</p></div><span class="status-pill ${statusClass(selectedRun?.status)}">${esc(selectedRun?.status || 'READY')}</span></div><div class="metrics"><div class="metric"><span>Next run</span><strong>${esc(scheduleState?.nextScheduledAt ? new Date(scheduleState.nextScheduledAt).toLocaleString() : 'Manual / disabled')}</strong></div><div class="metric"><span>Last run</span><strong>${esc(job.latestRun?.endedAt ? new Date(job.latestRun.endedAt).toLocaleString() : 'Never')}</strong></div><div class="metric"><span>Priority</span><strong>${esc(job.spec.priority)}</strong></div><div class="metric"><span>Concurrency</span><strong>${esc(job.spec.concurrency)}</strong></div></div><div class="control-strip"><button class="button" id="run-job">Run now</button>${schedule ? `<button class="button secondary" id="toggle-schedule">${scheduleState?.enabled ? 'Disable' : 'Enable'} schedule</button>` : ''}</div><div class="job-run-heading"><div><span class="eyebrow">${selectedRun ? `Run ${esc(selectedRun.id)}` : 'Definition'}</span><h3>Steps</h3></div>${selectedRun ? `<small>${esc(selectedRun.trigger.type)} · ${esc(selectedRun.trigger.actor)}</small>` : ''}</div><div class="job-steps">${steps}</div>${selectedRun ? renderRunEvidence(selectedRun) : ''}`;
  document.querySelector('#run-job').addEventListener('click', () => jobCommand(`/api/jobs/${encodeURIComponent(job.metadata.id)}/run`, {}).catch(showError));
  if (schedule) document.querySelector('#toggle-schedule').addEventListener('click', () => jobCommand(`/api/schedules/${encodeURIComponent(schedule.metadata.id)}/${scheduleState?.enabled ? 'disable' : 'enable'}`, {}).catch(showError));
}
function renderRunEvidence(run) { const artifacts = run.artifacts.length ? run.artifacts.map(id => `<span class="artifact-chip">${esc(id)}</span>`).join('') : '<span class="muted">No artifacts</span>'; const rationale = run.steps.flatMap(step => step.placement ? [`${step.id}: ${step.placement.selected || 'none'} — ${step.placement.reasons.join(', ')}`] : []).join('\n'); return `<div class="run-evidence"><div class="data-card"><label>Artifacts</label><p>${artifacts}</p></div><div class="data-card"><label>Placement rationale</label><p>${esc(rationale || 'Not placed')}</p></div><div class="data-card"><label>Errors</label><p>${esc(run.errors.join(', ') || 'None')}</p></div><div class="data-card"><label>Provenance</label><p>${esc(run.provenance.map(item => `${item.type}: ${item.detail}`).join('\n'))}</p></div></div>`; }
function renderQueue() { const rows = jobState.queue; document.querySelector('#queue-count').textContent = rows.length; document.querySelector('#job-queue').innerHTML = rows.length ? rows.map(item => `<button class="compact-row" data-run="${esc(item.runId)}"><strong>${esc(item.jobId)}</strong><span class="status-pill ${statusClass(item.status)}">${esc(item.status)}</span><small>${esc(item.stepId)} · ${esc(item.reason || 'Ready for dispatch')}</small></button>`).join('') : '<div class="compact-empty">Queue is empty</div>'; bindRuns(); }
function renderRunHistory() { const runs = jobState.runs.slice(0, 12); document.querySelector('#run-history').innerHTML = runs.length ? runs.map(run => `<button class="compact-row" data-run="${esc(run.id)}"><strong>${esc(run.jobId)}</strong><span class="status-pill ${statusClass(run.status)}">${esc(run.status)}</span><small>${esc(new Date(run.requestedAt).toLocaleString())} · ${esc(run.trigger.type)}</small></button>`).join('') : '<div class="compact-empty">No runs recorded</div>'; bindRuns(); }
function bindRuns() { document.querySelectorAll('[data-run]').forEach(button => button.addEventListener('click', () => { const run = jobState.runs.find(item => item.id === button.dataset.run); if (run) { jobState.selectedJob = run.jobId; jobState.selectedRun = run.id; renderJobs(); } })); }
async function jobCommand(url, body) { if (!state.token) { openOperator(); throw new Error('Operator token required'); } const response = await fetch(url, {method: 'POST', headers: {'Content-Type': 'application/json', Authorization: `Bearer ${state.token}`}, body: JSON.stringify({...body, actor: 'web-operator'})}); const result = await response.json(); if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`); toast('Job command accepted'); await refresh(); return result; }

document.addEventListener('DOMContentLoaded', () => { document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => { document.querySelectorAll('[data-view]').forEach(item => item.classList.toggle('active', item === button)); const jobs = button.dataset.view === 'jobs'; document.querySelector('#jobs-workspace').hidden = !jobs; document.querySelector('#lanes-workspace').hidden = jobs; })); });
