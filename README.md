# The verifiability gap: lab reports posted by research peptide stores

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.23712930.svg)](https://doi.org/10.5281/zenodo.23712930)

A record-level, anonymised dataset of the lab reports (certificates of analysis, COAs) that research peptide stores post. For each report it records whether the report links to the laboratory's own copy, which lab issued it, how old it is, whether it carries a batch number and report ID, and whether it is still posted.

- **Study and findings:** https://nuuvive.com/studies/verifiability-gap
- **Publisher:** NuuVive (https://nuuvive.com)
- **Updated:** monthly. Each edition is a dated file in `data/`; `data/latest.csv` is the newest.
- **Archive:** every edition is archived on Zenodo. DOI for all versions: [10.5281/zenodo.23712930](https://doi.org/10.5281/zenodo.23712930).

## Files

| File | What it is |
|---|---|
| `data/verifiability-gap-<edition>.csv` | One row per lab report, as of that edition's snapshot date |
| `data/latest.csv` | Same as the newest edition |

## Columns

| Column | Meaning |
|---|---|
| `pb_record_id` | PeptideBenchmark record ID (stable) |
| `pb_permalink` | PeptideBenchmark page for the record |
| `vendor_code` | Store, replaced by a code (store names are not published) |
| `status` | `current` (posted at the snapshot), `retained` or `disappeared` |
| `first_observed` | First date the tracker saw the report |
| `disappeared_on` | Date it was no longer seen, if it disappeared |
| `moved_not_gone` | On disappeared reports only: `yes` when the same file or report number is still posted by that store (re-uploaded, not removed) |
| `laboratory` | Laboratory named on the report |
| `laboratory_provenance` | How the laboratory was identified (`lab-verified`, `document-extracted`, `vendor-stated`) |
| `lab_link` | `yes` when the record carries a link to the lab's own copy of the report |
| `lab_link_status`, `lab_link_host`, `lab_link_health` | Status, host and health of that link, as the tracker records them |
| `report_date`, `report_date_field`, `report_date_precision` | Report date and where it came from |
| `report_age_days` | Days between the report date and the snapshot |
| `batch_on_report` | Whether the report names a batch or lot |
| `report_id_on_report` | Whether the report carries the lab's report ID |
| `document_type` | `PDF`, `Image` or `Structured data` |
| `source` | Upstream source of the record |

## Method, in short

Each edition pulls the full default feed of the PeptideBenchmark public COA API, keeps a dated snapshot, replaces store names with codes and checks a random sample of lab links over HTTP. Automated fields were corrected against a 100-report hand check; the study page explains the corrections (for example, many reports without a link still print a lab lookup code, and most "disappeared" reports were re-uploaded, not removed). Read the study page before quoting any figure.

## Licence and attribution

The dataset is published under [CC BY 4.0](LICENSE). It is built from the [PeptideBenchmark public COA API](https://peptidebenchmark.com/testing/coas/api/), whose reuse terms ask that record IDs, permalinks, provenance labels and source attribution are preserved when republishing; every row keeps them. Inclusion of a report is not an endorsement of any product, store or laboratory.

Cite as: NuuVive, *The verifiability gap: lab reports posted by research peptide stores* (dataset), Zenodo, https://doi.org/10.5281/zenodo.23712930.
