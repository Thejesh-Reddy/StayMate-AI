# STAYMATE AI — Clean Python

### Stack
- Python + Flask
- SQLite
- Ollama
- SerpApi → Google Hotels
- Browser Geolocation → reverse geocoding → public IP fallback

### Exact search flow

When the user says **"find hotels"**:

1. STAYMATE immediately attempts Browser Geolocation.
2. GPS coordinates are reverse-geocoded into a city.
3. If GPS is denied/unavailable, STAYMATE uses public IP location.
4. Only if both automatic methods fail does it ask the user to enter a city.
5. It then asks for check-in/check-out.
6. It asks for adults/children.
7. It asks for number of rooms.
8. It calls SerpApi → Google Hotels only after all required search fields are ready.

Example:

```text
User: find hotels
Bot: I'll automatically detect your current location...
Bot: 📍 Location detected: Chittoor
Bot: What are your check-in and check-out dates?
User: 10-09-2026 to 13-09-2026
Bot: How many adults are travelling?
User: 3 adults
Bot: How many rooms do you need?
User: 1 room
Bot: Searching live Google Hotels...
```

### Run

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Set `SERPAPI_KEY` in `.env`.

Optional AI:

```powershell
ollama pull llama3.2
ollama serve
```

Start:

```powershell
python app.py
```

Open:

`http://127.0.0.1:5000`

SQLite creates `staymate.db` automatically.

### Booking pricing

`nightly rate × nights × rooms`

No arbitrary/fake tax is added.

### Reservation limitation

SerpApi/Google Hotels is a hotel discovery/rate source, not a reservation-write API. The app saves a booking request and opens a provider link when available. A true confirmed reservation/payment requires an actual booking provider and payment gateway.
