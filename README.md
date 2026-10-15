# Weather239 Dashboard

1. In Terminal, go to this folder.
2. Copy `.env.example` to `.env`.
3. Replace `replace-with-your-key` with your Weather Underground API key.
4. Run `npm start`, then open http://localhost:3000.

The key stays only in `.env`, which is ignored by Git. The browser receives weather data from the local server, never the key.

The National Weather Service forecast and alerts use Irondequoit coordinates by default. Change `LATITUDE` and `LONGITUDE` in `.env` if needed.
# Weather239
