# Kelak.site
**Some words are meant for the future.**

Kelak (Indonesian for *"someday"*) is a time-locked digital vault platform built on BOT Chain. Users can lock a message, photo, video, or voice note for themselves or someone they care about, choose a future unlock date, and the vault becomes immutable — inaccessible to anyone, including its creator, until that date arrives.

## What it does

1. **Create a vault** — write a message (or paste a link to a photo/video/voice note), choose a recipient wallet address, and set an unlock date.
2. **Lock** — the vault is sealed on-chain. Nobody, not even the creator, can access it early or edit it afterward.
3. **Open** — once the unlock date arrives, only the recipient's connected wallet can open the vault and reveal its contents.

## Why Kelak?

Every person has things they wish they could say — not today, but at the right time. A parent may want to leave a letter for their child to open on their 18th birthday. A graduate may want to write to their future self five years from now. Today, these messages usually live on cloud services or personal devices, where they can be edited, deleted, opened too early, or simply lost. Kelak exists so that a promise about time is kept by something more reliable than a company's server: a smart contract that cannot be rushed, edited, or quietly deleted.

## Why blockchain?

A promise about time needs a keeper that doesn't forget, can't be persuaded to peek early, and can't quietly change the rules. The smart contract enforces this instead of relying on a company's server or goodwill:
- **Immutable** — once sealed, a vault's contents, recipient, and unlock date can never be altered.
- **Time-locked** — the unlock condition is enforced by the contract itself, not a UI trick.
- **Owned by wallets, not accounts** — no login, no subscription, no gatekeeper who could revoke access.

## How to use it

1. Visit the live site and click **Connect Wallet** (MetaMask, on BOT Chain).
2. Click **Create a Vault**, fill in the recipient's wallet address, your message (or a link to your file), and pick when it should unlock.
3. Confirm the transaction in your wallet — your vault is now sealed.
4. Share the vault link with the recipient, or check back yourself if it's for your future self.
5. Once the unlock date passes, the recipient connects their wallet and clicks **Open this vault** to reveal it.

## A note on photos, videos, and voice notes

Blockchains are built to store small pieces of data cheaply — not large files like photos or videos. Storing a video directly on-chain would be prohibitively expensive and, in most cases, technically impossible.

Because of this, Kelak asks you to upload your photo, video, or voice note to any file-hosting service you trust (for example, a public link from Google Drive, Imgur, or similar), and then paste that link into the vault instead of the file itself. What Kelak stores on-chain is the **link and the promise** — permanent, owned by your wallet, and released only at the right time — even though the file itself lives elsewhere. This is a common and accepted pattern in blockchain applications, and it's what keeps Kelak affordable to actually use.

## Tech stack

- **Smart contract:** Solidity (`Kelak.sol`), deployed on BOT Chain
- **Frontend:** plain HTML, CSS, and JavaScript (no build tools)
- **Blockchain connection:** [ethers.js](https://docs.ethers.org/) via MetaMask

## Contract

- **Network:** BOT Chain Mainnet (Chain ID 677)
- **Contract address:** `0x2885F68368F3154f3A0E13Adae3b8358Fd9cddD8`
- **Explorer:** [View on BOTScan](https://scan.botchain.ai/address/0x2885F68368F3154f3A0E13Adae3b8358Fd9cddD8) — verified source code

## Files in this repo

- `Kelak.sol` — the smart contract
- `index.html` / `style.css` / `script.js` — the frontend
- `README.md` — this file

## A note on this MVP

For this hackathon build, the vault's content is stored as a reference on-chain, while the frontend controls when it's revealed. A production version would add client-side encryption before storing the content, so the data itself — not just the app's UI — enforces privacy before the unlock date.
