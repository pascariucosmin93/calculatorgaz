import { describe, expect, it } from "vitest";
import { detectPhotoContentType, readingPhotoKey } from "@/lib/reading-photo";

describe("detectPhotoContentType", () => {
  it("recognises JPEG, PNG and WebP by their magic bytes", () => {
    expect(detectPhotoContentType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00]))).toBe("image/jpeg");
    expect(detectPhotoContentType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]))).toBe("image/png");
    const webp = new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ");
    expect(detectPhotoContentType(webp)).toBe("image/webp");
  });

  it("rejects other formats and truncated input", () => {
    expect(detectPhotoContentType(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'/>"))).toBeNull();
    expect(detectPhotoContentType(new TextEncoder().encode("GIF89a......"))).toBeNull();
    expect(detectPhotoContentType(new Uint8Array([0xff, 0xd8]))).toBeNull();
    expect(detectPhotoContentType(new Uint8Array())).toBeNull();
  });
});

describe("readingPhotoKey", () => {
  it("scopes the object key to the owner", () => {
    expect(readingPhotoKey("user1", "reading1")).toBe("readings/user1/reading1");
  });
});
