# 🐚 ReefStreet: the ocean exchange

A multiplayer ocean-themed stock market game designed to help beginners learn about investing. Players trade stocks from 10 real-world companies, including Apple, Microsoft, NVIDIA, and Tesla, using fictional pearls and simulated stock prices.

Everyone shares the same simulated market. Prices move in waves, ocean creatures represent price points, and random events inspired by real-world economic situations affect the market. Players can build portfolios, compete on the leaderboard, progress through seven ranks, shop at the harbor, and save pearls in the reef vault.

No real money or live stock market data is used.

**Play ReefStreet:** https://reefstreet.onrender.com/

*Hosted on Render Free. The site may take a little time to load after inactivity, and game progress may reset when the server restarts.*

Requirements: Node.js 18 or newer. No external dependencies.

## Run it on your computer

```bash
git clone https://github.com/AW73639/ReefStreet.git
cd reefstreet
node server.js
```

Open http://localhost:3000, create an explorer (name + passcode of 6 or more characters) and dive in.
Friends on the same Wi-Fi can use the `Same Wi-Fi` address the terminal prints.

## Settings (optional)

Copy `.env.example` to `.env` and edit it. Real environment variables work too.

| Setting | What it does |
|---|---|
| `PORT` | Port to listen on (default 3000) |
| `HOST` | `127.0.0.1` = only this computer (use behind a tunnel or Caddy). `0.0.0.0` = reachable on the network |
| `TRUST_PROXY` | Set `1` **only** behind a trusted HTTPS proxy. Turns on the Secure cookie flag and real client IPs for rate limits |
| `ADMIN_NAME` | This explorer sees the "Summon event" button (handy for demos) |
| `DATA_DIR` | Where `users.json` and `market.json` are saved. Use a persistent disk when hosting |
| `MAX_USERS` | Account cap (default 500) |

To enable the **Summon event** button for one explorer, create a `.env` file in the project folder and set:

```dotenv
ADMIN_NAME=YOUR_EXPLORER_NAME
```

Replace `YOUR_EXPLORER_NAME` with the username of your ReefStreet account. Restart the server after making changes.

Keep `.env` private and do not upload it to GitHub.

## Add or change companies

Open `server.js` and edit the `UNI` list near the top. One line per company:
ticker, name, emoji, sector, starting price (`b`), volatility (`v`), drift (`d`) and a short description (`a`).
Events target sectors (`Tech`, `Finance`, `Consumer`, `Energy`, `Transport`, ...), so reuse those names or add events in the `EV` list.
Restart the server after editing.

## Keeping it running

Pick one:

1. **Hackathon day (simplest and safe): your laptop + a tunnel.** No ports are opened on your router.
   ```bash
   HOST=127.0.0.1 TRUST_PROXY=1 node server.js
   cloudflared tunnel --url http://localhost:3000     # prints a public https:// link
   ```
   Keep the laptop awake and plugged in. Stop the tunnel to take the site offline.
2. **Always on, hands-off: a container host** (Fly.io, Railway, Render, etc.). Connect your GitHub repo, use the included
   `Dockerfile`, and **attach a persistent volume mounted at `/data`** (the Dockerfile sets `DATA_DIR=/data`).
   The host gives you HTTPS and restarts the app if it crashes. Free tiers often sleep and have no persistent disk, which
   would erase players, so check the current plan before relying on it.
3. **Your own Linux server (VPS):** run it with systemd and put Caddy in front for automatic HTTPS.
   ```ini
   # /etc/systemd/system/reefstreet.service
   [Unit]
   Description=ReefStreet
   After=network.target
   [Service]
   User=reef
   WorkingDirectory=/opt/reefstreet
   Environment=HOST=127.0.0.1 TRUST_PROXY=1 DATA_DIR=/var/lib/reefstreet
   ExecStart=/usr/bin/node server.js
   Restart=always
   NoNewPrivileges=true
   ProtectSystem=strict
   ReadWritePaths=/var/lib/reefstreet
   [Install]
   WantedBy=multi-user.target
   ```
   ```
   # /etc/caddy/Caddyfile
   reef.example.com {
     reverse_proxy 127.0.0.1:3000
   }
   ```
   Then: `sudo systemctl enable --now reefstreet`, open only ports 22/80/443 (`ufw`), and use SSH keys, not passwords.

**Back up `users.json`** now and then (for example `cp users.json users-backup.json`). It is the only thing you can't regenerate.

## How it is protected

- **The server is the referee.** Prices, trades, fees, vault interest, shop and chest all run on the server and are
  validated there. The browser only asks; it cannot set its own balance or net worth, so the leaderboard can't be faked.
- **Passcodes** are hashed with scrypt and a per-user salt (never stored in plain text). Login failures are rate limited
  per network and per account (5 wrong tries pauses the account for 5 minutes).
- **Sessions** use random 256-bit tokens in an `HttpOnly`, `SameSite=Strict` cookie (plus `Secure` over HTTPS). The page
  never touches the token, and only a hash of it is stored on the server. Sessions expire after 14 days; logout deletes them.
- **Cross-site request protection:** POSTs must be JSON from the same origin.
- **Strict Content-Security-Policy** (scripts only with a per-request nonce), no framing, no sniffing, no referrer,
  and HSTS over HTTPS. All player-provided text is escaped before display.
- **Input checks:** names, passcodes, symbols and amounts are validated; companies are checked against a whitelist;
  request bodies are capped at 10 KB; request timeouts are set; only `index.html` is ever served from disk.
- **Limits:** general rate limit per network, 6 new accounts per hour per network, account cap.
- **Minimal data:** no emails, no real names, no analytics. Only an explorer name, avatar, game state and a password hash.
- Runs as a non-root user in Docker. No third-party packages, so no supply-chain risk from dependencies.

Honest limits: nothing is "unhackable". Keep Node updated, keep `users.json` private (it is in `.gitignore`), tell players
not to reuse a real password, and remember that anything on the public internet gets probed. This is a game with fake money,
so the stakes are low, but the basics above are in place.

## Put it on GitHub

1. On github.com click **New repository** (leave "Add a README" unchecked), name it `reefstreet`.
2. In this folder:
   ```bash
   git init
   git add .
   git status            # make sure .env and users.json are NOT listed
   git commit -m "ReefStreet: ocean stock market game"
   git branch -M main
   git remote add origin https://github.com/YOUR_NAME/reefstreet.git
   git push -u origin main
   ```
3. Choose a license on GitHub (Add file → Create new file → name it `LICENSE`; MIT is a common friendly choice).

Never commit `.env`, `users.json` or `market.json`. They are already in `.gitignore`.

## Disclaimer

ReefStreet is an educational game featuring real-world companies with simulated stock prices. No real money is used. It is not financial advice.
