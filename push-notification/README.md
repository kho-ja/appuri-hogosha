# Firebase Cloud Message Connection Manual
#### This guide will walk you through setting up Firebase Cloud Messaging (FCM) with clear, step-by-step instructions. By the end, you’ll have an FCM-enabled Firebase project with your private key saved and ready for server authentication.

---
## **1. Firebase Account Setup**
If you don’t already have a Firebase account, follow these steps to create one:

1. Go to Firebase’s official website: Visit Firebase: https://firebase.google.com/ 
2. Click “Get Started”: This will prompt you to log in with an existing Google account or create a new one if you don’t have one yet.
3. Sign In or Create a Google Account: Complete the login or account creation process. Once logged in, you’ll be redirected to the Firebase Console.

---

## **2. Firebase Project Creation**
To create a new Firebase project:
1. Click on `Get started with a Firebase project`.
2. Name Your Project: Enter a unique name for your project
3. Enable Google Analytics (Optional): Decide if you want to use Google Analytics. It’s optional but can be helpful for tracking app statistics.
4. Click “Continue”: Follow the prompts, especially if you’ve enabled Analytics.
5. Create the Project: Click `Create Project` and wait for the setup to complete.
6. Wait for the project to be created.
7. Go to Your Project Dashboard: Once the project is created, click `Continue` to enter your project dashboard

## **3. Enabling Firebase Cloud Messaging (FCM)**
Now, let’s enable FCM in your Firebase project.

1. Go to the Firebase Console: Visit the Firebase Console: https://console.firebase.google.com/
2. Click on your project.
3. Navigate to the Cloud Messaging tab: Click on the Cloud Messaging tab in the left sidebar. `Run > Messaging`
4. FCM should be enabled automatically. If you see additional setup prompts, follow them to enable FCM.
5. For FCM to work with Android, you need to add an Android app to your Firebase project to generate the google-services.json configuration file. To do this, click on the Android icon.
6. Enter the Android package name: Enter the package name. 
7. Click `Register App` to complete the app registration.
8. Click on `Next` to download the `google-services.json` file, but you can skip this step for now because you can download it later.
9. Choose the `Kotlin DSL` option.
10. Click on `Next` to complete the setup.
11. Click on `Continue to console` to go back to the Firebase Console.

## **4. Connecting Firebase to an Existing React Native Project**

## **5. Downloading the Private Key (Service Account Key)**
The Firebase private key is needed for server-side authentication with Firebase. Follow these steps to download it:

1. Go to Project Settings: Click on the gear icon in the left sidebar to go to your project settings then click on `Project Settings`.
2. Navigate to the Service Accounts tab: Click on the `Service Accounts` tab.
3. Scroll down to the `Firebase Admin SDK` section.
4. Click on `Generate new private key` to generate a new private key.
5. Click on `Generate key` to download the private key file.
6. Save the private key: Save the private key file to your computer. This file is a JSON file that contains your private key. You will need this file to authenticate your server with Firebase.`IMPORTANT: Keep this file secure and do not share it with anyone. If you lose this file, you will need to generate a new private key.`
7. Rename the private key file to `service.json`.
8. Place the `service.json` file in the `push-notification/src` folder.