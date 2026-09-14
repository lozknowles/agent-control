# Report output profiles: qualification record

Baseline: released v4.7.1, `2fd8336ab5a856836b7116340312ebbc337884d6`.
Qualified implementation: `232544efe54b50e2cf55e9732d1b7cb7d00deed7`.

This is a 4.7.x patch candidate. It has not been merged, tagged, published or deployed to the operational estate.

## Existing machinery and implementation

The implementation extends the existing core Job `spec` and parameterized definition `outputs`, retaining their versioned run snapshots. It reuses canonical results, hash-checked artifacts, authorised Inspector/history projections, authentication/redaction and browser downloads. Simple, Detailed and Evidence are deterministic views of one saved result. There is no new report database, model graph, document renderer or paid provider integration.

Jobs and Run Inspector expose Outputs with a catalogue-controlled default, file downloads and separate History access. Markdown and plain text provide human-readable files; JSON provides evidence or an explicitly selected filtered report. The CLI writes real files, verifies their hashes and refuses overwrite. Multi-parcel reports preserve all owned parcel projections and the parent result/history.

## Verification

Full `npm run check` passed on the qualified implementation: **1,562 passed, 0 failed, 0 skipped**, including type checking and the existing bootstrap checks. Fourteen focused tests cover defaults, profile scope, same-run provenance, complete detailed/evidence preservation, redaction, filenames, authentication, owned-artifact access, multi-parcel aggregation, catalogue declarations, API downloads and actual CLI files/overwrite refusal.

Browser verification: 16 checks across 1440 x 1000 desktop and 390 x 844 mobile/touch viewports, each in system light and dark mode. Each context navigated Jobs -> completed run -> Outputs, verified Simple default, selected all three profiles and downloaded the actual files. Browser bytes matched API hashes; profile source hashes matched. Selectors have at least 44px height. Difficulty tables become readable mobile cards. Parent job status is shown in Outputs. No viewport overflow or page errors were recorded; live theme changes retained the selected profile.

CLI verification wrote Simple Markdown, Detailed Markdown, Evidence JSON and plain text. Download comparisons retained the identical canonical run, history, provider response IDs, invocation count and execution sequence. Outputs never dispatch analysis.

## Real acceptance case and limits

Run `c614e964-a1f7-4d3d-82e2-29a38d823aa7` analysed two actual voice-note transcripts and a bounded capability reference in one frozen DEEP context. It recorded one subscription-backed provider invocation and six source-validated findings. All three outputs identify that same run and source projection.

The actual result is **DEGRADED / REVIEW_REQUIRED**, because speech terminology and requested behaviour contain unresolved ambiguities. The reports preserve this verdict; completed report-generation qualification is not proof that the requests within the speech were implemented.

An earlier immutable attempt `6de6e46b-04dd-4705-9571-03d7a1d4684d` failed because STANDARD repository context omitted the Markdown inputs. The corrected run followed a preflight confirming all four documents in one chunk. The entire acceptance exercise therefore involved two attempted analysis invocations; viewing/downloading profiles caused no additional invocation.

Raw and separately normalised transcripts remain preserved with recognition provenance and original audio hashes. Recognition confidence and exact word timings are unavailable. The second recording required two contiguous local-recogniser segments after whole-recording transcription failed; that recovery is distinct from the governed analysis. Uncertain terms remain marked probable. Private recordings, transcripts, reports, screenshots and full receipts are retained in the operator's evidence area and Downloads, outside public source pulls.

Limitations: mobile/touch evidence is viewport emulation, not fresh physical Pixel qualification. Monetary cost is unavailable on the subscription-backed route. Exports preserve existing retention/redaction boundaries and unavailable evidence stays unavailable. Downloads are on-demand; continuous JSONL/event-log writing is not part of this change. No PDF/ZIP renderer was added.

## Output integrity

Source projection SHA-256: `47bcdcac6b889ab0ca7a635e9ecea15968f228ae4a283989314537717f180ebd`

| Output | SHA-256 |
| --- | --- |
| Simple Markdown | `55d9c53ccd45c7ca920cc161dce27c8650672caa5f2240e57c9c1d2ec22843d1` |
| Detailed Markdown | `00fc6f0ac1821cf1fa97d7613724d0f84fd64a8331d05f2b6ccfae958cf31f70` |
| Evidence JSON | `7022c57a9dd0e7ca273b52912d8dd976302524aa5cae56d773a69e8980a8fde2` |
| Simple plain text | `f42b853f5eb182568e64984bdf6120883feaaca6b81d2795515f23aa3410930c` |

[API, CLI and catalogue guide](report-output-profiles.md).


