Absolutely — here is a clean **spec** you can copy into a file as `spec.md`. It stays big-picture and simple, and it reflects the path we’ve been talking about: local-first logger, PWA on Vercel, Supabase later, AI after the data flow is stable. [supabase](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)

***

# 4 Bigs Spec

## 1. Product goal
Build a simple poker hand logging app that works fast on a phone, stores data locally first, and later adds cloud sync and AI analysis. The first version should help a player capture hands quickly without getting in the way .

## 2. Core idea
The app is a PWA, so it behaves like a mobile app but is delivered from the web. The user installs it once on their phone, then uses it for live logging and later sees updates after new deployments. [nextjs](https://nextjs.org/docs/app/guides/progressive-web-apps)

## 3. Primary workflow
1. Open the app.
2. Start a session.
3. Log hands during play.
4. Save the session locally.
5. Review the hands later.
6. Sync to the cloud when that feature is added.
7. Send hands to AI for analysis when the AI layer is ready. [youtube](https://www.youtube.com/watch?v=52CDCXkjA2A)

## 4. Phase 1 scope
The first version should only do the essentials:
- Create a session.
- Add a hand.
- Store hand data locally.
- Edit or delete a saved hand.
- Review recent sessions.
- Work well on mobile.

This version should not depend on Supabase or AI yet.

## 5. Phase 2 scope
After the local app feels solid, add account features and cloud storage with Supabase. Supabase gives you the standard building blocks you need for auth, database, and storage in one place. This is where the app becomes cross-device instead of single-device only. [supabase](https://supabase.com/pricing)

## 6. Phase 3 scope
After syncing works, add AI analysis. The AI should read the structured hand data and return a clear review of what happened, what likely went wrong, and what to think about next time. The key is to keep the AI as a layer on top of the saved data, not as the core of the app. [youtube](https://www.youtube.com/watch?v=52CDCXkjA2A)

## 7. Tech stack
- **Frontend:** Next.js PWA.
- **Deployment:** Vercel.
- **Source control:** GitHub.
- **Local data:** Browser storage such as IndexedDB.
- **Cloud backend:** Supabase.
- **AI layer:** external model API(s) added later. [vercel](https://vercel.com/docs/plans/hobby)

## 8. Deployment flow
The working loop should be:
1. Code in Cursor.
2. Push to GitHub.
3. Vercel deploys automatically.
4. Test the PWA on your phone.
5. Fix issues in Cursor.
6. Push again.
7. Retest.
8. Repeat until the app feels good. [web](https://web.dev/learn/pwa/update)

## 9. Success criteria
The first version is successful if:
- It opens fast on mobile.
- Hands are easy to log.
- Data is not lost.
- The app feels usable during real play.
- New deployments show up reliably on the phone after refresh or reopen. [nextjs](https://nextjs.org/docs/app/guides/progressive-web-apps)

## 10. Future expansion
Once the base app is stable, the next improvements are:
- Cloud sync across devices.
- User accounts.
- AI hand review.
- Session history and filters.
- Smarter summaries and coaching output. [supabase](https://supabase.com/pricing)

***

If you want, I can write the **wireframe doc next** in the same simple format.