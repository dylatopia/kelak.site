/* =========================================================
   KELAK — script.js
   -----------------------------------------------------------------
   ⚠️ EDIT ONLY THE TWO CONSTANTS BELOW unless you know what you are
   doing. Everything under "FUNCTIONAL CODE" talks to the wallet and
   the smart contract — breaking it breaks the whole app.
   ========================================================= */

// ⚠️ TESTNET address — swap to the mainnet address after final deployment
const CONTRACT_ADDRESS = "0x2885F68368F3154f3A0E13Adae3b8358Fd9cddD8";

// ⚠️ TESTNET network details — swap to mainnet values after final deployment
const BOT_CHAIN = {
  chainIdHex: "0x2A5",       // 677 in hex — BOT Chain Mainnet
  chainName: "BOT Chain Mainnet",
  rpcUrls: ["https://rpc.botchain.ai"],
  nativeCurrency: { name: "BOT", symbol: "BOT", decimals: 18 },
  blockExplorerUrls: ["https://scan.botchain.ai"],
};

const CONTRACT_ABI = [
  { "anonymous": false, "inputs": [ { "indexed": true, "internalType": "uint256", "name": "vaultId", "type": "uint256" }, { "indexed": true, "internalType": "address", "name": "owner", "type": "address" }, { "indexed": true, "internalType": "address", "name": "recipient", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "unlockTimestamp", "type": "uint256" } ], "name": "VaultCreated", "type": "event" },
  { "anonymous": false, "inputs": [ { "indexed": true, "internalType": "uint256", "name": "vaultId", "type": "uint256" }, { "indexed": true, "internalType": "address", "name": "recipient", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "unlockedAt", "type": "uint256" } ], "name": "VaultUnlocked", "type": "event" },
  { "inputs": [ { "internalType": "address", "name": "recipient", "type": "address" }, { "internalType": "uint256", "name": "unlockTimestamp", "type": "uint256" }, { "internalType": "string", "name": "content", "type": "string" }, { "internalType": "string", "name": "contentType", "type": "string" } ], "name": "createVault", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "getMyVaultsAsOwner", "outputs": [ { "internalType": "uint256[]", "name": "", "type": "uint256[]" } ], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "getMyVaultsAsRecipient", "outputs": [ { "internalType": "uint256[]", "name": "", "type": "uint256[]" } ], "stateMutability": "view", "type": "function" },
  { "inputs": [ { "internalType": "uint256", "name": "vaultId", "type": "uint256" } ], "name": "getVaultStatus", "outputs": [ { "internalType": "address", "name": "owner", "type": "address" }, { "internalType": "address", "name": "recipient", "type": "address" }, { "internalType": "uint256", "name": "unlockTimestamp", "type": "uint256" }, { "internalType": "uint256", "name": "createdAt", "type": "uint256" }, { "internalType": "bool", "name": "isUnlocked", "type": "bool" } ], "stateMutability": "view", "type": "function" },
  { "inputs": [ { "internalType": "uint256", "name": "vaultId", "type": "uint256" } ], "name": "unlockVault", "outputs": [ { "internalType": "string", "name": "content", "type": "string" }, { "internalType": "string", "name": "contentType", "type": "string" } ], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "vaultCount", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" },
  { "inputs": [ { "internalType": "address", "name": "", "type": "address" }, { "internalType": "uint256", "name": "", "type": "uint256" } ], "name": "vaultsByOwner", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" },
  { "inputs": [ { "internalType": "address", "name": "", "type": "address" }, { "internalType": "uint256", "name": "", "type": "uint256" } ], "name": "vaultsByRecipient", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" }
];

/* ============ FUNCTIONAL CODE — handle with care ============ */

const $ = (id) => document.getElementById(id);
let provider = null, signer = null, contract = null, account = null, countdownTimer = null, currentVaultId = null, waitingForChainCatchUp = false;

/* --- warm, plain-language error translation --- */
function friendlyError(err) {
  const raw = (err?.reason || err?.shortMessage || err?.data?.message || err?.message || "").toLowerCase();
  if (err?.code === 4001 || raw.includes("user rejected") || raw.includes("user denied")) return "You cancelled the request in your wallet — nothing was sent.";
  if (raw.includes("invalid recipient")) return "That recipient wallet address doesn't look valid.";
  if (raw.includes("content required")) return "Your vault can't be empty — please add a message or a link.";
  if (raw.includes("content type required")) return "Please choose what kind of content this is.";
  if (raw.includes("vault not found")) return "We couldn't find a vault with that ID.";
  if (raw.includes("not yet") || raw.includes("too early") || raw.includes("still locked") || raw.includes("unlock")) return "The network needs a few more seconds to catch up. Please try opening it once more.";
  if (raw.includes("not the recipient") || raw.includes("only recipient") || raw.includes("unauthorized")) return "This vault was meant for someone else's wallet.";
  if (raw.includes("insufficient funds")) return "There isn't enough in this wallet to cover the network fee.";
  if (raw.includes("already unlocked")) return "This vault has already been opened.";
  if (raw.includes("invalid address") || raw.includes("unconfigured name")) return "That wallet address doesn't look right. Please check it again.";
  if (raw.includes("network") || raw.includes("could not detect")) return "We couldn't reach BOT Chain. Check your wallet's network and try again.";
  if (raw.includes("call revert") || raw.includes("execution reverted") || raw.includes("bad_data") || raw.includes("could not decode")) return "We couldn't find that vault. Double-check the vault ID.";
  return "Something went astray. Please try again in a moment.";
}
function showError(el, msg) { el.textContent = msg; el.classList.remove("hidden"); }
function clearError(el) { el.textContent = ""; el.classList.add("hidden"); }
const short = (a) => a ? a.slice(0, 5) + "…" + a.slice(-3) : "";
const fmtDate = (ts) => new Date(Number(ts) * 1000).toLocaleString(undefined, { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });

async function ensureCorrectNetwork() {
  const currentChainId = await window.ethereum.request({ method: "eth_chainId" });
  if (currentChainId === BOT_CHAIN.chainIdHex) return true;
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BOT_CHAIN.chainIdHex }],
    });
    return true;
  } catch (switchErr) {
    if (switchErr.code === 4902) {
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [BOT_CHAIN],
        });
        return true;
      } catch (_) {
        alert("Please add BOT Chain to your wallet to use Kelak.");
        return false;
      }
    }
    alert("Kelak needs your wallet on the BOT Chain network to work.");
    return false;
  }
}

