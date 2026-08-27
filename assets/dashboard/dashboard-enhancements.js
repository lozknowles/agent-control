const jobState = {jobs: [], runs: [], queue: [], workers: [], resources: [], locks: [], artifacts: [], outputMetrics: null, selectedJob: null, selectedRun: null, search: ''};
const terminalRunStatuses = new Set(['SUCCEEDED', 'FAILED', 'DEGRADED', 'CANCELLED', 'MISSED', 'DISCONNECTED']);
const retryableRunStatuses = new Set(['FAILED', 'DEGRADED', 'CANCELLED', 'DISCONNECTED']);
const baseRefresh = refresh;

refresh = async () => {
  await baseRefresh();
  const endpoints = ['/api/jobs', '/api/runs', '/api/queue', '/api/workers', '/api/resources', '/api/artifacts', '/api/command-output/metrics'];
  const [jobs, runs, queue, workers, locks, artifacts, outputMetrics] = await Promise.all(endpoints.map(async url => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url} ${response.status}`);
    return response.json();
  }));
  Object.assign(jobState, {jobs, runs, queue, workers, resources: state.snapshot?.resources || [], locks, artifacts, outputMetrics});
  if (!jobState.selectedJob && jobs.length) jobState.selectedJob = jobs[0].metadata.id;
  if (jobState.selectedJob && !jobs.some(job => job.metadata.id === jobState.selectedJob)) jobState.selectedJob = jobs[0]?.metadata.id ?? null;
  renderJobs();
};

renderSystem = snapshot => {
  const items = [['Scheduler', snapshot.paused ? 'PAUSED' : 'ACTIVE'], ['Job runs', snapshot.jobs.running], ['Queued', snapshot.jobs.queued], ['Jobs', snapshot.jobs.total], ['Approvals', snapshot.outstandingApprovals], ['Context tokens avoided', snapshot.tokenAwareOutput?.contextTokensAvoided || 0], ['Resources', snapshot.resources.length]];
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
  const sources = lane.contextSources.map(source => {
    const href = safeHref(source.url);
    const reference = href ? `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(source.description)}</a>` : `<span>${esc(source.description)} · ${esc(source.localRef || source.id)}</span>`;
    return `<div class="evidence-row"><span class="evidence-type">${esc(source.type)}</span>${reference}<span class="status-pill">${esc(source.accessibility)}</span></div>`;
  }).join('');
  evidence.insertAdjacentHTML('beforeend', `<h3>Context sources</h3><div class="evidence-list">${sources || '<div class="data-card"><p>No external context source is attached.</p></div>'}</div>`);
};

function safeHref(value) {
  if (!value) return null;
  try { const parsed = new URL(value); return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : null; }
  catch { return null; }
}
function scheduleLabel(job) { return job.schedules.length ? job.schedules.map(item => `${item.spec.cron} ${item.spec.timezone}`).join(' · ') : 'Manual'; }
function statusClass(status) { return ['FAILED', 'DEGRADED', 'DISCONNECTED', 'OFFLINE'].includes(status) ? 'error' : ['BUSY', 'QUEUED', 'WAITING_FOR_WORKER', 'WAITING_FOR_DEPENDENCY', 'WAITING_FOR_RESOURCE', 'WAITING_FOR_APPROVAL', 'RETRY_PENDING'].includes(status) ? 'waiting' : ''; }
function timeLabel(value, fallback = '--') { return value ? new Date(value).toLocaleString() : fallback; }
function durationLabel(start, end) { if (!start) return 'Not started'; const milliseconds = Math.max(0, Date.parse(end || new Date().toISOString()) - Date.parse(start)); return milliseconds < 1000 ? `${milliseconds}ms` : `${Math.round(milliseconds / 1000)}s`; }
function ageLabel(value) { if (!value) return '--'; const seconds = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 1000)); return seconds < 60 ? `${seconds}s` : seconds < 3600 ? `${Math.floor(seconds / 60)}m` : `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`; }

function renderJobs() {
  const jobs = jobState.jobs, selected = jobs.find(job => job.metadata.id === jobState.selectedJob);
  document.querySelector('#job-count').textContent = jobs.length;
  document.querySelector('#job-list').innerHTML = jobs.length ? jobs.map(job => `<button class="job-card ${job.metadata.id === jobState.selectedJob ? 'active' : ''}" data-job="${esc(job.metadata.id)}"><span><strong>${esc(job.metadata.name)}</strong><small>${esc(job.metadata.id)} · v${esc(job.metadata.version)}</small></span><span class="status-pill ${statusClass(job.latestRun?.status)}">${esc(job.latestRun?.status || 'NEVER RUN')}</span><small>${esc(scheduleLabel(job))}</small></button>`).join('') : '<div class="data-card"><p>No Job manifests loaded.</p></div>';
  document.querySelectorAll('[data-job]').forEach(button => button.addEventListener('click', () => { jobState.selectedJob = button.dataset.job; jobState.selectedRun = null; renderJobs(); }));
  renderJobDetail(selected);
  renderQueue();
  renderRunHistory();
  renderManagedNodes();
  renderWorkersAndLocks();
  renderCommandOutputMetrics();
  bindRunLinks();
}

function byteLabel(value) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']; let number = Number(value), unit = 0;
  if (!Number.isFinite(number)) return '--';
  while (number >= 1000 && unit < units.length - 1) { number /= 1000; unit++; }
  return `${number.toFixed(unit > 1 ? 1 : 0)}${units[unit]}`;
}

function uptimeLabel(value) {
  const seconds = Number(value); if (!Number.isFinite(seconds)) return '--';
  const days = Math.floor(seconds / 86400), hours = Math.floor(seconds % 86400 / 3600), minutes = Math.floor(seconds % 3600 / 60);
  return days ? `${days}d ${hours}h` : hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function renderManagedNodes() {
  const rows = jobState.resources.filter(resource => resource.node);
  document.querySelector('#managed-node-list').innerHTML = rows.length ? rows.map(resource => {
    const node = resource.node, memory = node.memory, busiest = [...(node.storage || [])].sort((a, b) => b.usedPercent - a.usedPercent)[0], load = node.cpu?.load;
    const links = (node.connectivity || []).map(item => `${item.label} ${item.state}`).join(', ') || 'not configured';
    return `<div class="compact-row worker-row managed-node-card"><strong>${esc(resource.name)}</strong><span class="status-pill ${statusClass(node.state)}">${esc(node.state)}</span><small>${esc(node.os?.name || resource.platform)} · ${esc(node.os?.kernel || 'kernel unknown')} · uptime ${esc(uptimeLabel(node.uptimeSeconds))}</small><small>Heartbeat ${esc(timeLabel(node.lastHeartbeatAt))} · load ${esc(load ? `${load.one}/${load.five}/${load.fifteen}` : '--')} · memory ${esc(memory ? `${byteLabel(memory.availableBytes)} free / ${byteLabel(memory.totalBytes)}` : '--')}</small><small>Workload ${esc(node.currentWorkload || 'none')} · maintenance ${esc(node.maintenance.state)} · connectivity ${esc(links)}${busiest ? ` · ${esc(busiest.mount)} ${esc(byteLabel(busiest.availableBytes))} free` : ''}</small><small>${esc(node.capabilities.join(', ') || 'No discovered capabilities')}</small></div>`;
  }).join('') : '<div class="compact-empty">No managed nodes configured</div>';
}

function renderJobDetail(job) {
  document.querySelector('#job-empty').hidden = Boolean(job);
  const detail = document.querySelector('#job-detail');
  detail.hidden = !job;
  if (!job) return;
  const selectedRun = jobState.selectedRun ? jobState.runs.find(run => run.id === jobState.selectedRun) : job.latestRun;
  const steps = (selectedRun?.steps || job.spec.steps).map(step => renderStep(step)).join('');
  const schedules = job.schedules.map(schedule => `<div class="schedule-row"><span><strong>${esc(schedule.metadata.name)}</strong><small>${esc(schedule.spec.cron)} · ${esc(schedule.spec.timezone)} · ${esc(schedule.spec.missedRunPolicy)}</small></span><span class="status-pill ${schedule.state?.enabled ? '' : 'neutral'}">${schedule.state?.enabled ? 'ENABLED' : 'DISABLED'}</span><small>Previous ${esc(timeLabel(schedule.state?.previousScheduledAt))} · Next ${esc(timeLabel(schedule.state?.nextScheduledAt))}</small></div>`).join('');
  const nextRun = job.schedules.map(schedule => schedule.state?.nextScheduledAt).filter(Boolean).sort()[0];
  detail.innerHTML = `<div class="authority-note"><strong>3.1 authority boundary</strong><span>The dashboard requests work. Agent Control owns scheduling, policy, placement, approvals and cancellation. Model routing remains separate from worker placement.</span></div><div class="job-header"><div><span class="eyebrow">${esc(job.metadata.id)} · v${esc(job.metadata.version)}</span><h2>${esc(job.metadata.name)}</h2><p>${esc(job.metadata.description || '')}</p></div><span class="status-pill ${job.spec.enabled === false ? 'neutral' : ''}">${job.spec.enabled === false ? 'DISABLED' : 'ENABLED'}</span></div><div class="metrics"><div class="metric"><span>Next run</span><strong>${esc(timeLabel(nextRun, 'Manual / disabled'))}</strong></div><div class="metric"><span>Last run</span><strong>${esc(timeLabel(job.latestRun?.requestedAt, 'Never'))}</strong></div><div class="metric"><span>Priority</span><strong>${esc(job.spec.priority)}</strong></div><div class="metric"><span>Concurrency</span><strong>${esc(job.spec.concurrency)}</strong></div></div><div class="control-strip"><button class="button" id="run-job">Run now</button>${job.schedules.map(schedule => `<button class="button secondary" data-schedule-command="${schedule.state?.enabled ? 'disable' : 'enable'}" data-schedule="${esc(schedule.metadata.id)}">${schedule.state?.enabled ? 'Disable' : 'Enable'} ${esc(schedule.metadata.name)}</button>`).join('')}</div>${schedules ? `<div class="schedule-list">${schedules}</div>` : ''}<div class="job-run-heading"><div><span class="eyebrow">${selectedRun ? `Run ${esc(selectedRun.id)}` : 'Definition'}</span><h3>Steps</h3></div>${selectedRun ? `<small>${esc(selectedRun.trigger.type)} · ${esc(selectedRun.trigger.actor)} · ${esc(durationLabel(selectedRun.startedAt, selectedRun.endedAt))}</small>` : ''}</div><div class="job-steps">${steps}</div>${selectedRun ? renderRunControls(selectedRun) + renderRunEvidence(selectedRun) : ''}`;
  document.querySelector('#run-job').addEventListener('click', () => jobCommand(`/api/jobs/${encodeURIComponent(job.metadata.id)}/run`, {}).catch(showError));
  document.querySelectorAll('[data-schedule]').forEach(button => button.addEventListener('click', () => jobCommand(`/api/schedules/${encodeURIComponent(button.dataset.schedule)}/${button.dataset.scheduleCommand}`, {}).catch(showError)));
  bindRunCommands(selectedRun);
}

function renderStep(step) {
  const attempts = step.attempts?.length ? `${step.attempts.length} attempt${step.attempts.length === 1 ? '' : 's'}` : 'Not attempted';
  const worker = step.placement?.selected || step.attempts?.at(-1)?.workerId || 'Not placed';
  const verification = Array.isArray(step.verification) ? `Verification required: ${step.verification.join(', ') || 'none'}` : step.verification ? `Verification ${step.verification.passed.length}/${step.verification.required.length}` : 'Verification not declared';
  return `<div class="job-step"><span class="step-mark ${statusClass(step.status)}">${esc(step.status === 'SUCCEEDED' ? '✓' : step.status === 'RUNNING' ? '●' : '○')}</span><div><strong>${esc(step.name || step.id)}</strong><small>${esc(step.action)} · worker ${esc(worker)} · ${esc(attempts)} · ${esc(durationLabel(step.startedAt, step.endedAt))}</small><small>${esc(verification)}</small>${step.waitingReason ? `<p>${esc(step.waitingReason)}</p>` : ''}${step.error ? `<p class="error-text">${esc(step.error)}</p>` : ''}</div><span class="status-pill ${statusClass(step.status)}">${esc(step.status || 'DEFINED')}</span></div>`;
}

function renderRunControls(run) {
  const approvals = [...new Set(run.steps.filter(step => step.status === 'WAITING_FOR_APPROVAL' && step.approval).map(step => step.approval))];
  const cancel = terminalRunStatuses.has(run.status) ? '' : '<button class="button danger" data-run-command="cancel">Cancel run</button>';
  const retry = retryableRunStatuses.has(run.status) ? '<button class="button secondary" data-run-command="retry">Retry run</button>' : '';
  const approve = approvals.map(policy => `<button class="button warning" data-run-command="approve" data-policy="${esc(policy)}">Approve ${esc(policy)}</button>`).join('');
  return cancel || retry || approve ? `<div class="control-strip run-controls">${cancel}${retry}${approve}</div>` : '';
}

function bindRunCommands(run) {
  if (!run) return;
  document.querySelectorAll('[data-run-command]').forEach(button => button.addEventListener('click', () => {
    const commandName = button.dataset.runCommand;
    if (commandName === 'cancel' && !confirm(`Cancel ${run.id}?`)) return;
    const body = commandName === 'approve' ? {policy: button.dataset.policy} : {};
    jobCommand(`/api/runs/${encodeURIComponent(run.id)}/${commandName}`, body).catch(showError);
  }));
}

function renderRunEvidence(run) {
  const artifactRows = jobState.artifacts.filter(item => item.runId === run.id);
  const artifacts = artifactRows.length ? artifactRows.map(item => `<div class="artifact-row"><span class="artifact-chip">${esc(item.name)}</span><span>${esc(item.type)} · ${esc(item.schema)} · ${esc(item.size)} bytes</span><code>sha256:${esc(item.sha256)}</code><small>${esc(item.provenance.action)} · ${esc(item.provenance.workerId)} · ${esc(item.retention)}</small></div>`).join('') : '<span class="muted">No artifacts</span>';
  const rationale = run.steps.flatMap(step => step.placement ? [`${step.id}: ${step.placement.selected || 'none'} — ${step.placement.reasons.join(', ')}${step.placement.rejected.length ? `; rejected ${step.placement.rejected.map(item => `${item.workerId} (${item.reasons.join(', ')})`).join('; ')}` : ''}`] : []).join('\n');
  const verification = run.steps.map(step => `${step.id}: ${(step.verification?.passed || []).join(', ') || 'no passing evidence'}${step.verification?.failed.length ? `; failed ${step.verification.failed.join(', ')}` : ''}`).join('\n');
  const provenance = run.provenance.map(item => `${timeLabel(item.at)} · ${item.type}: ${item.detail}`).join('\n');
  return `<div class="run-evidence"><div class="data-card full-width"><label>Artifacts</label><div>${artifacts}</div></div><div class="data-card"><label>Verification</label><p>${esc(verification || 'No verification observations')}</p></div><div class="data-card"><label>Worker placement</label><p>${esc(rationale || 'Not placed')}</p></div><div class="data-card"><label>Errors</label><p>${esc(run.errors.join(', ') || 'None')}</p></div><div class="data-card"><label>Structured log / provenance</label><p>${esc(provenance || 'No events recorded')}</p></div></div>`;
}

function renderQueue() {
  const rows = jobState.queue;
  document.querySelector('#queue-count').textContent = rows.length;
  document.querySelector('#job-queue').innerHTML = rows.length ? rows.map(item => {
    const missing = item.missingCapabilities.length ? `Missing: ${item.missingCapabilities.join(', ')}` : `Eligible: ${item.eligibleWorkers.join(', ') || 'none proven'}`;
    return `<button class="compact-row queue-row" data-run="${esc(item.runId)}"><strong>${esc(item.jobId)} · ${esc(item.priority)}</strong><span class="status-pill ${statusClass(item.status)}">${esc(item.status)}</span><small>${esc(item.stepId)} · age ${esc(ageLabel(item.queuedAt))}</small><small>${esc(item.reason || 'Ready for dispatch')}</small><small>${esc(missing)}</small>${item.scheduledAt ? `<small>Scheduled ${esc(timeLabel(item.scheduledAt))}</small>` : ''}</button>`;
  }).join('') : '<div class="compact-empty">Queue is empty</div>';
}

function renderRunHistory() {
  const query = jobState.search.trim().toLowerCase();
  const runs = jobState.runs.filter(run => !query || [run.id, run.jobId, run.status, run.trigger.type, ...run.selectedWorkers].some(value => String(value).toLowerCase().includes(query))).slice(0, 50);
  document.querySelector('#run-history').innerHTML = runs.length ? runs.map(run => `<button class="compact-row" data-run="${esc(run.id)}"><strong>${esc(run.jobId)}</strong><span class="status-pill ${statusClass(run.status)}">${esc(run.status)}</span><small>${esc(timeLabel(run.requestedAt))} · ${esc(run.trigger.type)} · ${esc(durationLabel(run.startedAt, run.endedAt))}</small><small>Workers: ${esc(run.selectedWorkers.join(', ') || 'none')}</small></button>`).join('') : '<div class="compact-empty">No matching runs</div>';
}

function renderWorkersAndLocks() {
  const workers = jobState.workers;
  document.querySelector('#worker-list').innerHTML = workers.length ? workers.map(worker => `<div class="compact-row worker-row"><strong>${esc(worker.id)}</strong><span class="status-pill ${statusClass(worker.health === 'offline' ? 'FAILED' : worker.health.toUpperCase())}">${esc(worker.health)}</span><small>Capacity ${esc(worker.active)}/${esc(worker.capacity)} · observed ${esc(timeLabel(worker.observedAt))}</small><small>${esc(worker.capabilities.join(', ') || 'No capabilities')}</small></div>`).join('') : '<div class="compact-empty">No workers registered</div>';
  document.querySelector('#resource-locks').innerHTML = jobState.locks.length ? `<span class="subheading">Active resource locks</span>${jobState.locks.map(lock => `<button class="compact-row" data-run="${esc(lock.runId)}"><strong>${esc(lock.resource)}</strong><span class="status-pill waiting">HELD</span><small>${esc(lock.runId)} · step ${esc(lock.stepId)} · since ${esc(timeLabel(lock.acquiredAt))}</small></button>`).join('')}` : '<div class="compact-empty">No resource locks held</div>';
}

function renderCommandOutputMetrics() {
  const metrics = jobState.outputMetrics;
  const element = document.querySelector('#command-output-metrics');
  if (!metrics || !metrics.commandsObserved) { element.innerHTML = '<div class="compact-empty">No command output observed this session</div>'; return; }
  const reduction = metrics.estimatedTokensOriginal ? Math.max(0, Math.round(metrics.contextTokensAvoided / metrics.estimatedTokensOriginal * 100)) : 0;
  element.innerHTML = `<div class="compact-row worker-row"><strong>Context tokens avoided</strong><span class="status-pill">${esc(metrics.contextTokensAvoided)}</span><small>${esc(reduction)}% effective reduction after expansions</small><small>${esc(metrics.commandsCompacted)} compacted / ${esc(metrics.commandsObserved)} observed · ${esc(metrics.expansionRequests)} expansions · ${esc(metrics.fullResultRequests)} full-result requests</small><small>${esc(byteLabel(metrics.originalOutputBytes))} authoritative → ${esc(byteLabel(metrics.returnedOutputBytes))} model-facing</small></div>`;
}

function bindRunLinks() {
  document.querySelectorAll('[data-run]').forEach(button => button.addEventListener('click', () => {
    const run = jobState.runs.find(item => item.id === button.dataset.run);
    if (run) { jobState.selectedJob = run.jobId; jobState.selectedRun = run.id; renderJobs(); }
  }));
}

async function jobCommand(url, body) {
  if (!state.token) { openOperator(); throw new Error('Operator token required'); }
  const response = await fetch(url, {method: 'POST', headers: {'Content-Type': 'application/json', Authorization: `Bearer ${state.token}`}, body: JSON.stringify({...body, actor: 'web-operator'})});
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
  toast('Job command accepted by Agent Control');
  await refresh();
  return result;
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('[data-view]').forEach(item => item.classList.toggle('active', item === button));
    const jobs = button.dataset.view === 'jobs';
    document.querySelector('#jobs-workspace').hidden = !jobs;
    document.querySelector('#lanes-workspace').hidden = jobs;
  }));
  document.querySelector('#run-search').addEventListener('input', event => { jobState.search = event.target.value; renderRunHistory(); bindRunLinks(); });
});
