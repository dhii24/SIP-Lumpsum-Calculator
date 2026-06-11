// ─────────────────────────────────────────────
//  STATE
// ─────────────────────────────────────────────
let currentMode = "sip"; // 'sip' | 'lump'

// ─────────────────────────────────────────────
//  MODE SWITCH
// ─────────────────────────────────────────────
function setMode(mode) {
  currentMode = mode;

  // Toggle active button style
  document.getElementById("btn-sip").classList.toggle("active", mode === "sip");
  document.getElementById("btn-lump").classList.toggle("active", mode === "lump");

  // Show/hide relevant slider
  document.getElementById("grp-monthly").style.display =
    mode === "sip" ? "" : "none";
  document.getElementById("grp-lump").style.display =
    mode === "lump" ? "" : "none";

  calculate();
}

// ─────────────────────────────────────────────
//  CORE MATH
// ─────────────────────────────────────────────

// SIP formula: FV = P × [((1 + r)^n - 1) / r] × (1 + r)
// where r = monthly rate, n = total months
function calcSIP(monthly, annualRate, years) {
  const r = annualRate / 100 / 12; // monthly rate
  const n = years * 12; // total months
  const invested = monthly * n;
  const total = monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
  return { invested, total, returns: total - invested };
}

// Lump sum formula: FV = P × (1 + r)^n
// where r = annual rate, n = years
function calcLump(amount, annualRate, years) {
  const total = amount * Math.pow(1 + annualRate / 100, years);
  return { invested: amount, total, returns: total - amount };
}

// ─────────────────────────────────────────────
//  CALCULATE & UPDATE UI
// ─────────────────────────────────────────────
function calculate() {
  // 1. Read slider values
  const monthly = Number(document.getElementById("sld-monthly").value);
  const lump = Number(document.getElementById("sld-lump").value);
  const rate = Number(document.getElementById("sld-rate").value);
  const years = Number(document.getElementById("sld-years").value);

  // 2. Update slider labels
  document.getElementById("lbl-monthly").textContent = formatINR(monthly);
  document.getElementById("lbl-lump").textContent = formatINR(lump);
  document.getElementById("lbl-rate").textContent = rate + "%";
  document.getElementById("lbl-years").textContent =
    years + (years === 1 ? " year" : " years");

  // 3. Run calculation
  const result = currentMode === "sip"
      ? calcSIP(monthly, rate, years)
      : calcLump(lump, rate, years);

  // 4. Update result cards
  document.getElementById("res-invested").textContent = formatINR(
    result.invested,
  );
  document.getElementById("res-total").textContent = formatINR(result.total);
  document.getElementById("res-returns").textContent = formatINR(
    result.returns,
  );
  document.getElementById("res-rate").textContent = rate + "%";

  const returnPct = ((result.returns / result.invested) * 100).toFixed(1);
  document.getElementById("res-pct").textContent = "+" + returnPct + "%";

  // 5. Update progress bar
  const invShare = (result.invested / result.total) * 100;
  const retShare = 100 - invShare;
  document.getElementById("bar-inv").style.width = invShare.toFixed(1) + "%";
  document.getElementById("bar-ret").style.width = retShare.toFixed(1) + "%";

  // 6. Draw chart
  drawChart(monthly, lump, rate, years);
}

// ─────────────────────────────────────────────
//  CHART (Canvas API)
// ─────────────────────────────────────────────
function drawChart(monthly, lump, rate, years) {
  const canvas = document.getElementById("chart");
  const ctx = canvas.getContext("2d");

  // Handle retina/HiDPI screens
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth;
  const H = canvas.offsetHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  // Padding around the chart area
  const pad = { top: 10, right: 10, bottom: 24, left: 48 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  // Build data points year by year
  const dataPoints = [];
  for (let y = 0; y <= years; y++) {
    const sip = calcSIP(monthly, rate, y);
    const lumP = calcLump(lump, rate, y);
    const investedSIP = monthly * y * 12;
    dataPoints.push({
      year: y,
      sipTotal: sip.total,
      lumpTotal: lumP.total,
      invested: currentMode === "sip" ? investedSIP : lump,
    });
  }

  // Find max value for Y axis scale
  const allValues = dataPoints.flatMap((d) => [
    d.sipTotal,
    d.lumpTotal,
    d.invested,
  ]);
  const maxVal = Math.max(...allValues);

  // Helper: convert data → canvas pixel position
  const toX = (i) => pad.left + (i / years) * chartW;
  const toY = (val) => pad.top + chartH - (val / maxVal) * chartH;

  // Draw horizontal grid lines
  ctx.strokeStyle = "#e8edf5";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (i / 4) * chartH;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(W - pad.right, y);
    ctx.stroke();
  }

  // Draw a line on the chart
  function drawLine(points, color, dashed = false) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.setLineDash(dashed ? [5, 4] : []);
    points.forEach((p, i) => {
      i === 0 ? ctx.moveTo(toX(i), toY(p)) : ctx.lineTo(toX(i), toY(p));
    });
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Invested line (dashed)
  drawLine(
    dataPoints.map((d) => d.invested),
    "#93c5fd",
    true,
  );

  // Active mode line (solid)
  if (currentMode === "sip") {
    drawLine(
      dataPoints.map((d) => d.sipTotal),
      "#2563eb",
    );
  } else {
    drawLine(
      dataPoints.map((d) => d.lumpTotal),
      "#22c55e",
    );
  }

  // Y-axis labels
  ctx.fillStyle = "#bbb";
  ctx.font = "10px Inter, sans-serif";
  ctx.textAlign = "right";
  for (let i = 0; i <= 4; i++) {
    const val = (maxVal / 4) * (4 - i);
    const y = pad.top + (i / 4) * chartH;
    ctx.fillText(shortFmt(val), pad.left - 4, y + 4);
  }

  // X-axis year labels
  ctx.textAlign = "center";
  const step = Math.max(1, Math.floor(years / 5));
  for (let y = 0; y <= years; y += step) {
    ctx.fillText(y + "y", toX(y), H - 6);
  }
}

// ─────────────────────────────────────────────
//  FORMATTERS
// ─────────────────────────────────────────────

// Indian number format: ₹12,34,567
function formatINR(n) {
  n = Math.round(n);
  if (n >= 10000000) return "₹" + (n / 10000000).toFixed(2) + " Cr";
  if (n >= 100000) return "₹" + (n / 100000).toFixed(2) + " L";
  return "₹" + n.toLocaleString("en-IN");
}

// Short form for chart axis: 5L, 20K
function shortFmt(n) {
  if (n >= 10000000) return (n / 10000000).toFixed(1) + "Cr";
  if (n >= 100000) return (n / 100000).toFixed(0) + "L";
  if (n >= 1000) return (n / 1000).toFixed(0) + "K";
  return Math.round(n);
}

// ─────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────
window.addEventListener("resize", calculate);
calculate();
