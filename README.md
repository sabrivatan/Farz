# Farz Mobile App

"Farz" is a mobile application designed to help users calculate and track their missed prayers (Kaza) and fasting days. It features a modern, user-friendly interface and local-first data storage.

## Features

- **Local First:** All data is stored securely on your device using SQLite.
- **Onboarding Wizard:** Calculate your estimated missed prayers based on your birth date and age of responsibility.
- **Dashboard:** View your total debt and track your daily progress.
- **Quick Logging:** Easily log performed Kaza prayers with a single tap.
- **History (Logs):** View a detailed history of all your actions.
- **Settings:** Manage your profile and reset your data.
- **Dark Mode:** Built-in dark theme for comfortable usage.

## Tech Stack

- **Framework:** React Native (Expo)
- **Language:** TypeScript
- **Styling:** NativeWind (Tailwind CSS)
- **Database:** Expo SQLite
- **Icons:** Lucide React Native
- **Navigation:** Expo Router

## Getting Started

1.  **Install Dependencies:**

    ```bash
    npm install
    ```

2.  **Run the App:**

    ```bash
    npm run dev
    ```

3.  **View on Device:**
    - Download **Expo Go** from the App Store or Google Play.
    - Scan the QR code shown in the terminal.

## Building for Production

To build the app for Android or iOS stores:

1.  Install EAS CLI: `npm install -g eas-cli`
2.  Login to Expo: `eas login`
3.  Configure Build: `eas build:configure`
4.  Run Build: `eas build -p android` (or `ios`)

## License

This project is open source and available under the [MIT License](LICENSE).
