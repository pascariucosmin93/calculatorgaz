import { describe, expect, it } from "vitest";

import {
  EMAIL_MAX_LENGTH,
  USERNAME_MAX_LENGTH,
  validateEmail,
  validatePasswordStrength,
  validateUsername
} from "../lib/validation";

describe("validateUsername", () => {
  it("respinge username prea scurt", () => {
    expect(validateUsername("ab")).toMatch(/cel puțin/);
  });

  it("respinge username prea lung", () => {
    expect(validateUsername("a".repeat(USERNAME_MAX_LENGTH + 1))).toMatch(/maximum/);
  });

  it("acceptă un username valid", () => {
    expect(validateUsername("user123")).toBeNull();
  });
});

describe("validateEmail", () => {
  it("respinge un email fără @ sau domeniu", () => {
    expect(validateEmail("not-an-email")).not.toBeNull();
  });

  it("respinge un email prea lung", () => {
    const longEmail = `${"a".repeat(EMAIL_MAX_LENGTH)}@example.com`;
    expect(validateEmail(longEmail)).toMatch(/maximum/);
  });

  it("acceptă un email valid", () => {
    expect(validateEmail("test@example.com")).toBeNull();
  });
});

describe("validatePasswordStrength", () => {
  it("respinge o parolă prea scurtă", () => {
    expect(validatePasswordStrength("a1")).toMatch(/cel puțin/);
  });

  it("respinge o parolă prea lungă", () => {
    expect(validatePasswordStrength("a1".repeat(100))).toMatch(/maximum/);
  });

  it("respinge o parolă fără cifre", () => {
    expect(validatePasswordStrength("abcdefgh")).toMatch(/literă și o cifră/);
  });

  it("respinge o parolă fără litere", () => {
    expect(validatePasswordStrength("12345678")).toMatch(/literă și o cifră/);
  });

  it("acceptă o parolă validă", () => {
    expect(validatePasswordStrength("abcd1234")).toBeNull();
  });
});
