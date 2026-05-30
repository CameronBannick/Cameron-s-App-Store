# Cameron's App Store 📦

A personal app store for the Android apps you vibe code. It's a small static
website (hosted free on **GitHub Pages**) that lists your apps and lets you
download + install their **`.apk`** files straight onto your phone.

The store itself is a **PWA**, so you can "Add to Home Screen" and it behaves
like a real app store icon on your phone.

---

## How it works

```
index.html / style.css / app.js   ← the store UI
catalog.json                      ← the list of your apps (the "database")
apps/                             ← your .apk files live here
icons/                            ← app icons + the store's own icon
manifest.webmanifest / sw.js      ← makes the store installable/offline
add-app.ps1                       ← one command to add a new app
```

When you open the site on your Android phone, you tap an app → **Download APK**
→ Android installs it (this is "sideloading"; the store walks you through the
one-time permission prompt).

---

## First-time setup (publish to GitHub Pages)

1. **Create a repo** on GitHub (e.g. `app-store`). Public is required for free Pages.
2. From this folder, push the code:
   ```powershell
   git init
   git add .
   git commit -m "Initial app store"
   git branch -M main
   git remote add origin https://github.com/<your-username>/app-store.git
   git push -u origin main
   ```
3. On GitHub: **Settings → Pages → Build and deployment**
   - Source: **Deploy from a branch**
   - Branch: **main** / folder: **/ (root)** → Save
4. Wait ~1 minute. Your store is live at:
   ```
   https://<your-username>.github.io/app-store/
   ```
5. Open that URL **on your phone** → menu → **Add to Home Screen**. 🎉

---

## Adding an app you vibe coded

Once you've built an `.apk`, add it with the helper script:

```powershell
./add-app.ps1 -Apk "C:\path\to\MyApp.apk" -Name "My App" -Tagline "What it does" -Category "Games"
```

Optional flags: `-Description`, `-Version`, `-Icon "C:\path\icon.png"`, `-Id`.

The script copies the APK into `apps/`, computes its size, and updates
`catalog.json`. Then publish the update:

```powershell
git add .
git commit -m "Add My App"
git push
```

Within a minute it appears in your store on your phone.

> Prefer doing it by hand? Just drop the `.apk` in `apps/`, add an object to the
> `apps` array in `catalog.json`, and push. The `size` field is optional — the
> store reads the real file size automatically.

### catalog.json entry shape

```json
{
  "id": "my-app",
  "name": "My App",
  "tagline": "Short one-liner",
  "description": "Longer text shown on the app's page.",
  "version": "1.0.0",
  "category": "Games",
  "updated": "2026-05-29",
  "icon": "icons/my-app.png",
  "apk": "apps/my-app-1.0.0.apk",
  "screenshots": ["screens/my-app-1.png"]
}
```

---

## Installing on your phone (what your users see)

1. Tap an app → **Download APK**.
2. Open the downloaded file (from notifications or your Files app).
3. First time only: Android asks to **allow installs from unknown apps** —
   toggle it on for your browser. (These are your own apps, so it's safe.)
4. Tap **Install**. The app lands in your app drawer.

---

## Notes & gotchas

- **File size:** GitHub limits a single file to **100 MB**. Most APKs are well
  under that. If an APK is bigger, host it on a **GitHub Release** instead and
  point the catalog `apk` field at the release download URL.
- **APKs must be installable:** debug-signed APKs work for personal sideloading.
  You don't need Google Play or a paid developer account.
- **Updating an app:** bump the `version`, run `add-app.ps1` again with the same
  `-Id`, and push. The old entry is replaced.
- **Building APKs from vibe-coded web apps:** if your apps are actually web apps,
  tools like [PWABuilder](https://www.pwabuilder.com/) or
  [Capacitor](https://capacitorjs.com/) can wrap them into an installable APK.
