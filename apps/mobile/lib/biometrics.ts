import * as LocalAuthentication from "expo-local-authentication";
export async function authenticateWithBiometrics(){if(!(await LocalAuthentication.hasHardwareAsync())||!(await LocalAuthentication.isEnrolledAsync()))return false;return (await LocalAuthentication.authenticateAsync({promptMessage:"Unlock FOXSCAN",fallbackLabel:"Use device passcode"})).success;}
