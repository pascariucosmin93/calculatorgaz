export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 32;
export const EMAIL_MAX_LENGTH = 254;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export function validateUsername(username: string): string | null {
  if (!username || username.length < USERNAME_MIN_LENGTH) {
    return `Numele de utilizator trebuie să aibă cel puțin ${USERNAME_MIN_LENGTH} caractere.`;
  }
  if (username.length > USERNAME_MAX_LENGTH) {
    return `Numele de utilizator poate avea maximum ${USERNAME_MAX_LENGTH} caractere.`;
  }
  return null;
}

export function validateEmail(email: string): string | null {
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return "Introdu o adresă de email validă.";
  }
  if (email.length > EMAIL_MAX_LENGTH) {
    return `Emailul poate avea maximum ${EMAIL_MAX_LENGTH} caractere.`;
  }
  return null;
}

export function validatePasswordStrength(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Parola trebuie să aibă cel puțin ${PASSWORD_MIN_LENGTH} caractere.`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Parola poate avea maximum ${PASSWORD_MAX_LENGTH} caractere.`;
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "Parola trebuie să conțină cel puțin o literă și o cifră.";
  }
  return null;
}
