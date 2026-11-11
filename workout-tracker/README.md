# Workout Tracker Add-on

Log your workouts and sports, what you buy for them, and see how you're doing, from your phone or PC.

## Features

- A profile per user in the house
- Sessions: duration, how it felt, cost, notes and smartwatch numbers
- Gear purchases, counted in your spending
- Stats and charts for the last month, 3 months, year or all time

## Sports

- 🎾 **Padel:** matches with the score and tie-breaks, partners and clubs, and who you win with most

## Installation

1. Add this repository to Home Assistant, or copy this directory to your `/addons` folder
2. Install the "Workout Tracker" add-on, start it, and turn on "Show in sidebar"

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| currency | EUR | The currency costs are in (EUR, GBP, USD, …) |
| ssl | false | Also serve https on port 3401 with Home Assistant's certificate (see the Documentation tab) |
| certfile | fullchain.pem | Certificate in Home Assistant's `ssl` folder |
| keyfile | privkey.pem | Its key |

Open **Workouts** in the sidebar, or `http://<your-homeassistant-ip>:3400/`.
For development, see [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).
