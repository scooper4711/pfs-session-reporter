# Implementation Plan: UTF-16LE Clipboard Encoding

## Overview

Add encoding detection and UTF-16LE decoding to `clipboard-parser.ts` so the Dual_Parsing_Pipeline correctly handles both UTF-16LE and UTF-8 base64 payloads from the chronicle generator. All changes are scoped to `src/shared/clipboard-parser.ts` and its test files.

## Tasks

- [x] 1. Add encoding detection and UTF-16LE decoding functions
  - [x] 1.1 Add `EncodingType` type alias and `detectEncoding` function to `src/shared/clipboard-parser.ts`
    - Define `type EncodingType = 'utf-16le' | 'utf-8'`
    - Implement `detectEncoding(binaryString: string, maxSampleBytes?: number): EncodingType`
    - Return `'utf-8'` for empty strings and odd-length strings
    - Return `'utf-16le'` when every sampled odd-indexed byte is 0x00 and length is even
    - Default `maxSampleBytes` to a reasonable sample cap (e.g., 64)
    - Export the function for direct testing
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 1.2 Add `decodeUtf16Le` function to `src/shared/clipboard-parser.ts`
    - Implement `decodeUtf16Le(binaryString: string): string`
    - Read bytes in pairs: `charCode = lowByte + (highByte << 8)`
    - Silently ignore trailing byte if input has odd length
    - Export the function for direct testing
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 1.3 Modify `parseClipboardData` to use encoding detection
    - Insert `detectEncoding` call after `tryBase64Decode` succeeds
    - Conditionally call `decodeUtf16Le` when encoding is `'utf-16le'`
    - Pass decoded text (UTF-16LE or direct) to `tryParseJson`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3_

- [x] 2. Checkpoint - Verify core implementation compiles
  - Ensure all code compiles without type errors, ask the user if questions arise.

- [x] 3. Add unit tests for new functions
  - [x] 3.1 Create `src/shared/clipboard-parser.test.ts` with unit tests
    - Test `detectEncoding` with empty string → `'utf-8'`
    - Test `detectEncoding` with known UTF-16LE binary string (using `encodeUtf16LeBase64` from `pfs-chronicle-generator/scripts/model/session-report-serializer`) → `'utf-16le'`
    - Test `detectEncoding` with known UTF-8 binary string (`atob(btoa('{"a":1}'))`) → `'utf-8'`
    - Test `detectEncoding` with odd-length binary string → `'utf-8'`
    - Test `decodeUtf16Le` with known UTF-16LE binary string → correct decoded string
    - Test `decodeUtf16Le` with odd-length input → ignores trailing byte, no error
    - Test `parseClipboardData` with UTF-16LE base64 payload → correct SessionReport
    - Test `parseClipboardData` with UTF-8 base64 payload → correct SessionReport (regression)
    - Test `parseClipboardData` with raw JSON → correct SessionReport (regression)
    - Test `parseClipboardData` with garbage input → `null` (regression)
    - Import `encodeUtf16LeBase64` via relative path `../../../pfs-chronicle-generator/scripts/model/session-report-serializer` for encoding test data
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 2.2, 2.3, 2.5, 2.6, 3.1, 3.2, 3.3, 5.2, 5.3_

- [x] 4. Add property-based tests for correctness properties
  - [x] 4.1 Write property test for UTF-16LE encoding detection (Property 1)
    - **Property 1: UTF-16LE Encoding Detection**
    - Generate random SessionReport → `serializeSessionReport(report, false)` → `atob()` → `detectEncoding` → assert `'utf-16le'`
    - Reuse existing `sessionReportArbitrary` from the property test file
    - Import `serializeSessionReport` and `encodeUtf16LeBase64` from `pfs-chronicle-generator`
    - **Validates: Requirements 1.2, 6.4**

  - [x] 4.2 Write property test for UTF-8 encoding detection (Property 2)
    - **Property 2: UTF-8 Encoding Detection**
    - Generate random ASCII JSON objects → `btoa()` → `atob()` → `detectEncoding` → assert `'utf-8'`
    - Use `fc.record` with ASCII string fields → `JSON.stringify`
    - **Validates: Requirements 1.3, 1.4, 6.5**

  - [x] 4.3 Write property test for UTF-16LE decode round-trip (Property 3)
    - **Property 3: UTF-16LE Decode Round-Trip**
    - Generate random ASCII strings → `encodeUtf16LeBase64` → `atob()` → `decodeUtf16Le` → assert equals original
    - Use `fc.string` with `grapheme-ascii` unit
    - Import `encodeUtf16LeBase64` from `pfs-chronicle-generator`
    - **Validates: Requirements 2.2, 5.2, 5.4**

  - [x] 4.4 Write property test for UTF-16LE end-to-end round-trip (Property 4)
    - **Property 4: UTF-16LE End-to-End Round-Trip**
    - Generate random SessionReport → `serializeSessionReport(report, false)` → `parseClipboardData` → assert deep equals original
    - Reuse existing `sessionReportArbitrary`
    - Import `serializeSessionReport` from `pfs-chronicle-generator`
    - **Validates: Requirements 6.1**

  - [x] 4.5 Verify existing Property 5 (invalid data rejection) still passes
    - **Property 5: Invalid Data Rejection**
    - Run existing Property 3 in `clipboard-parser.property.test.ts` — it must continue passing after the changes
    - No new code needed; this is a regression check
    - **Validates: Requirements 2.5, 2.6**

- [x] 5. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass (unit and property), ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- The design uses TypeScript throughout — all code examples use TypeScript
- Cross-project imports from `pfs-chronicle-generator` use relative paths since both projects share the same monorepo root (`pfs-tools/`)
- Property tests use `fast-check` with a minimum of 100 iterations per property
- The existing `sessionReportArbitrary` in `clipboard-parser.property.test.ts` should be extracted or duplicated for reuse in new property tests
- All new functions are added to the existing `clipboard-parser.ts` — no new modules are created
