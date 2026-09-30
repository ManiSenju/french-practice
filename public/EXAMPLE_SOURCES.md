# Example sentences and attribution

All 4,354 vocabulary entries and 47 verb cards have French–English examples.
Previously available examples are retained on 778 entries. Missing examples were
filled with Tatoeba pairs on 2,545 entries and original AI-assisted practice
sentences on 1,078 entries.

## Tatoeba

Tatoeba sentences are distributed under CC BY 2.0 FR:
https://creativecommons.org/licenses/by/2.0/fr/
Source and terms: https://tatoeba.org/en/downloads
https://tatoeba.org/eng/terms_of_use

Bilingual pairs came from OPUS Tatoeba release v2026-07-08:
https://object.pouta.csc.fi/OPUS-Tatoeba/v2026-07-08/moses/en-fr.txt.zip

Credit: Tatoeba contributors. Individual authors and sentence links, where found
in Tatoeba's detailed language exports, are recorded per sentence in
vocabulary_examples.json and displayed with the examples. Records unavailable
in those exports retain collective attribution and their OPUS corpus line.
Corpus text is retained verbatim; replacement sentences are marked original.

OPUS reference: Jörg Tiedemann (2012), Parallel Data, Tools and Interfaces in
OPUS, Proceedings of LREC 2012.
http://www.lrec-conf.org/proceedings/lrec2012/pdf/463_Paper.pdf

## Existing examples and original practice examples

Existing Anki examples retain their original source metadata. This notice does
not change the licensing of the original decks or other repository content.
Newly constructed examples are explicitly marked Original practice example
(AI-assisted); they are not quotations from an external dictionary.

## Level and quality limits

New examples target the entry's listed level: shorter concrete examples for
A1/A2 and more contextual examples for B1/B2. Targets are estimates, not certified
CEFR ratings. Corpus candidates were matched using French forms and English
senses, then received targeted checks and replacements; not every corpus pair
has had an independent linguistic review. Existing source examples retain their
original wording and were not rewritten to meet level targets.

Usage notes clarify selected source spelling, meaning, and register problems.
Underlying entry labels and stable progress IDs remain unchanged. Complete
example coverage does not imply every original vocabulary gloss is error-free.

## Rebuilding

vocabulary_examples.json is the durable example manifest keyed by stable entry
IDs. Both the Python dataset build and the web export consume it. The web build
fails if entries are missing, obsolete, mismatched, or lack either language.
