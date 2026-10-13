# Clinical dashboard

The dashboard follows the green-and-white clinical workspace reference. Signed-in accounts read their saved patients, notes, and appointments from `GET /dashboard`. The logged-out showcase uses separate, explicitly labeled sample data.

## Connected workflows

- Record visit, upload audio, and type notes open the note editor with the chosen patient and capture mode.
- Search finds saved patients and notes. Review cards open the saved draft.
- Week cards filter the note list by draft, generated SOAP, edited, or finalized state.
- Check-in updates the appointment record. Schedule supports week navigation, appointment creation, check-in, deletion, and chart/note navigation.
- SOAP sections persist through saving and reopening. The editor allows corrections to each section. Corrected sections are included in exported note text.
- Finalization sets the signing timestamp and locks editing and regeneration in the API. Partially filled SOAP notes must be completed, including explicitly marking unrecorded sections as “Not documented.”
- Totals use all saved notes, rather than the old ten-row notes-list default. Time savings are labeled estimates from recorded creation times and a 15-minute baseline; they are not clinical accuracy measurements.

## Run locally

Install Python dependencies with `pip install -r requirements.txt`. Install ffmpeg for Whisper audio decoding. Configure `DATABASE_URL`, a secure `SECRET_KEY`, and `OPENAI_API_KEY` for SOAP generation, using `.env.example` as a starting point. Run `uvicorn app.main:app --reload` in the repository root.

In `scribsy-frontend`, run `npm ci` and `npm run dev`. The frontend proxies `/api` to the local backend in development. Set `BACKEND_URL` when using a different backend. Deploy the frontend and backend from the same revision because the new dashboard requires the new endpoint.

Whisper runs on the backend and loads its model on first use. The ordinary recording workflow processes audio after recording stops; it does not offer background streaming. Missing AI configuration is reported visibly, and manually typed notes remain usable.

## Verification

- Backend: `pip install pytest httpx` then `python -m pytest -q`. Tests configure their own temporary database and upload directory.
- Frontend: `npx tsc --noEmit` and `npm run build`. Type checking is enabled during production builds. The standalone landing-page prototype is excluded from the Next.js app's TypeScript inputs.
- The API integration tests cover account isolation, more than ten saved notes, audio upload → transcript/SOAP → save → reopen, check-in persistence, structured AI response parsing, missing AI configuration, SOAP correction, finalization locks, PDF export, timing route resolution, and preference saving.

Live OpenAI responses and Whisper inference require configured services and a loaded model. Mocked AI tests validate the integration contract without claiming to validate model output quality.