function detectProvider() {
  return new Promise((resolve) => {
    if (window.ethereum) return resolve(window.ethereum);
    window.addEventListener("ethereum#initialized", () => resolve(window.ethereum), { once: true });
    setTimeout(() => resolve(window.ethereum || null), 2000);
  });
}

/* --- wallet connection --- */
async function connectWallet() {
  const btn = $("connectBtn");
  const ethereumProvider = await detectProvider();
  if (!ethereumProvider) { alert("We couldn't find a wallet in this browser. Install MetaMask to use Kelak."); return; }
  try {
    btn.disabled = true;
    provider = new ethers.BrowserProvider(ethereumProvider);
    await provider.send("eth_requestAccounts", []);
    const onRightNetwork = await ensureCorrectNetwork();
    if (!onRightNetwork) { btn.disabled = false; return; }
    signer = await provider.getSigner();
    account = await signer.getAddress();
    contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    btn.textContent = short(account);
    btn.classList.remove("btn-primary"); btn.classList.add("btn-ghost");
    $("navMyVaults").classList.remove("hidden");
    $("vaults").classList.remove("hidden");
    $("footAddr").textContent = CONTRACT_ADDRESS;
    loadMyVaults();
    if (sharedVaultId) {
      showVault(sharedVaultId);
      document.getElementById("vault").scrollIntoView({ behavior: "smooth" });
    }
  } catch (err) { alert(friendlyError(err)); }
  finally { btn.disabled = false; }
}
$("connectBtn").addEventListener("click", connectWallet);
if (window.ethereum?.on) window.ethereum.on("accountsChanged", () => window.location.reload());
if (window.ethereum?.on) window.ethereum.on("chainChanged", () => window.location.reload());

