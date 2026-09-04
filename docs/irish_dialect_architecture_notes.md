# Irish English Dialect Support Notes

Source reviewed: `/home/ubuntu/upload/Zero-TokenAccent-AwarePhonicsArchitecture.pdf`

Additional sources reviewed:

1. Isa, A. (2025), [Comparison of vowel systems in British, American and Irish English: a review](https://journals.linguisticsociety.org/proceedings/index.php/PLSA/article/view/5968). Its abstract identifies rhoticity and lexical-set differences as salient distinctions between the compared varieties.
2. [Oxford English Dictionary: Irish English](https://www.oed.com/information/understanding-entries/pronunciation/world-englishes/irish-english/). The retrieved page confirmed its World Englishes context, but the detailed pronunciation entry was not publicly available in the extraction.

## Key findings carried forward into implementation

The supplied architecture argues that dialect handling should happen **upstream of mastery/error scoring**, so regional pronunciation differences are not treated as decoding mistakes.

It identifies several dialect-sensitive cases that are relevant to Reader Leader’s English read-aloud workflow:

| Area | Example from source | Implementation implication |
| --- | --- | --- |
| TRAP-BATH split | `bath` may surface as `/b-ah-th/` rather than RP-like broad-vowel forms | Do not automatically penalise vowel-quality differences alone. |
| Rhoticity | Ulster, Scots, and some GA-like pronunciations may realise post-vocalic `/r/` in words like `park` | Treat presence/absence of post-vocalic `r` as potentially dialectal, not automatically incorrect. |
| Diphthong variation/fronting | Realisations such as `caught/cot`-style mergers or regional diphthong movement | Keep these as review-sensitive rather than firm errors when lexical identity still aligns. |

The source proposes a multi-pronunciation lexicon or OR-graph approach rather than a single standard pronunciation path. For Reader Leader, the practical analogue is to allow a **small reviewed list of dialect-tolerant pronunciation/word-identity variants** in analysis rather than claiming full phoneme-level dialect recognition.

The source explicitly distinguishes:

> Acceptable dialect shifts from untaught decoding errors.

That distinction fits Reader Leader’s existing safeguards: low-confidence or ambiguous cases should remain **teacher-review prompts**, not final automatic judgements.

The document also recommends deterministic normalisation before downstream retrieval or mastery updates. In Reader Leader, this supports adding a deterministic **dialect-variation tolerance layer** in the transcript/word-comparison logic before session metrics and feedback are finalised.

## Constraints for Reader Leader

Reader Leader currently uses built-in Whisper transcription with segment timestamps, not a custom phoneme aligner. Therefore the implementation should:

1. Support a **limited Irish English-aware variation set** rather than claiming broad accent recognition.
2. Avoid diagnostic or production-grade statements about dialect recognition quality.
3. Preserve the existing teacher-facing review language for uncertain observations.
4. Keep any tolerance rules transparent, testable, and easy to extend later.

## Initial candidate Irish English support scope

An appropriate MVP scope is to recognise a reviewed subset of Irish English-sensitive surface variants in read-aloud comparison logic, especially where they affect perceived correctness without changing intended lexical meaning. Any non-exact or confidence-sensitive match should still be surfaced conservatively in reports as a supportive observation for teacher confirmation.
