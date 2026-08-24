const baseSystemRender = renderSystem;
renderSystem = snapshot => {
  const items = [['Scheduler', snapshot.paused ? 'PAUSED' : 'ACTIVE'], ['Running', snapshot.scheduler.active], ['Waiting', snapshot.scheduler.waiting], ['Next lane', snapshot.scheduler.nextLaneId ?? '--'], ['Approvals', snapshot.outstandingApprovals], ['Resources', snapshot.resources.length]];
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
    const reference = source.url ? `<a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.description)}</a>` : `<span>${esc(source.description)} · ${esc(source.localRef || source.id)}</span>`;
    return `<div class="evidence-row"><span class="evidence-type">${esc(source.type)}</span>${reference}<span class="status-pill">${esc(source.accessibility)}</span></div>`;
  }).join('');
  evidence.insertAdjacentHTML('beforeend', `<h3>Context sources</h3><div class="evidence-list">${sources || '<div class="data-card"><p>No external context source is attached.</p></div>'}</div>`);
};
