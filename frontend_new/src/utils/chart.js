export function drawChart(canvas, data) {
  if (!canvas || !data || data.length === 0) return;

  const ctx = canvas.getContext('2d');
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = 280;

  const w = canvas.width;
  const h = canvas.height;
  const pad = 50;

  ctx.clearRect(0, 0, w, h);

  const prices = data.map((d) => (d.buy_price + d.sell_price) / 2);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  ctx.strokeStyle = '#1f2937';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = pad + ((h - pad * 2) / 5) * i;
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(w - pad, y);
    ctx.stroke();

    const price = max - (range / 5) * i;
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(price.toFixed(4), pad - 8, y + 4);
  }

  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2;
  ctx.beginPath();

  prices.forEach((price, i) => {
    const x = pad + ((w - pad * 2) / (prices.length - 1)) * i;
    const y = pad + (h - pad * 2) - ((price - min) / range) * (h - pad * 2);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });

  ctx.stroke();

  ctx.fillStyle = '#3b82f6';
  prices.forEach((price, i) => {
    const x = pad + ((w - pad * 2) / (prices.length - 1)) * i;
    const y = pad + (h - pad * 2) - ((price - min) / range) * (h - pad * 2);
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
}

export function createChartContainer(code, data, activeDays = 7, onPeriodChange) {
  const container = document.createElement('div');
  container.className = 'chart-wrapper';

  const controls = document.createElement('div');
  controls.className = 'chart-controls';

  const periods = [
    { days: 7, label: 'Tydzień' },
    { days: 30, label: 'Miesiąc' },
    { days: 180, label: 'Pół roku' },
  ];

  periods.forEach(({ days, label }) => {
    const btn = document.createElement('button');
    btn.className = `chart-btn ${days === activeDays ? 'active' : ''}`;
    btn.textContent = label;
    btn.dataset.days = days;

    if (onPeriodChange) {
      btn.onclick = () => onPeriodChange(days);
    }

    controls.appendChild(btn);
  });

  const chartContainer = document.createElement('div');
  chartContainer.className = 'chart-container';

  const canvas = document.createElement('canvas');
  canvas.id = `chart-${code}`;
  chartContainer.appendChild(canvas);

  container.appendChild(controls);
  container.appendChild(chartContainer);

  setTimeout(() => drawChart(canvas, data), 0);

  return container;
}

export function updateChart(code, data) {
  const canvas = document.getElementById(`chart-${code}`);
  if (canvas) {
    drawChart(canvas, data);
  }
}

export function createChartError(message) {
  const error = document.createElement('p');
  error.className = 'chart-error';
  error.textContent = message;
  return error;
}
