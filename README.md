# che110
college project
# EcoRoute - Sustainable Route Planner

## Files
- `index.html` - page structure
- `style.css` - layout and visual design
- `script.js` - geocoding, route lookup, comparison calculations and map

## Run on your laptop
1. Extract `EcoRoute_Project.zip`.
2. Open the `eco_route_planner` folder in VS Code.
3. Install the VS Code extension **Live Server** (Ritwick Dey).
4. Right-click `index.html` and select **Open with Live Server**.
5. Keep an internet connection enabled. The map, place search and road route use public OpenStreetMap-based services.

You can also open `index.html` directly in a browser, but Live Server is recommended.

## How the project works
- Nominatim (OpenStreetMap) searches for the entered places.
- OSRM public demo routing service supplies a driving road route and distance.
- If OSRM is unavailable, the app falls back to an approximate distance derived from straight-line distance.
- The map uses Leaflet and OpenStreetMap tiles.
- The comparison estimates fuel and direct operational CO2 using typical factors coded in `script.js`.

## Important limitations for your project report
- This is an educational prototype, not a live navigation app.
- Walking and cycling distances are approximated as 8% longer than the road distance; their routes are not separately routed.
- Bus emissions are per passenger using an assumed average occupancy/emissions factor.
- Estimated speeds do not account for live traffic, timetables, road closures, weather or local conditions.
- Public geocoding/routing services may rate-limit requests or be temporarily unavailable.
- The emissions figures are estimates and should be described as such in your presentation.

## Customise
Edit the `factors` array near the top of `script.js` to change average speeds, fuel consumption or emissions factors. Keep units consistent:
- `co2`: grams of CO2 per kilometre
- `energy`: litres per 100 kilometres for fuel-based options
- `speed`: estimated kilometres per hour
