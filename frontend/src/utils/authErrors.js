const MESSAGE_KEYS = {
  "Invalid identifier or password": "error.invalidCredentials",
  "Email or Username are already taken": "error.alreadyTaken",
  "Your account has been blocked by an administrator": "error.blocked",
  "Register action is currently disabled": "error.registerDisabled",
  "The provided current password is invalid": "error.currentPasswordInvalid",
  "Your new password must be different than your current password":
    "error.passwordSame",
  "Passwords do not match": "error.passwordMismatch",
  "Этот email уже используется": "error.emailTaken",
  "Этот номер телефона уже используется": "error.phoneTaken",
};

export const errorKey = (message, fallbackKey) =>
  MESSAGE_KEYS[message] ?? fallbackKey;
