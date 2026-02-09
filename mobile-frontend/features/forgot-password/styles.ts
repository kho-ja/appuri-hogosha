import { StyleSheet } from 'react-native';
import { colors } from '@/constants/Colors';

export const forgotPasswordStyles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
    alignContent: 'center',
  },
  submitButton: {
    padding: 16,
    borderRadius: 12,
    marginTop: 40,
    backgroundColor: colors.primary,
  },
  header: {
    marginBottom: 60,
  },
  title: {
    fontWeight: '600',
    fontSize: 32,
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Verification step styles
  phoneNumberDisplay: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
    color: colors.primary,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  codeInput: {
    width: 45,
    height: 50,
    borderWidth: 2,
    borderRadius: 8,
    fontSize: 18,
    fontWeight: '600',
    borderColor: colors.gray300,
  },
  // OTP input styles
  otpContainer: {
    width: '100%',
  },
  otpInputsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  otpText: {
    fontSize: 18,
    fontWeight: '600',
  },
  countdown: {
    textAlign: 'center',
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 20,
  },
  expiredText: {
    fontSize: 14,
    color: 'red',
    marginBottom: 16,
    textAlign: 'center',
  },
  disabledButton: {
    backgroundColor: colors.primary,
    opacity: 0.6,
  },
  // Resend functionality styles
  resendContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  resendHelpText: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 8,
    textAlign: 'center',
  },
  resendText: {
    fontSize: 16,
    fontWeight: '600',
  },
  backToSignInContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  backToSignInText: {
    fontSize: 14,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});
