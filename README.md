# BondsAdda Mobile

Expo (SDK 57) + React Native app for discovering and investing in bonds on BondsAdda.

**Stack:** Expo Router · Redux Toolkit + RTK Query · NativeWind 4 · expo-secure-store · TypeScript

## Getting started

```bash
npm install
# optional: edit .env to point at a staging API
npx expo start
```

The app uses native modules (SecureStore, DocumentPicker), so for device testing use a development
build: `npm run build:dev` (EAS) or `npx expo run:ios`.

## Scripts

| Command             | What it does                                                      |
| ------------------- | ----------------------------------------------------------------- |
| `npm run typecheck` | `tsc --noEmit`                                                    |
| `npm run lint`      | `expo lint`                                                       |
| `npm test`          | Unit tests (bond math, validation, API client) — offline          |
| `npm run test:api`  | Live contract tests against the production API (read-only calls) |
| `npm run doctor`    | `expo-doctor`                                                     |
| `npm run build:ios` | EAS production build for iOS                                      |
| `npm run submit:ios`| Submit the latest build to App Store Connect                      |

## Project layout

```
src/
  app/                 Expo Router routes (every file is a screen)
    (auth)/            welcome, login, signup — only reachable when signed out
    (tabs)/            home, explore, portfolio, deals, profile
    bonds/[id]/        bond detail, invest (preview + create deal), cash-flow schedule
    cashflows/[id]     saved cash-flow detail
    deals/[id]         deal detail + payment
    kyc/               status, submit KYC, bank details
    payments/          payment history
    categories.tsx
  store/
    index.ts           configureStore + signOut thunk
    hooks.ts           typed hooks, useCustomerId
    slices/authSlice.ts
    api/
      baseQuery.ts     MobileApiJson.ashx client: envelope unwrapping, retries, timeouts
      bondsAddaApi.ts  RTK Query endpoints (all 25 actions) + cache tags
      types.ts         response/request contracts
  lib/                 bondMath, validation, formatting, secure session, file picking
  components/          ui kit, bond components, forms
```

## API notes

- Every action responds **HTTP 200** with `{ Success, Message, Data }`. `Success: false` is mapped
  to an RTK Query `CUSTOM_ERROR` whose message is shown to the user.
- GETs are retried on network failure; POSTs are never retried (deal and payment creation are not
  idempotent).
- Shapes for login, profile, dashboard, deal, cash-flow and payment records could not be observed
  without a real customer account; they are read defensively via `lib/fields.ts`. Pin them in
  `store/api/types.ts` once the backend documents them.
- Deal amounts shown before investing are **indicative** and computed in `lib/bondMath.ts`
  (price per 100 FV, Actual/365 accrued interest, T+1 settlement, 0.0001% stamp duty). Confirm
  these conventions with operations.

## Release checklist (iOS)

1. `npx eas-cli@latest login` and `npx eas-cli@latest init` (writes the EAS project id into app.json).
2. Confirm `ios.bundleIdentifier` (`com.bondsadda.app`) matches the App Store Connect record.
3. `npm run build:ios` — EAS creates/manages the distribution certificate and provisioning profile.
4. `npm run submit:ios`, then complete App Privacy answers in App Store Connect to match
   `ios.privacyManifests` in app.json.
5. Provide a demo account for App Review (KYC-verified, so the invest flow is reachable).
