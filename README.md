# <a href="https://tanktinder.creeperkatze.de"><img src=".github/assets/logo.png" alt="TankTinder" width="400"></a>

Tinder for gas stations. Find cheap fuel near you by swiping through nearby stations.

[![Better Stack Badge](https://uptime.betterstack.com/status-badges/v1/monitor/2gyj1.svg)](https://status.creeperkatze.de)
![GitHub Issues](https://img.shields.io/github/issues/creeperkatze/tanktinder?labelColor=0d143c)
![GitHub Pull Requests](https://img.shields.io/github/issues-pr/creeperkatze/tanktinder?labelColor=0d143c)
![GitHub Repo stars](https://img.shields.io/github/stars/creeperkatze/tanktinder?style=flat&labelColor=0d143c)

> [!NOTE]
> TankTinder currently only supports Germany, as it uses the Tankerkönig API.

## 🚀 Quick Start

Use the **[Website](https://tanktinder.creeperkatze.de)**.

Grant location access, swipe right to match a station, swipe left to skip. The desperation meter shows the average fuel price in your area.

## 👨‍💻 Development

### Prerequisites

- Node.js
- pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/creeperkatze/tanktinder.git
cd tanktinder

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Environment Variables

Copy the .env.example file and rename it to .env.

| Variable | Description |
|----------|-------------|
| `NUXT_TANKERKOENIG_API_KEY` | Tankerkoenig API key (required) |

Get a Tankerkoenig API key at [creativecommons.tankerkoenig.de](https://creativecommons.tankerkoenig.de).

## 📜 License

AGPL-3.0
