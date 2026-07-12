# IreenTV PRO

An elegant, fully-featured, high-performance streaming catalog application utilizing modern React, Vite, and Node.js. 

---

## 🚀 Features
- **Responsive Layout & Visual Player**: Smooth player viewport adjustments across mobile, tablet, and widescreen monitors.
- **Custom Built Stream Proxy**: Fully resolved server-side proxying in `server.ts` to seamlessly handle `.m3u8` playlists and `.ts` transport stream chunks without CORS blocks.
- **Smart Adaptive Bitrate & Controls**: Fast channel switching, automatic play fallback, customizable streaming quality, play/pause controls, and volume control.
- **Rhythmic Carousel Auto-Slide**: Carousel lists slide automatically on the homepage for a premium cinematic interface.

---

## 🛠️ Deploying IreenTV Pro

Because this application uses a **Full-Stack Node.js architecture** (a React client along with an Express.js backend (`server.ts`) for dynamic HLS streaming proxying), you have two recommended ways to deploy this onto GitHub and the cloud:

### Method 1: Deploying Full-Stack (Highly Recommended)
To preserve the live stream proxy (preventing CORS or geo-blocking errors in the browser), deploy to a server host that supports full-stack applications:
1. **Render** (https://render.com)
2. **Koyeb** (https://koyeb.com)
3. **Railway** (https://railway.app)

**Instructions**:
* Create a new repository on **GitHub** and push all files.
* Create a new Web/Web-Service in your hosting dashboard and link your repository.
* Set the build and start scripts in your deployment configuration:
  - **Build Command**: `npm run build`
  - **Start Command**: `npm run start`
* The application compiles the frontend into static files, and boots up the Express proxy on port `3000` automatically.

---

### Method 2: Deploying to Cloudflare Pages (Frontend-Only Static)
Cloudflare Pages specializes in lightning-fast Static Page Applications (SPAs).
1. Connect your GitHub repository to **Cloudflare Pages**.
2. Select **Vite** as your preset template.
3. Configure settings:
   - **Build command**: `npm run build` *(To bypass backend Node binary generation issues in standard static environments, you can change the build command inside Cloudflare Pages Settings to: `vite build`)*.
   - **Build output directory**: `dist`
4. Deploy.

> ⚠️ **Note on Direct Mode**: When deployed as static-only (without the server running), select "Direct Play/Direct Mode" inside the video player controls. Dynamic proxy streams require the Express companion backend to function.
