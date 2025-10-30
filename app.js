/* NebulaDrop - simple frontend demo for airdrop claim */
const API_BASE = ""; // e.g. "https://your-backend.example/api"
const connectBtn = document.getElementById('connectBtn');
const claimBtn = document.getElementById('claimBtn');
const statusEl = document.getElementById('status');
const pointsEl = document.getElementById('points');
const countdownEl = document.getElementById('countdown');

let provider;
let signer;
let userAddress = null;
let points = 0;

// Countdown
function updateCountdown() {
  const end = new Date(window.AIRDROP_END);
  const now = new Date();
  const diff = Math.max(0, end - now);
  const d = Math.floor(diff / (1000*60*60*24));
  const h = Math.floor(diff / (1000*60*60)) % 24;
  const m = Math.floor(diff / (1000*60)) % 60;
  const s = Math.floor(diff / 1000) % 60;
  countdownEl.textContent = `${d}д ${h}ч ${m}м ${s}с`;
}
setInterval(updateCountdown, 1000); updateCountdown();

// Points from tasks
document.querySelectorAll('#tasks input[type="checkbox"]').forEach(cb => {
  cb.addEventListener('change', () => {
    const total = Array.from(document.querySelectorAll('#tasks input[type="checkbox"]:checked'))
      .reduce((acc, el) => acc + Number(el.dataset.points||0), 0);
    points = total;
    pointsEl.textContent = String(points);
    window.localStorage.setItem('nebula_points', String(points));
  });
});
const savedPoints = Number(window.localStorage.getItem('nebula_points')||"0");
if(savedPoints>0) {
  points = savedPoints; pointsEl.textContent = String(points);
  const boxes = document.querySelectorAll('#tasks input[type="checkbox"]');
  // just display saved number; not toggling individual tasks to keep demo simple
}

// Wallet connect
async function connectWallet() {
  if (!window.ethereum) {
    statusEl.textContent = 'MetaMask не обнаружен. Установите расширение.';
    return;
  }
  try {
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    userAddress = await signer.getAddress();
    statusEl.textContent = `Подключено: ${userAddress.slice(0,6)}…${userAddress.slice(-4)}`;
    claimBtn.disabled = false;
    connectBtn.textContent = 'Подключено';
    connectBtn.disabled = true;
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Не удалось подключить кошелёк';
  }
}

connectBtn.addEventListener('click', connectWallet);

// Claim flow (signature only, gasless)
async function claimAirdrop() {
  if(!signer || !userAddress) return;
  const toSign = JSON.stringify({
    type: 'AIRDROP_CLAIM',
    project: window.PROJECT_NAME,
    token: window.TOKEN_SYMBOL,
    address: userAddress,
    points: points,
    nonce: Math.floor(Math.random()*1e12),
    ts: new Date().toISOString()
  });
  try {
    const signature = await signer.signMessage(toSign);
    // If API backend is configured, POST the payload for processing
    if(API_BASE) {
      await fetch(API_BASE + '/claim', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ address: userAddress, points, payload: toSign, signature })
      });
    } else {
      // store locally to show success
      const claims = JSON.parse(window.localStorage.getItem('nebula_claims')||'[]');
      claims.push({ address: userAddress, points, signature });
      window.localStorage.setItem('nebula_claims', JSON.stringify(claims));
    }
    statusEl.textContent = 'Заявка на аирдроп отправлена ✔️ (демо)';
    claimBtn.disabled = true;
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Подпись отклонена или ошибка. Попробуйте снова.';
  }
}
claimBtn.addEventListener('click', claimAirdrop);
