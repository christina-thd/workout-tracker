# Workout Tracker Add-on

Log your workouts and sports, what you buy for them, and see how you're doing, from your phone or PC.

## Features

- A profile per user in the house, with the sports they choose
- Sessions: duration, how it felt, cost, notes and smartwatch numbers
- Gear purchases, counted in your spending
- Stats and charts for the last month, 3 months, year or all time

## Sports

- **Padel:** matches and training, set-by-set scores, partners, opponents and clubs
- **Tennis:** singles or doubles, set-by-set scores, court surface
- **Basketball:** practice and games, with results
- **Snowboard:** days on the slopes, where and what it cost
- **Workout:** a quick log of leg, arm or torso days

## Installation

1. Add this repository to Home Assistant, or copy this directory to your `/addons` folder
2. Install the "Workout Tracker" add-on, start it, and turn on "Show in sidebar"

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| currency | EUR | The currency costs are in (EUR, GBP, USD, …) |
| ssl | false | Also serve https on port 3501 with Home Assistant's certificate (see the Documentation tab) |
| certfile | fullchain.pem | Certificate in Home Assistant's `ssl` folder |
| keyfile | privkey.pem | Its key |

Open **Workouts** in the sidebar, or `http://<your-homeassistant-ip>:3500/`.
For development, see [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).