/* --- create vault --- */
$("contentType").addEventListener("change", (e) => {
  const isText = e.target.value === "text";
  $("textWrap").classList.toggle("hidden", !isText);
  $("linkWrap").classList.toggle("hidden", isText);
});

let pendingVault = null;

$("forMyself").addEventListener("change", (e) => {
  if (e.target.checked) {
    if (!account) { alert("Please connect your wallet first."); e.target.checked = false; return; }
    $("recipient").value = account;
    $("recipient").disabled = true;
  } else {
    $("recipient").value = "";
    $("recipient").disabled = false;
  }
});

$("vaultForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const errEl = $("formError"); clearError(errEl);
  if (!contract) return showError(errEl, "Please connect your wallet first.");

  const recipient = $("recipient").value.trim();
  const contentType = $("contentType").value;
  const content = (contentType === "text" ? $("contentText").value : $("contentLink").value).trim();
  const dateStr = $("unlockDate").value;

  if (!/^0x[a-fA-F0-9]{40}$/.test(recipient)) return showError(errEl, "That wallet address doesn't look right — it should start with 0x and be 42 characters long.");
  if (!content) return showError(errEl, contentType === "text" ? "Your vault is empty — write something first." : "Please paste the link to your file.");
  if (!dateStr) return showError(errEl, "Please choose when this vault may be opened.");
  const unlockTimestamp = Math.floor(new Date(dateStr).getTime() / 1000);
  if (unlockTimestamp <= Math.floor(Date.now() / 1000)) return showError(errEl, "Pick a date in the future — that's rather the point.");

  pendingVault = { recipient, contentType, content, unlockTimestamp };
  $("confirmRecipient").textContent = recipient;
  $("confirmType").textContent = contentType;
  $("confirmDate").textContent = new Date(unlockTimestamp * 1000).toLocaleString();
  $("vaultForm").classList.add("hidden");
  $("confirmCard").classList.remove("hidden");
});

$("backToEditBtn").addEventListener("click", () => {
  $("confirmCard").classList.add("hidden");
  $("vaultForm").classList.remove("hidden");
});

$("confirmLockBtn").addEventListener("click", async () => {
  const errEl = $("formError"); clearError(errEl);
  const btn = $("confirmLockBtn");
  try {
    btn.disabled = true; btn.textContent = "Sealing…";
    const { recipient, contentType, content, unlockTimestamp } = pendingVault;
    const tx = await contract.createVault(recipient, unlockTimestamp, content, contentType);
    const receipt = await tx.wait();
    let vaultId = "—";
    for (const log of receipt.logs) {
      try { const parsed = contract.interface.parseLog(log); if (parsed?.name === "VaultCreated") { vaultId = parsed.args.vaultId.toString(); break; } } catch (_) {}
    }
    $("successVaultId").textContent = vaultId;
    $("copyLinkBtn").dataset.vaultId = vaultId;
    $("successTx").textContent = receipt.hash;
    $("confirmCard").classList.add("hidden");
    $("successCard").classList.remove("hidden");
    loadMyVaults();
  } catch (err) { showError(errEl, friendlyError(err)); }
  finally { btn.disabled = false; btn.textContent = "Yes, seal it"; }
});

$("againBtn").addEventListener("click", () => {
  $("vaultForm").reset();
  $("vaultForm").classList.remove("hidden");
  $("successCard").classList.add("hidden");
});

async function getChainTime() {
  try {
    const block = await provider.getBlock("latest");
    return block.timestamp;
  } catch (_) {
    return Math.floor(Date.now() / 1000);
  }
}

