# Requirements Document

## Introduction

The pfs-chronicle-generator project encodes Session_Report data to the clipboard using two modes:

1. Default mode: JSON string → encode each character as 2-byte UTF-16LE → base64 encode the bytes → write the base64 string to the clipboard via `navigator.clipboard.writeText()`
2. Alt-click mode: JSON string → write the raw JSON string to the clipboard via `navigator.clipboard.writeText()`

Both modes use `navigator.clipboard.writeText()`, so the clipboard always contains a plain text string. The character encoding (UTF-16LE) is embedded inside the base64 payload, not at the clipboard transport level.

The pfs-session-reporter extension reads the clipboard with `navigator.clipboard.readText()` and runs a Dual_Parsing_Pipeline: try raw JSON parse first, then try base64-decode + JSON parse. The raw JSON path works correctly for alt-click mode. The base64 decode path must handle payloads encoded in either UTF-8 or UTF-16LE, because:

- The current chronicle generator encodes base64 payloads as UTF-16LE (to match RPG Chronicles' expected format).
- A future or alternative encoder could produce UTF-8 base64 payloads (the simpler `btoa(json)` approach).
- Both encodings are valid base64 strings that decode successfully with `atob()`, but the resulting byte sequences require different interpretation.

The Clipboard_Parser must auto-detect which encoding was used after `atob()` decoding and interpret the bytes accordingly. The detection heuristic exploits a structural property of UTF-16LE: when encoding ASCII-range text (which JSON predominantly is), every odd-indexed byte is 0x00. UTF-8 encoded ASCII text contains no null bytes.

## Glossary

- **Extension**: The Chrome/Edge browser extension (Manifest V3) that reads clipboard data and fills the Paizo session reporting form
- **Session_Report**: The JSON data structure containing session reporting data, placed on the clipboard by pfs-chronicle-generator
- **Clipboard_Parser**: The module (`clipboard-parser.ts`) responsible for decoding and parsing clipboard data into a Session_Report object
- **Dual_Parsing_Pipeline**: The existing two-step parsing strategy in the Clipboard_Parser that first attempts to parse a string as raw JSON, and on failure attempts to base64-decode the string then parse the result as JSON
- **UTF-16LE**: Little-endian UTF-16 character encoding, where each code unit is stored as a 2-byte pair with the least significant byte first (e.g., `{` → `[0x7B, 0x00]`)
- **UTF-8**: Variable-length character encoding where ASCII-range characters (U+0000–U+007F) are stored as single bytes with no null padding
- **Base64_Payload**: A base64-encoded string on the clipboard whose decoded bytes represent either UTF-16LE or UTF-8 encoded JSON text
- **Encoding_Detector**: The function responsible for examining raw bytes from `atob()` output and determining whether the bytes represent UTF-16LE or UTF-8 encoded text
- **Null_Byte_Heuristic**: The detection method that identifies UTF-16LE encoding by checking whether every odd-indexed byte in the `atob()` output is 0x00, which is the characteristic pattern of ASCII-range text encoded as UTF-16LE

## Requirements

### Requirement 1: Detect Base64 Payload Encoding

**User Story:** As a developer, I want a dedicated function that detects whether `atob()` output bytes represent UTF-16LE or UTF-8 encoded text, so that the Clipboard_Parser can correctly decode base64 payloads from any encoder.

#### Acceptance Criteria

1. THE Encoding_Detector SHALL accept a raw binary string (as returned by `atob()`) and return an encoding identifier of either `utf-16le` or `utf-8`
2. WHEN the binary string has an even length and every odd-indexed byte (positions 1, 3, 5, ...) has char code 0x00, THE Encoding_Detector SHALL return `utf-16le`
3. WHEN the binary string has an odd length, THE Encoding_Detector SHALL return `utf-8`
4. WHEN any odd-indexed byte has a char code other than 0x00, THE Encoding_Detector SHALL return `utf-8`
5. WHEN the binary string is empty, THE Encoding_Detector SHALL return `utf-8`
6. THE Encoding_Detector SHALL examine a sufficient sample of odd-indexed bytes to make the determination without requiring a full scan of large payloads

### Requirement 2: Decode Base64 Payload Using Detected Encoding

**User Story:** As a GM, I want the extension to correctly decode base64 clipboard data regardless of whether the payload was encoded as UTF-16LE or UTF-8, so that session report JSON from any encoder version is parsed correctly.

#### Acceptance Criteria

1. WHEN the Dual_Parsing_Pipeline receives a Base64_Payload, THE Clipboard_Parser SHALL base64-decode the string using `atob()`, detect the encoding using the Encoding_Detector, and decode the bytes according to the detected encoding
2. WHEN the Encoding_Detector returns `utf-16le`, THE Clipboard_Parser SHALL interpret the bytes as UTF-16LE pairs (low byte first, high byte second), reconstructing each character as `lowByte + (highByte << 8)`
3. WHEN the Encoding_Detector returns `utf-8`, THE Clipboard_Parser SHALL use the `atob()` output directly as the decoded string
4. WHEN the decoded string contains valid JSON representing a Session_Report, THE Clipboard_Parser SHALL parse the string as JSON and return the Session_Report
5. IF the base64 decoding fails (invalid base64 input), THEN THE Clipboard_Parser SHALL return null
6. IF the decoded string is not valid JSON, THEN THE Clipboard_Parser SHALL return null

### Requirement 3: Preserve Raw JSON Parsing Path

**User Story:** As a GM, I want the extension to continue parsing raw JSON clipboard data, so that alt-click (debug) mode from the chronicle generator still works.

#### Acceptance Criteria

1. THE Dual_Parsing_Pipeline SHALL first attempt to parse the clipboard text as raw JSON before attempting base64 decoding
2. WHEN the clipboard text is valid raw JSON representing a Session_Report, THE Clipboard_Parser SHALL return the parsed Session_Report without attempting base64 decoding
3. WHEN the clipboard text is not valid raw JSON, THE Clipboard_Parser SHALL proceed to the base64 decode path described in Requirement 2

### Requirement 4: Preserve Clipboard Reading Mechanism

**User Story:** As a developer, I want the extension to continue using `navigator.clipboard.readText()` for clipboard access, so that no unnecessary API changes are introduced.

#### Acceptance Criteria

1. THE Extension SHALL continue to use `navigator.clipboard.readText()` to read clipboard data as a plain text string
2. THE Extension SHALL pass the clipboard text string to the Clipboard_Parser for decoding and parsing
3. IF `navigator.clipboard.readText()` fails or returns an empty string, THEN THE Extension SHALL display an error message in the popup indicating the clipboard could not be read

### Requirement 5: UTF-16LE Decoding Function

**User Story:** As a developer, I want a dedicated function for interpreting `atob()` output bytes as UTF-16LE, so that the decoding logic is isolated and testable.

#### Acceptance Criteria

1. THE Clipboard_Parser SHALL expose a function that accepts a raw binary string (as returned by `atob()`) and returns a decoded string by interpreting the bytes as UTF-16LE pairs
2. THE decoding function SHALL read bytes in pairs: for each pair at positions `[2i, 2i+1]`, the character code is `charCode(2i) + (charCode(2i+1) << 8)`
3. IF the binary string has an odd number of bytes, THEN THE decoding function SHALL ignore the trailing byte
4. FOR ALL valid JSON strings, encoding to UTF-16LE bytes via the chronicle generator's `encodeUtf16LeBase64` then base64-decoding with `atob()` then interpreting with the decoding function SHALL produce the original JSON string (round-trip property)

### Requirement 6: End-to-End Round-Trip

**User Story:** As a developer, I want to verify that the full encode-decode pipeline produces equivalent Session_Report objects for both encoding formats, so that data integrity is guaranteed between the chronicle generator and the session reporter.

#### Acceptance Criteria

1. FOR ALL valid Session_Report objects, serializing with `serializeSessionReport(report, false)` (UTF-16LE base64 mode) then parsing with `parseClipboardData` SHALL produce an equivalent Session_Report object (round-trip property)
2. FOR ALL valid Session_Report objects, serializing with `serializeSessionReport(report, true)` (raw JSON mode) then parsing with `parseClipboardData` SHALL produce an equivalent Session_Report object (round-trip property)
3. FOR ALL valid JSON strings, encoding as UTF-8 base64 via `btoa(jsonString)` then parsing with `parseClipboardData` SHALL produce an equivalent object to `JSON.parse(jsonString)` (round-trip property for UTF-8 path)
4. FOR ALL valid Session_Report objects, the Encoding_Detector SHALL return `utf-16le` when given the `atob()` output of a UTF-16LE Base64_Payload produced by `encodeUtf16LeBase64` (detection correctness property)
5. FOR ALL valid JSON strings containing only ASCII-range characters, the Encoding_Detector SHALL return `utf-8` when given the `atob()` output of `btoa(jsonString)` (detection correctness property)
