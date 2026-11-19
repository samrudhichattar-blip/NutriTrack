# NutriTrack Android app (Expo)

This is the refreshed native Expo / React Native app. It keeps the existing backend API contract used by the supplied mobile app:

- `POST /auth/login`
- `POST /auth/signup`
- `GET /auth/me`
- `GET /products?q=...&limit=200`
- `GET /products/:id/variants`
- `GET /basket`
- `POST /basket/items`

The app includes sign in / sign up, a home dashboard, Indian grocery search, variant selection, add-to-basket, basket summary, profile, persistent login, and an in-app backend URL setting. It does not invent unsupported endpoints for editing/removing basket items or goals.

## First run on your real Android phone

1. Extract this `mobile` folder into your existing NutriTrack project, replacing the old `mobile` folder after keeping a backup.
2. On the laptop, start the existing backend in its own terminal. It must be running on port `4000` and reachable on your Wi-Fi network.
3. Find the laptop's Wi-Fi IPv4 address with `ipconfig` (look under the Wi-Fi adapter, e.g. `192.168.1.5`).
4. In the app, open **Connection settings** on the sign-in screen, or **Profile > Backend connection** after signing in. Enter `http://YOUR-LAPTOP-IP:4000/api` and save.
5. Make sure the phone and laptop are on the same Wi-Fi. Allow Node.js through Windows Firewall if prompted.
6. In PowerShell:

   ```powershell
   cd "$HOME\Downloads\NutriTrack\mobile"
   npm install
   npx expo install --fix
   npx expo start --lan
   ```

7. Open Expo Go on the phone and scan the QR code shown by Expo.

## Important

- `10.0.2.2` is only for the Android emulator. A real phone must use the laptop's LAN IPv4 address.
- `localhost` on the phone means the phone itself, not the laptop.
- The backend must be reachable from another device on the LAN. If the phone cannot connect, test `http://YOUR-LAPTOP-IP:4000/api/health` in the phone browser and check Windows Firewall.
- The backend URL is saved locally on the phone. Auth tokens are stored using AsyncStorage.
- Keep your existing backend `.env` private; do not upload it or share secrets.
