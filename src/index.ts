import blessed from 'blessed';

type LaneStatus = 'working' | 'idle' | 'waiting' | 'error';

type Lane = {
  id: number;
  name: string;
  task: string;
  model: string;
  reasoning: string;
  context: string;
  status: LaneStatus;
  cwd: string;
  lines: string[];
};

const lanes: Lane[] = [
  {
    id: 1,
    name: 'LocalWalks',
    task: 'Ready for a coding task',
    model: 'Qwen 3.8 27B',
    reasoning: 'medium',
    context: '0',
    status: 'idle',
    cwd: '/fast/repos/LocalWalks',
    lines: ['Agent Control lane created.', 'Waiting for a command…'],
  },
  {
    id: 2,
    name: 'Research',
    task: 'Ready for research',
    model: 'Qwen 3.8 27B',
    reasoning: 'low',
    context: '0',
    status: 'idle',
    cwd: '/fast/research',
    lines: ['Independent transcript and scrollback.', 'Waiting for a command…'],
  },
  {
    id: 3,
    name: 'Systems',
    task: 'Ready for infrastructure work',
    model: 'Qwen 3.8 27B',
    reasoning: 'low',
    context: '0',
    status: 'idle',
    cwd: '~/ops',
    lines: ['System lane ready.', 'Waiting for a command…'],
  },
];

const screen = blessed.screen({ smartCSR: true, fullUnicode: true, title: 'Agent Control' });
let active = 0;
let zoomed = false;

const header = blessed.box({
  top: 0,
  left: 0,
  width: '100%',
  height: 3,
  tags: true,
  border: 'line',
  content: ' {bold}LOCAL AGENT CONTROL{/bold}   {green-fg}multi-lane mission control{/green-fg}',
});
screen.append(header);

const laneBoxes = lanes.map((lane, index) => {
  const box = blessed.box({
    top: 3,
    left: `${index * 33.333}%`,
    width: index === 2 ? '34%' : '33.333%',
    height: '70%-3',
    border: 'line',
    tags: true,
    scrollable: true,
    alwaysScroll: true,
    mouse: true,
    keys: true,
    vi: true,
    scrollbar: { ch: '│', track: { ch: ' ' } },
  });
  screen.append(box);
  return box;
});

const activity = blessed.log({
  top: '70%',
  left: 0,
  width: '67%',
  height: '20%-1',
  border: 'line',
  tags: true,
  scrollable: true,
  mouse: true,
  label: ' AGENT ACTIVITY ',
});
screen.append(activity);

const metrics = blessed.box({
  top: '70%',
  left: '67%',
  width: '33%',
  height: '20%-1',
  border: 'line',
  tags: true,
  label: ' ACTIVE LANE ',
});
screen.append(metrics);

const input = blessed.textbox({
  bottom: 1,
  left: 0,
  width: '100%',
  height: 3,
  border: 'line',
  inputOnFocus: true,
  mouse: true,
  keys: true,
  prompt: '> ',
});
screen.append(input);

const footer = blessed.box({
  bottom: 0,
  left: 0,
  width: '100%',
  height: 1,
  tags: true,
  content: ' Tab lane  PgUp/PgDn scroll  Z zoom  N new  X stop  Enter command  Q quit ',
});
screen.append(footer);

function statusText(status: LaneStatus) {
  if (status === 'working') return '{green-fg}● WORKING{/green-fg}';
  if (status === 'error') return '{red-fg}● ERROR{/red-fg}';
  if (status === 'waiting') return '{yellow-fg}○ WAITING{/yellow-fg}';
  return '{gray-fg}○ IDLE{/gray-fg}';
}

function render() {
  lanes.forEach((lane, i) => {
    const selected = i === active ? '{bold}{cyan-fg}' : '';
    const selectedEnd = i === active ? '{/cyan-fg}{/bold}' : '';
    laneBoxes[i].setLabel(` ${selected}${lane.id} ${lane.name}${selectedEnd} `);
    laneBoxes[i].setContent([
      `${statusText(lane.status)}  ${lane.task}`,
      `{gray-fg}${lane.model} │ ${lane.reasoning} │ ctx ${lane.context}{/gray-fg}`,
      `{gray-fg}${lane.cwd}{/gray-fg}`,
      '',
      ...lane.lines,
      '',
      '{gray-fg}↕ independent scrollback{/gray-fg}',
    ].join('\n'));
  });
  const lane = lanes[active];
  metrics.setContent([
    `{bold}${lane.name}{/bold}`,
    `Status: ${statusText(lane.status)}`,
    `Model: ${lane.model}`,
    `Reasoning: ${lane.reasoning}`,
    `Context: ${lane.context}`,
    `Working dir: ${lane.cwd}`,
  ].join('\n'));
  screen.render();
}

function focusLane(index: number) {
  active = (index + lanes.length) % lanes.length;
  laneBoxes[active].focus();
  render();
}

screen.key(['tab'], () => focusLane(active + 1));
screen.key(['S-tab'], () => focusLane(active - 1));
screen.key(['1', '2', '3'], (_ch, key) => focusLane(Number(key.full) - 1));
screen.key(['q', 'C-c'], () => process.exit(0));

screen.key(['z'], () => {
  zoomed = !zoomed;
  laneBoxes.forEach((box, i) => {
    box.hidden = zoomed && i !== active;
    if (zoomed && i === active) {
      box.top = 3; box.left = 0; box.width = '100%'; box.height = '87%-3';
    } else if (!zoomed) {
      box.top = 3; box.left = `${i * 33.333}%`; box.width = i === 2 ? '34%' : '33.333%'; box.height = '70%-3';
    }
  });
  activity.hidden = zoomed;
  metrics.hidden = zoomed;
  render();
});

screen.key(['i'], () => input.focus());

input.on('submit', (value) => {
  const text = value.trim();
  if (text) {
    const lane = lanes[active];
    lane.lines.push(`{cyan-fg}> ${text}{/cyan-fg}`);
    lane.lines.push('{yellow-fg}[agent adapter not connected yet]{/yellow-fg}');
    lane.task = text;
    lane.status = 'waiting';
    activity.log(`[lane ${lane.id}] ${text}`);
  }
  input.clearValue();
  laneBoxes[active].focus();
  render();
});

laneBoxes.forEach((box, i) => box.on('focus', () => { active = i; render(); }));

render();
focusLane(0);