/* --- vault detail --- */
async function showVault(id) {
  currentVaultId = id;
  const errEl = $("vaultError"); clearError(errEl);
  if (!contract) return showError(errEl, "Please connect your wallet first.");
  if (!/^\d+$/.test(String(id).trim())) return showError(errEl, "A vault ID is a plain number, like 3.");
  try {
    const [owner, recipient, unlockTimestamp, createdAt, isUnlocked] = await contract.getVaultStatus(id);
    const unlockTs = Number(unlockTimestamp);
    const ready = Date.now() / 1000 >= unlockTs;
    const mine = account && recipient.toLowerCase() === account.toLowerCase();

    $("vaultDetail").classList.remove("hidden");
    $("vOwner").textContent = owner;
    $("vRecipient").textContent = recipient;
    $("vCreated").textContent = fmtDate(createdAt);
    $("vUnlock").textContent = fmtDate(unlockTimestamp);
    $("vStatus").textContent = isUnlocked ? "Opened" : ready ? "Ready to open" : "Sealed";
    $("revealBox").classList.add("hidden"); $("revealBox").innerHTML = "";
    $("lockedBox").classList.toggle("hidden", ready);
    $("unlockBtn").dataset.vaultId = id;

    if (isUnlocked && mine) {
      // Already opened before — just read it again for free, no new transaction needed
      $("openBox").classList.add("hidden");
      try {
        const [content, contentType] = await contract.unlockVault.staticCall(id);
        renderContent(content, contentType);
      } catch (_) {}
    } else {
      $("openBox").classList.toggle("hidden", !(ready && mine));
    }
    if (countdownTimer) clearInterval(countdownTimer);
    if (!ready) { tickCountdown(unlockTs); countdownTimer = setInterval(() => tickCountdown(unlockTs), 1000); }
    else if (!mine) $("vStatus").textContent += " — only the recipient's wallet may open it";
  } catch (err) { showError(errEl, friendlyError(err)); }
}

function tickCountdown(unlockTs) {
  const remaining = unlockTs - Math.floor(Date.now() / 1000);
  if (remaining <= 0) {
    clearInterval(countdownTimer);
    showVault(currentVaultId);
    return;
  }
  let s = remaining;
  const d = Math.floor(s / 86400); s %= 86400;
  const h = Math.floor(s / 3600); s %= 3600;
  const m = Math.floor(s / 60);
  $("countdown").textContent = `${d} days · ${h} hours · ${m} minutes · ${s % 60} seconds`;
}
$("lookupBtn").addEventListener("click", () => showVault($("lookupId").value.trim()));

$("copyLinkBtn").addEventListener("click", async (e) => {
  const btn = e.currentTarget;
  const id = btn.dataset.vaultId;
  const link = `${location.origin}${location.pathname}?vault=${id}#vault`;
  try {
    await navigator.clipboard.writeText(link);
    btn.textContent = "✓ Copied to clipboard";
    btn.classList.add("btn-copied");
    setTimeout(() => {
      btn.textContent = "🔗 Copy vault link";
      btn.classList.remove("btn-copied");
    }, 1800);
  } catch (_) {
    btn.textContent = "Couldn't copy — try manually";
    setTimeout(() => { btn.textContent = "🔗 Copy vault link"; }, 1800);
  }
});

function isNotReadyError(err) {
  const raw = (err?.reason || err?.shortMessage || err?.data?.message || err?.message || "").toLowerCase();
  return raw.includes("not yet") || raw.includes("too early") || raw.includes("still locked") || raw.includes("not ready");
}

