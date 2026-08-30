const jobState = {jobs: [], parcels: [], runs: [], queue: [], workers: [], resources: [], locks: [], artifacts: [], outputMetrics: null, efficiencyMetrics: null, invocations: [], selectedJob: null, selectedRun: null, search: ''};
const terminalRunStatuses = new Set(['SUCCEEDED', 'FAILED', 'DEGRADED', 'CANCELLED', 'MISSED', 'DISCONNECTED']);
const retryableRunStatuses = new Set(['FAILED', 'DEGRADED', 'CANCELLED', 'DISCONNECTED']);
const baseRefresh = refresh;

refresh = async () => {
  await baseRefresh();
  const endpoints = ['/api/jobs', '/api/parcels', '/api/runs', '/api/queue', '/api/workers', '/api/resources', '/api/artifacts', '/api/command-output/metrics', '/api/efficiency', '/api/efficiency/invocations?limit=500'];
  const [jobs, parcels, runs, queue, workers, locks, artifacts, outputMetrics, efficiencyMetrics, invocations] = await Promise.all(endpoints.map(async url => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url} ${response.status}`);
    return response.json();
  }));
  Object.assign(jobState, {jobs, parcels, runs, queue, workers, resources: state.snapshot?.resources || [], locks, artifacts, outputMetrics, efficiencyMetrics, invocations});
  if (!jobState.selectedJob && jobs.length) jobState.selectedJob = jobs[0].metadata.id;
  if (jobState.selectedJob && !jobs.some(job => job.metadata.id === jobState.selectedJob)) jobState.selectedJob = jobs[0]?.metadata.id ?? null;
  renderJobs();
};

renderSystem = snapshot => {
  const items = [['Scheduler', snapshot.paused ? 'PAUSED' : 'ACTIVE'], ['Job runs', snapshot.jobs.running], ['Waiting', snapshot.jobs.waiting], ['Queued', snapshot.jobs.queued], ['Jobs', snapshot.jobs.total], ['Approvals', snapshot.outstandingApprovals], ['Context tokens avoided', snapshot.tokenAwareOutput?.contextTokensAvoided || 0], ['Resources', snapshot.resources.length]];
  document.querySelector('#system-summary').innerHTML = `<div class="summary-grid">${items.map(([label, value]) => `<div class="summary-item"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join('')}</div>`;
};

const baseLaneRender = renderLane;
renderLane = lane => {
  baseLaneRender(lane);
  if (!lane) return;
  const laneDetail = document.querySelector('#lane-detail');
  const laneLiveness = window.AgentControlRunningState.liveness(lane.status === 'working' ? 'RUNNING' : lane.status.toUpperCase(), lane.lastMeaningfulActivity);
  if (lane.status === 'working') {
    const model = lane.model && lane.model !== 'unassigned' ? lane.model : 'Planner selecting route';
    const target = lane.executionTarget || lane.ptys?.[0]?.owner || 'Execution node not yet reported';
    laneDetail.insertAdjacentHTML('afterbegin', `<section class="lane-live is-running ${laneLiveness.stale ? 'is-stale' : ''}" aria-live="polite"><span class="activity-pulse" aria-hidden="true"></span><span><strong>RUNNING · ${esc(model)}</strong><small>${esc(target)} · ${esc(lane.routeReason || 'Routing rationale not reported')}</small></span><span class="running-time"><b>${esc(lane.elapsedMs ? durationLabel(new Date(Date.now() - lane.elapsedMs).toISOString()) : 'Starting')}</b><small>${esc(laneLiveness.label)}</small></span></section>`);
  }
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
function statusClass(status) { return status === 'RUNNING' ? 'running' : ['FAILED', 'DEGRADED', 'DISCONNECTED', 'OFFLINE'].includes(status) ? 'error' : ['BUSY', 'QUEUED', 'WAITING', 'WAITING_FOR_WORKER', 'WAITING_FOR_DEPENDENCY', 'WAITING_FOR_RESOURCE', 'WAITING_FOR_APPROVAL', 'RETRY_PENDING'].includes(status) ? 'waiting' : ''; }
function timeLabel(value, fallback = '--') { return value ? new Date(value).toLocaleString() : fallback; }
function durationLabel(start, end) { if (!start) return 'Not started'; const milliseconds = Math.max(0, Date.parse(end || new Date().toISOString()) - Date.parse(start)); return milliseconds < 1000 ? `${milliseconds}ms` : `${Math.round(milliseconds / 1000)}s`; }
function ageLabel(value) { if (!value) return '--'; const seconds = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 1000)); return seconds < 60 ? `${seconds}s` : seconds < 3600 ? `${Math.floor(seconds / 60)}m` : `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`; }
function durationMarkup(start, end, live) { const label = esc(durationLabel(start, end)); return live ? `<span data-live-start="${esc(start)}">${label}</span>` : label; }
function runningClass(run) { if (run?.status !== 'RUNNING') return ''; return `is-running${window.AgentControlRunningState.liveness(run.status, run.updatedAt || run.requestedAt).stale ? ' is-stale' : ''}`; }

function renderParcelLive(parcel, activeStage) {
  if (!activeStage || !['RUNNING', 'WAITING'].includes(parcel.status)) return '';
  const runningState = window.AgentControlRunningState, rollup = runningState.rollup(parcel.stages), liveness = runningState.liveness(parcel.status, parcel.updatedAt);
  const run = activeStage.runId ? jobState.runs.find(item => item.id === activeStage.runId) : undefined;
  const currentStep = run?.steps.find(step => ['RUNNING', 'WAITING_FOR_WORKER', 'WAITING_FOR_DEPENDENCY', 'WAITING_FOR_RESOURCE', 'WAITING_FOR_APPROVAL', 'RETRY_PENDING'].includes(step.status)) || run?.steps.at(-1);
  const invocation = run ? jobState.invocations.filter(item => item.runId === run.id).at(-1) : undefined;
  const latestEvents = [...parcel.provenance.map(item => ({...item, source: 'parcel'})), ...(run?.provenance || []).map(item => ({...item, source: 'run'}))].sort((a, b) => Date.parse(a.at) - Date.parse(b.at)).slice(-4);
  const latest = latestEvents.at(-1), nextStage = parcel.stages[parcel.stages.indexOf(activeStage) + 1], requested = activeStage.requestedRoute;
  const route = activeStage.actualRoute, worker = route?.workers.join(', ') || run?.selectedWorkers.join(', ') || 'Not reported';
  const provider = invocation?.provider || (route ? route.provider || 'Control action' : 'Not reported'), model = invocation?.model || (route ? route.model || 'No model' : 'Not reported'), profile = invocation?.harnessProfile || (route ? route.profile || 'Control action' : requested?.profile || 'Not reported');
  const attempt = currentStep?.attempts?.length ? `${currentStep.attempts.length}` : 'Not reported';
  const verification = currentStep?.verification ? `${currentStep.verification.passed.length}/${currentStep.verification.required.length} checks passed${currentStep.verification.failed.length ? ` · ${currentStep.verification.failed.length} failed` : ''}` : 'Not reported';
  const baton = activeStage.dependsOn.length ? activeStage.dependsOn.every(id => parcel.stages.find(stage => stage.id === id)?.baton) ? 'Received from every predecessor' : 'Awaiting predecessor baton' : 'No predecessor required';
  const usage = runningState.usage(parcel.telemetry), currentActivity = currentStep?.waitingReason || activeStage.waitingReason || currentStep?.action || latest?.detail || 'Execution active; finer activity not reported';
  const requestedRoute = requested ? `${requested.provider || 'policy-selected provider'} / ${requested.model || 'policy-selected model'} / ${requested.profile || 'policy-selected profile'}` : 'Normal Agent Control routing policy';
  const why = [parcel.audit?.planningRationale, requested?.reason].filter(Boolean).join(' · ') || 'No concise routing rationale reported';
  const detailRows = [['Parcel', parcel.id], ['Stage', activeStage.name], ['Job', activeStage.job], ['Run ID', activeStage.runId || 'Not reported'], ['Current state', activeStage.status], ['Current action / latest event', currentActivity], ['Node / machine', worker], ['Requested route', requestedRoute], ['Actual provider', provider], ['Model', model], ['Profile', profile], ['Attempt / retry', attempt], ['Why this route/model?', why], ['Started', timeLabel(activeStage.startedAt)], ['Last state transition', timeLabel(latest?.at)], ['Verification', verification], ['Baton', baton], ['Next stage', nextStage ? `${nextStage.name} · after ${activeStage.name} succeeds` : 'Final stage'], ['Usage', usage.label]];
  const tooltip = detailRows.slice(0, 12).map(([label, value]) => `<span><b>${esc(label)}</b>${esc(value)}</span>`).join('');
  const chain = rollup.stages.map((stage, index) => `<li class="rollup-${esc(stage.status.toLowerCase())}"><span>${stage.active ? '●' : stage.status === 'SUCCEEDED' ? '✓' : stage.blocked ? '×' : '○'}</span><strong>${esc(`${index + 1}. ${stage.name}`)}</strong><small>${esc(stage.status)}${stage.waiting ? ' · dependency not yet complete' : stage.blocked ? ' · dependency failed' : ''}</small></li>`).join('');
  const events = latestEvents.length ? latestEvents.map(item => `<li><time>${esc(new Date(item.at).toLocaleTimeString())}</time><span>${esc(item.type)} · ${esc(item.detail)}</span></li>`).join('') : '<li><span>No execution event reported yet</span></li>';
  const expanded = detailRows.map(([label, value]) => `<div><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join('');
  const drill = run ? `<button type="button" class="button secondary" data-run="${esc(run.id)}">Inspect authoritative Job / Run / evidence</button>` : '';
  return `<section class="parcel-live ${parcel.status === 'RUNNING' ? 'is-running' : 'is-waiting'} ${liveness.stale ? 'is-stale' : ''}" aria-live="polite"><details class="running-inspector"><summary class="running-summary"><span class="activity-pulse" aria-hidden="true"></span><span><strong>${esc(parcel.status)} · ${rollup.position ? `Stage ${rollup.position} of ${rollup.total}` : activeStage.status}</strong><small>${esc(activeStage.name)} · ${esc(provider === 'Not reported' && activeStage.status === 'RUNNING' ? 'Control action or route not yet reported' : `${provider} · ${model}`)}</small></span><span class="running-time"><b data-live-start="${esc(activeStage.startedAt || parcel.createdAt)}">${esc(durationLabel(activeStage.startedAt || parcel.createdAt))}</b><small data-live-liveness="${esc(parcel.updatedAt)}" data-live-state="${esc(parcel.status)}">${esc(liveness.label)}</small></span><span class="running-popover" role="tooltip"><b>Current activity</b>${tooltip}<em>Press Enter or click to expand authoritative detail.</em></span></summary><div class="running-expanded"><div class="running-route">${esc(provider)} → ${esc(model)} · ${esc(profile)}<small>${esc(usage.label)}</small></div><div class="routing-why"><span class="eyebrow">Why this model / route?</span><p>${esc(why)}</p></div><div class="running-detail-grid">${expanded}</div><div class="running-drill"><div><span class="eyebrow">Parcel chain</span><ol>${chain}</ol></div><div><span class="eyebrow">Latest actual events</span><ol class="running-events">${events}</ol></div></div>${drill}</div></details></section>`;
}

function renderParcelAudit(parcel) {
  const audit = parcel.audit; if (!audit) return '';
  const totals = audit.totals, cost = totals.cost === null ? 'Unavailable' : `${totals.currency || ''} ${totals.cost} (${totals.costBasis})`.trim();
  const plan = parcel.stages.map((stage, index) => `<li><strong>${index + 1}. ${esc(stage.name)}</strong><span>${esc(stage.job)} · depends on ${esc(stage.dependsOn.join(', ') || 'nothing')}</span><span>Requested: ${esc(stage.requestedRoute ? `${stage.requestedRoute.provider || 'policy'} / ${stage.requestedRoute.model || 'policy'} / ${stage.requestedRoute.profile || 'policy'}` : 'normal policy')}</span><span>Actual: ${esc(stage.actualRoute ? `${stage.actualRoute.provider || 'no model'} / ${stage.actualRoute.model || 'no model'} / ${stage.actualRoute.profile || 'control action'} · ${stage.actualRoute.workers.join(', ') || 'no worker'}` : 'Not reported')}</span></li>`).join('');
  const alternatives = audit.alternatives.length ? audit.alternatives.map(item => `<li><strong>${esc(item.candidate)}</strong><span>${item.eligible ? 'eligible' : 'rejected'} · ${esc(item.reasons.join(', ') || 'no reason reported')}</span></li>`).join('') : '<li><span>No candidate alternatives were reported at decision time.</span></li>';
  const timeline = audit.timeline.map(item => `<li><time>${esc(new Date(item.at).toLocaleTimeString())}</time><strong>${esc(item.summary)}</strong><span>${esc(item.detail)}</span></li>`).join('');
  const invocations = audit.invocations.length ? audit.invocations.map(item => `<tr><td>${esc(item.provider)}<br><small>${esc(item.route)}</small></td><td>${esc(item.model)}<br><small>${esc(item.profile)}</small></td><td>${esc(item.node ?? 'Not reported')}</td><td>${esc(item.freshInputTokens ?? 'Not reported')} / ${esc(item.cachedInputTokens ?? 'Not reported')}</td><td>${esc(item.outputTokens ?? 'Not reported')} / ${esc(item.reasoningTokens ?? 'Not reported')}</td><td>${esc(item.totalTokens ?? 'Not reported')}</td><td>${esc(item.providerReportedCost ?? item.calculatedCost ?? 'Not reported')}<br><small>${esc(item.costBasis)}</small></td><td>${esc(durationLabel(item.startedAt, item.completedAt))}</td></tr>`).join('') : '<tr><td colspan="8">No model invocation recorded. Deterministic control actions consume no model tokens.</td></tr>';
  return `<details class="parcel-audit"><summary><span>Audit</span><small>WHAT · WHY · WHO · COST</small></summary><div class="audit-body"><section><span class="eyebrow">What did I ask?</span><p>${esc(parcel.prompt)}</p></section><section><span class="eyebrow">Plan and rationale</span><p>${esc(audit.classification)} · ${esc(audit.planningRationale)}</p><ol class="audit-plan">${plan}</ol></section><section><span class="eyebrow">Resources considered at decision time</span><ul class="audit-alternatives">${alternatives}</ul></section><section><span class="eyebrow">Routing and execution timeline</span><ol class="audit-timeline">${timeline}</ol></section><section><span class="eyebrow">Invocation → Job → Stage → Parcel accounting</span><div class="audit-table-wrap"><table><thead><tr><th>Provider / route</th><th>Model / profile</th><th>Node</th><th>Input / cached</th><th>Output / reasoning</th><th>Total</th><th>Cost</th><th>Model time</th></tr></thead><tbody>${invocations}</tbody></table></div><p class="audit-total">${esc(totals.models.length ? totals.models.join(', ') : 'No model')} · ${esc(totals.invocations)} invocation(s) · ${esc(totals.totalTokens ?? 'tokens unavailable')} · ${esc(cost)} · model ${esc(durationLabel(parcel.createdAt, new Date(Date.parse(parcel.createdAt) + totals.modelExecutionMs).toISOString()))} · wall ${esc(durationLabel(parcel.createdAt, parcel.endedAt))}</p></section><section><span class="eyebrow">Final state and verification</span><p>${esc(parcel.status)} · ${esc(parcel.decision?.summary || 'Execution still active')}</p></section></div></details>`;
}

function renderWorkflowPreview(job) {
  const parameters = Object.entries(job.spec.parameters || {}).map(([name, definition]) => `${name}: ${definition.type}${definition.required ? ' · required' : ''}${definition.default === undefined ? '' : ` · default ${definition.default}`}`);
  const steps = job.spec.steps.map((step, index) => `<li><span>${index + 1}</span><div><strong>${esc(step.name || step.id)}</strong><small>${esc(step.action)} · requires ${esc(step.requires.join(', ') || 'no capabilities')}</small><small>Verification: ${esc(step.verification?.join(', ') || 'none declared')}</small></div></li>`).join('');
  return `<section class="workflow-preview" aria-label="Selected workflow details"><p>${esc(job.metadata.description || 'No workflow description supplied.')}</p><div class="workflow-preview-facts"><span><b>Version</b>${esc(job.metadata.version)}</span><span><b>Schedule</b>${esc(scheduleLabel(job))}</span><span><b>Priority</b>${esc(job.spec.priority)}</span><span><b>Concurrency</b>${esc(job.spec.concurrency)}</span></div><span class="eyebrow">Steps</span><ol>${steps}</ol><span class="eyebrow">Parameters</span><p class="workflow-parameters">${esc(parameters.join(' · ') || 'No parameters')}</p><small class="workflow-preview-hint">The full definition, Run controls, history, evidence and artifacts are open in the main pane.</small></section>`;
}

function renderJobs() {
  const jobs = jobState.jobs, selected = jobs.find(job => job.metadata.id === jobState.selectedJob);
  document.querySelector('#job-count').textContent = jobs.length;
  document.querySelector('#job-list').innerHTML = jobs.length ? jobs.map(job => { const isSelected = job.metadata.id === jobState.selectedJob; return `<div class="workflow-catalog-item ${isSelected ? 'selected' : ''}"><button class="job-card ${isSelected ? 'active' : ''} ${runningClass(job.latestRun)}" data-job="${esc(job.metadata.id)}" aria-expanded="${isSelected}"><span><strong>${esc(job.metadata.name)}</strong><small>${esc(job.metadata.id)} · v${esc(job.metadata.version)}</small></span><span class="status-pill ${statusClass(job.latestRun?.status)}">${esc(job.latestRun?.status || 'NEVER RUN')}</span><small>${esc(scheduleLabel(job))}</small><span class="workflow-disclosure" aria-hidden="true">${isSelected ? '−' : '+'}</span></button>${isSelected ? renderWorkflowPreview(job) : ''}</div>`; }).join('') : '<div class="data-card"><p>No Job manifests loaded.</p></div>';
  document.querySelectorAll('[data-job]').forEach(button => button.addEventListener('click', () => { jobState.selectedJob = button.dataset.job; jobState.selectedRun = null; renderJobs(); }));
  renderJobDetail(selected);
  renderQueue();
  renderRunHistory();
  renderManagedNodes();
  renderWorkersAndLocks();
  renderCommandOutputMetrics();
  renderHarnessEfficiencyMetrics();
  renderParcels();
  bindRunLinks();
}

function renderParcels() {
  document.querySelector('#parcel-count').textContent = jobState.parcels.length;
  document.querySelector('#parcel-list').innerHTML = jobState.parcels.length ? jobState.parcels.map(parcel => {
    const t = parcel.telemetry, activeStage = parcel.stages.find(stage => ['RUNNING', 'WAITING'].includes(stage.status));
    const stages = parcel.stages.map(stage => `<div class="parcel-stage ${stage.status === 'BLOCKED' ? 'parcel-blocked' : ''} ${stage.status === 'RUNNING' ? 'is-running' : ''}"><strong>${esc(stage.name)}</strong><span class="status-pill ${statusClass(stage.status)}">${esc(stage.status)}</span><small>${esc(stage.job)} · depends on ${esc(stage.dependsOn.join(', ') || 'nothing')}</small><small class="parcel-route">requested ${esc(stage.requestedRoute ? `${stage.requestedRoute.provider || 'policy'} / ${stage.requestedRoute.model || 'policy'} / ${stage.requestedRoute.profile || 'policy'} — ${stage.requestedRoute.reason}` : 'normal policy')}<br>actual ${esc(stage.actualRoute ? `${stage.actualRoute.provider || 'no model'} / ${stage.actualRoute.model || 'no model'} / ${stage.actualRoute.profile || 'control action'} · workers ${stage.actualRoute.workers.join(', ') || 'none'} — ${stage.actualRoute.reason}` : 'waiting for execution')}</small>${stage.waitingReason || stage.error ? `<small>${esc(stage.waitingReason || stage.error)}</small>` : ''}</div>`).join('');
    const live = renderParcelLive(parcel, activeStage);
    const decision = parcel.decision ? `<section class="parcel-decision ${parcel.decision.outcome === 'FAIL_CLOSED' ? 'decision-failed' : ''}"><div><span class="eyebrow">Agent Control decision</span><strong>${esc(parcel.decision.title)}</strong></div><span class="status-pill ${parcel.decision.outcome === 'FAIL_CLOSED' ? 'error' : ''}">${esc(parcel.decision.outcome)}</span><p>${esc(parcel.decision.summary)}</p><ul>${parcel.decision.evidence.map(item => `<li>${esc(item)}</li>`).join('')}</ul>${parcel.decision.blockedStages.length ? `<small>Not dispatched: ${esc(parcel.decision.blockedStages.join(' · '))}</small>` : ''}<small>Authority: ${esc(parcel.decision.authority)} · no external harness interpretation required</small></section>` : '';
    const totals = parcel.audit?.totals;
    const summary = totals ? `<div class="parcel-cost-summary"><span>${esc(totals.models.length ? totals.models.join(', ') : 'Control action · no model')}</span><span>${esc(totals.invocations)} invocation${totals.invocations === 1 ? '' : 's'}</span><span>${esc(totals.totalTokens ?? 'tokens unavailable')}</span><span>${esc(totals.cost === null ? 'cost unavailable' : `${totals.currency || ''} ${totals.cost}`.trim())}</span><span>${esc(durationLabel(parcel.createdAt, parcel.endedAt))} wall</span></div>` : '';
    return `<article class="parcel-card ${parcel.status === 'RUNNING' ? 'is-running' : ''}"><div class="parcel-head"><strong>${esc(parcel.objective)}</strong><span class="status-pill ${statusClass(parcel.status)}">${esc(parcel.status)}</span><p>${esc(parcel.prompt)}</p></div><div class="parcel-metrics"><span>${esc(parcel.planner.kind)} planner</span><span>${esc(durationLabel(parcel.createdAt, parcel.endedAt))}</span><span>tokens ${esc(t.totalTokens ?? 'unavailable')}</span><span>cost ${esc(t.cost === null ? 'unavailable' : `${t.currency || ''} ${t.cost}`.trim())}</span></div>${summary}${live}${decision}${stages}${renderParcelAudit(parcel)}</article>`;
  }).join('') : '<div class="compact-empty">No natural-language work submitted yet.</div>';
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
  detail.innerHTML = `<div class="authority-note"><strong>3.3 authority boundary</strong><span>The dashboard requests work. Agent Control owns scheduling, policy, placement, approvals and cancellation. Model routing remains separate from worker placement.</span></div><div class="job-header"><div><span class="eyebrow">${esc(job.metadata.id)} · v${esc(job.metadata.version)}</span><h2>${esc(job.metadata.name)}</h2><p>${esc(job.metadata.description || '')}</p></div><span class="status-pill ${job.spec.enabled === false ? 'neutral' : ''}">${job.spec.enabled === false ? 'DISABLED' : 'ENABLED'}</span></div><div class="metrics"><div class="metric"><span>Next run</span><strong>${esc(timeLabel(nextRun, 'Manual / disabled'))}</strong></div><div class="metric"><span>Last run</span><strong>${esc(timeLabel(job.latestRun?.requestedAt, 'Never'))}</strong></div><div class="metric"><span>Priority</span><strong>${esc(job.spec.priority)}</strong></div><div class="metric"><span>Concurrency</span><strong>${esc(job.spec.concurrency)}</strong></div></div>${selectedRun ? renderRunEfficiency(selectedRun) : ''}<form id="run-parameters" class="data-grid">${Object.entries(job.spec.parameters || {}).map(([name, definition]) => renderParameterField(name, definition)).join('')}</form><div class="control-strip"><button class="button" id="run-job">Run now</button>${job.schedules.map(schedule => `<button class="button secondary" data-schedule-command="${schedule.state?.enabled ? 'disable' : 'enable'}" data-schedule="${esc(schedule.metadata.id)}">${schedule.state?.enabled ? 'Disable' : 'Enable'} ${esc(schedule.metadata.name)}</button>`).join('')}</div>${schedules ? `<div class="schedule-list">${schedules}</div>` : ''}<div class="job-run-heading"><div><span class="eyebrow">${selectedRun ? `Run ${esc(selectedRun.id)}` : 'Definition'}</span><h3>Steps</h3></div>${selectedRun ? `<small>${esc(selectedRun.trigger.type)} · ${esc(selectedRun.trigger.actor)} · ${esc(durationLabel(selectedRun.startedAt, selectedRun.endedAt))}</small>` : ''}</div><div class="job-steps">${steps}</div>${selectedRun ? renderRunControls(selectedRun) + renderRunEvidence(selectedRun) : ''}`;
  document.querySelector('#run-job').addEventListener('click', () => { const form = document.querySelector('#run-parameters'); if (!form.reportValidity()) return; let parameters; try { parameters = window.AgentControlDashboardParameters.collect(job.spec.parameters || {}, form); } catch (error) { showError(error); return; } jobCommand(`/api/jobs/${encodeURIComponent(job.metadata.id)}/run`, {parameters}).catch(showError); });
  document.querySelectorAll('[data-schedule]').forEach(button => button.addEventListener('click', () => jobCommand(`/api/schedules/${encodeURIComponent(button.dataset.schedule)}/${button.dataset.scheduleCommand}`, {}).catch(showError)));
  bindRunCommands(selectedRun);
}

function renderParameterField(name, definition) {
  const required = definition.required ? ' required' : '', limits = `${definition.minimum === undefined ? '' : ` min="${esc(definition.minimum)}"`}${definition.maximum === undefined ? '' : ` max="${esc(definition.maximum)}"`}`;
  if (definition.type === 'boolean') return `<label class="data-card"><span>${esc(name)}</span><input type="checkbox" data-job-parameter="${esc(name)}"${definition.default ? ' checked' : ''}></label>`;
  if (definition.enum) return `<label class="data-card"><span>${esc(name)}</span><select data-job-parameter="${esc(name)}"${required}>${definition.enum.map(value => `<option value="${esc(value)}"${Object.is(value, definition.default) ? ' selected' : ''}>${esc(value)}</option>`).join('')}</select></label>`;
  const numeric = ['integer', 'number'].includes(definition.type), value = definition.default === undefined ? '' : definition.default;
  return `<label class="data-card"><span>${esc(name)}</span><input type="${numeric ? 'number' : 'text'}"${numeric ? ` step="${definition.type === 'integer' ? '1' : 'any'}"` : ''}${limits} value="${esc(value)}" data-job-parameter="${esc(name)}"${required}></label>`;
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
  document.querySelector('#run-history').innerHTML = runs.length ? runs.map(run => `<button class="compact-row ${runningClass(run)}" data-run="${esc(run.id)}"><strong>${esc(run.jobId)}</strong><span class="status-pill ${statusClass(run.status)}">${esc(run.status)}</span><small>${esc(timeLabel(run.requestedAt))} · ${esc(run.trigger.type)} · ${durationMarkup(run.startedAt || run.requestedAt, run.endedAt, run.status === 'RUNNING')}</small><small>Workers: ${esc(run.selectedWorkers.join(', ') || 'none')}</small></button>`).join('') : '<div class="compact-empty">No matching runs</div>';
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

function renderRunEfficiency(run) {
  const values = jobState.invocations.filter(item => item.runId === run.id || item.jobId === run.id);
  const latest = values.at(-1), known = selector => values.length > 0 && values.every(item => selector(item) !== null), sum = selector => values.reduce((total, item) => total + (selector(item) || 0), 0);
  const fresh = known(item => item.usage.freshInputTokens) ? sum(item => item.usage.freshInputTokens) : null, cached = known(item => item.usage.cachedInputTokens) ? sum(item => item.usage.cachedInputTokens) : null, output = known(item => item.usage.outputTokens) ? sum(item => item.usage.outputTokens) : null;
  const reasoning = known(item => item.usage.reasoningTokens) ? sum(item => item.usage.reasoningTokens) : null, total = known(item => item.usage.totalProcessedTokens) ? sum(item => item.usage.totalProcessedTokens) : null;
  const cost = values.length > 0 && values.every(item => item.providerReportedCost !== null) ? sum(item => item.providerReportedCost) : values.length > 0 && values.every(item => item.calculatedCost !== null) ? sum(item => item.calculatedCost) : null;
  const activeStep = run.steps.find(step => !['SUCCEEDED', 'FAILED', 'CANCELLED'].includes(step.status)) || run.steps.at(-1), stage = activeStep?.status || run.status;
  const verification = activeStep?.verification ? `${activeStep.verification.passed.length}/${activeStep.verification.required.length} passed${activeStep.verification.failed.length ? ` · ${activeStep.verification.failed.length} failed` : ''}` : 'Unavailable';
  const liveness = window.AgentControlRunningState.liveness(run.status, run.updatedAt || run.requestedAt);
  const route = executionRouteSummary(activeStep);
  return `<div class="metrics active-run-telemetry ${runningClass(run)}"><div class="metric"><span>Stage</span><strong>${run.status === 'RUNNING' ? '<span class="activity-pulse" aria-hidden="true"></span> ' : ''}${esc(stage)}</strong></div><div class="metric"><span>Provider / model</span><strong>${esc(latest ? `${latest.provider} / ${latest.model}` : route.provider)}</strong></div><div class="metric"><span>Capability / route</span><strong>${esc(route.capability)}</strong></div><div class="metric"><span>Node / transport</span><strong>${esc(`${route.node} / ${route.transport}`)}</strong></div><div class="metric"><span>Engine</span><strong>${esc(route.engine)}</strong></div><div class="metric"><span>Routing reason</span><strong>${esc(activeStep?.placement?.reasons?.join(', ') || 'Awaiting placement')}</strong></div><div class="metric"><span>Elapsed</span><strong>${durationMarkup(run.startedAt || run.requestedAt, run.endedAt, run.status === 'RUNNING')}</strong></div><div class="metric"><span>Last meaningful activity</span><strong>${terminalRunStatuses.has(run.status) ? esc(ageLabel(run.updatedAt || run.requestedAt)) + ' ago at completion' : `<span data-live-liveness="${esc(run.updatedAt || run.requestedAt)}" data-live-state="${esc(run.status)}">${esc(liveness.label)}</span>`}</strong></div><div class="metric"><span>Input fresh / cached</span><strong>${esc(fresh ?? 'Unavailable')} / ${esc(cached ?? 'Unavailable')}</strong></div><div class="metric"><span>Output / reasoning / total</span><strong>${esc(output ?? 'Unavailable')} / ${esc(reasoning ?? 'Unavailable')} / ${esc(total ?? 'Unavailable')}</strong></div><div class="metric"><span>Accumulated cost</span><strong>${esc(cost === null ? 'Unavailable' : `${latest?.currency || ''} ${cost}`.trim())}</strong></div><div class="metric"><span>Verification</span><strong>${esc(latest?.verifierResult || verification)}</strong></div></div>`;
}

function executionRouteSummary(step) {
  const required = step?.capabilityRequest?.requires?.map(item => item.id) || [], capability = required.find(item => item.startsWith('chatgpt.')) || required.find(item => item.startsWith('browser.')) || 'Control action';
  if (capability === 'chatgpt.web') return {provider:'ChatGPT',capability,node:step?.placement?.selected || 'Awaiting placement',transport:'authenticated browser',engine:'Edge / approved bridge'};
  if (capability === 'chatgpt.android') return {provider:'ChatGPT',capability,node:step?.placement?.selected || 'Awaiting placement',transport:'authorised Android UI',engine:'Android UI'};
  if (capability.startsWith('browser.')) return {provider:'Browser worker · no model',capability,node:step?.placement?.selected || 'Awaiting placement',transport:'local browser process',engine:'Chromium/Playwright'};
  return {provider:'Unavailable until provider reports',capability,node:step?.placement?.selected || 'Awaiting placement',transport:'Not reported',engine:'Not reported'};
}

function renderHarnessEfficiencyMetrics() {
  const element = document.querySelector('#harness-efficiency-metrics'), metrics = jobState.efficiencyMetrics, overall = metrics?.overall;
  if (!overall?.invocations) { element.innerHTML = '<div class="compact-empty">No model invocation telemetry recorded</div>'; return; }
  const cache = overall.cacheEffectiveness === null ? 'unknown' : `${Math.round(overall.cacheEffectiveness * 100)}%`;
  const cpvo = overall.costPerVerifiedOutcome === null ? 'unknown' : `${overall.currency || ''} ${overall.costPerVerifiedOutcome.toFixed(4)}`.trim();
  element.innerHTML = `<div class="compact-row worker-row"><strong>Cost per verified outcome</strong><span class="status-pill">${esc(cpvo)}</span><small>${esc(overall.verifiedSuccesses)} verified successes / ${esc(overall.jobs)} jobs · ${esc(overall.modelTurns)} turns</small><small>Fresh ${esc(overall.freshInputTokens ?? 'unknown')} · cached ${esc(overall.cachedInputTokens ?? 'unknown')} · output ${esc(overall.outputTokens ?? 'unknown')}</small><small>Cache effectiveness ${esc(cache)} · escalation ${esc(metrics.escalationRate === null ? 'unknown' : `${Math.round(metrics.escalationRate * 100)}%`)}</small></div>`;
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
  document.querySelector('#natural-task-form').addEventListener('submit', event => { event.preventDefault(); const prompt = document.querySelector('#natural-task-prompt').value; jobCommand('/api/parcels', {prompt}).then(() => { document.querySelector('#natural-task-prompt').value = ''; }).catch(showError); });
  document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('[data-view]').forEach(item => item.classList.toggle('active', item === button));
    const jobs = button.dataset.view === 'jobs';
    document.querySelector('#jobs-workspace').hidden = !jobs;
    document.querySelector('#lanes-workspace').hidden = jobs;
  }));
  document.querySelector('#run-search').addEventListener('input', event => { jobState.search = event.target.value; renderRunHistory(); bindRunLinks(); });
  setInterval(() => { document.querySelectorAll('[data-live-start]').forEach(node => { node.textContent = durationLabel(node.dataset.liveStart); }); document.querySelectorAll('[data-live-activity]').forEach(node => { node.textContent = `${ageLabel(node.dataset.liveActivity)} ago`; }); document.querySelectorAll('[data-live-liveness]').forEach(node => { const live = window.AgentControlRunningState.liveness(node.dataset.liveState, node.dataset.liveLiveness); node.textContent = live.label; node.closest('.parcel-live, .active-run-telemetry')?.classList.toggle('is-stale', live.stale); }); }, 1000);
  setInterval(() => refresh().catch(showError), 5000);
});
