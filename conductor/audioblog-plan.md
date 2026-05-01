# AudioBlog Implementation Plan

## Objective
Create a simple, self-contained, browser-based audio blogging platform. Users can record audio from their device, transcribe it using the Gemini 2.5 Flash API, edit the text, and publish the post directly to a GitHub Pages repository using a GitHub Personal Access Token.

## Tech Stack
*   **Frontend:** Vanilla JS, HTML5, CSS (Pico.css for rapid, clean styling).
*   **Static Site Generator:** Jekyll (GitHub Pages default).
*   **AI Service:** Gemini 2.5 Flash (via REST API).
*   **Hosting:** GitHub Pages (for both the blog and the "Creator Dashboard").

## Architecture

The project consists of two logical parts within the same repository:
1.  **The Blog (Jekyll):** Standard Jekyll directory structure (`_posts`, `assets`, etc.) to render the public-facing blog.
2.  **The Creator Dashboard (Vanilla JS SPA):** A secure, client-side-only web app (e.g., `admin/index.html` or similar) used to author new posts.

### Data Flow
1.  **Record:** User records audio via `MediaRecorder` API in the browser.
2.  **Transcribe:** The audio blob is converted to Base64 and sent to the Gemini 2.5 Flash API (`generateContent`) along with a prompt to transcribe.
3.  **Review:** The transcribed text is displayed in an editable textarea. The user can modify the text, title, and date.
4.  **Publish:** The JS app uses the GitHub REST API (`PUT /repos/{owner}/{repo}/contents/{path}`) to commit two files:
    *   The Audio file (e.g., `assets/audio/2026-05-01-my-post.webm`).
    *   The Markdown file (e.g., `_posts/2026-05-01-my-post.md`), containing Front Matter (title, date, audio path) and the transcribed text.

## Implementation Steps

### Phase 1: Setup & Scaffolding
1.  Initialize a basic Jekyll structure (`_config.yml`, `index.html`, `_layouts/default.html`).
2.  Create the Creator Dashboard HTML shell (`admin/index.html`).
3.  Implement basic CSS styling (Pico.css via CDN) for the dashboard.
4.  Implement a settings modal/section to accept and save the Gemini API Key, GitHub PAT, Repo Owner, and Repo Name to `localStorage`.

### Phase 2: Audio Recording & Transcription
1.  Implement `MediaRecorder` logic to capture audio from the microphone.
2.  Add UI controls (Start/Stop recording, visual indicator).
3.  Implement the Gemini API integration:
    *   Convert recorded Blob to Base64.
    *   Construct the `gemini-2.5-flash` API payload.
    *   Handle the API response and extract the transcription text.
    *   Suggest a title based on the transcription (optional, or just use a default timestamp).

### Phase 3: Review & Publish
1.  Create the Review UI: Text inputs for Title, Date (auto-filled), and a textarea for the transcription.
2.  Implement the GitHub API integration:
    *   Create helper functions for Base64 encoding files for GitHub.
    *   Implement the `PUT` request to commit the audio file to `assets/audio/`.
    *   Construct the Jekyll Markdown file content (Front Matter + Body).
    *   Implement the `PUT` request to commit the Markdown file to `_posts/`.
3.  Add error handling and success notifications.

### Phase 4: Final Polish
1.  Ensure the public Jekyll blog template correctly displays the audio player and the text.
2.  Test the full flow locally.

## Security & Privacy
*   **Credentials:** Keys are stored *only* in the browser's `localStorage`. They are never sent to a backend (other than the respective Google/GitHub APIs) and never committed to the repository.
*   **Audio Limits:** The implementation will rely on Gemini's direct payload limit (~7MB). If the recording exceeds this, the UI should notify the user or prevent transcription.

## Verification
1.  Can save settings locally.
2.  Can record audio and receive a transcription from Gemini.
3.  Can edit the transcription.
4.  Can successfully push both the audio and markdown files to the configured GitHub repository.
5.  The Jekyll blog builds and displays the new post with a working audio player.