$("unlockBtn").addEventListener("click", async (e) => {
  const errEl = $("vaultError"); clearError(errEl);
  const id = e.currentTarget.dataset.vaultId;
  const btn = e.currentTarget;
  const maxAttempts = 12;
  const delayMs = 5000; // up to ~60 seconds of quiet, automatic patience
  btn.disabled = true;
  try {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        btn.textContent = attempt === 1 ? "Turning the key…" : "Waiting for the network…";
        const [content, contentType] = await contract.unlockVault.staticCall(id);
        const tx = await contract.unlockVault(id);
        await tx.wait();
        renderContent(content, contentType);
        $("openBox").classList.add("hidden");
        $("vStatus").textContent = "Opened";
        return;
      } catch (err) {
        if (isNotReadyError(err) && attempt < maxAttempts) {
          await new Promise((res) => setTimeout(res, delayMs));
          continue;
        }
        throw err;
      }
    }
  } catch (err) {
    showError(errEl, friendlyError(err));
  } finally {
    btn.disabled = false; btn.textContent = "Open this vault";
  }
});

function renderContent(content, contentType) {
  const box = $("revealBox");
  const t = (contentType || "text").toLowerCase();
  if (t === "image") box.innerHTML = `<img src="${escapeAttr(content)}" alt="Vault contents" />`;
  else if (t === "video") box.innerHTML = `<video controls src="${escapeAttr(content)}"></video>`;
  else if (t === "voice") box.innerHTML = `<audio controls src="${escapeAttr(content)}"></audio>`;
  else box.innerHTML = `<div class="letter">${escapeHtml(content)}</div>`;
  box.classList.remove("hidden");
}
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const escapeAttr = (s) => encodeURI(String(s)).replace(/"/g, "%22");

/* --- dashboard --- */
async function loadMyVaults() {
  if (!contract) return;
  await fillList("ownedList", () => contract.getMyVaultsAsOwner(), "You haven't sealed any vaults yet.");
  await fillList("receivedList", () => contract.getMyVaultsAsRecipient(), "Nothing is waiting for you — yet.");
}
async function fillList(elId, getter, emptyMsg) {
  const el = $(elId);
  try {
    const ids = await getter();
    if (!ids.length) { el.innerHTML = `<p class="muted">${emptyMsg}</p>`; return; }
    el.innerHTML = "";
    for (const rawId of ids) {
      const id = rawId.toString();
      const row = document.createElement("div");
      row.className = "vault-row";
      row.innerHTML = `<span><b>Vault #${id}</b><small class="muted">loading…</small></span>`;
      el.appendChild(row);
      try {
        const [, , unlockTimestamp, , isUnlocked] = await contract.getVaultStatus(id);
        const ready = Date.now() / 1000 >= Number(unlockTimestamp);
        row.innerHTML = `<span><b>Vault #${id}</b><small>${isUnlocked ? "Opened" : ready ? "Ready to open" : "Sealed until " + fmtDate(unlockTimestamp)}</small></span>`;
        const btn = document.createElement("button");
        btn.className = "btn btn-ghost btn-sm"; btn.textContent = "View";
        btn.addEventListener("click", () => { $("lookupId").value = id; showVault(id); document.getElementById("vault").scrollIntoView({ behavior: "smooth" }); });
        row.appendChild(btn);
      } catch (_) { row.querySelector("small").textContent = "Details unavailable"; }
    }
  } catch (err) { el.innerHTML = `<p class="muted">${friendlyError(err)}</p>`; }
}

const urlParams = new URLSearchParams(location.search);
const sharedVaultId = urlParams.get("vault");
if (sharedVaultId) { $("lookupId").value = sharedVaultId; }

async function tryAutoConnect() {
  if (!window.ethereum) return;
  try {
    // eth_accounts (unlike eth_requestAccounts) never shows a popup —
    // it only succeeds silently if this site was already approved before
    const accounts = await window.ethereum.request({ method: "eth_accounts" });
    if (accounts.length > 0) {
      await connectWallet();
    } else if (sharedVaultId) {
      document.getElementById("vault").scrollIntoView({ behavior: "smooth" });
    }
  } catch (_) {}
}
tryAutoConnect();