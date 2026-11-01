---
title: "Privacy-preserving Proximity Testing from Geometric Fuzzy Matching"
context: "Paper, 2026 · ACM ASIA CCS"
authors: "Ioannis Katis, Katerina Mitrokotsa, **Florias Papadopoulos**"
externalUrl: "https://dl.acm.org/doi/10.1145/3779208.3785374"
weight: -1
# The Papers tab shows all of the following when the entry is opened (#anchor opens it directly).
# venue, abstract, keywords and bibtex are taken from the camera-ready version (main.tex).
anchor: "gfm-asiaccs26"
preview: "img/papers/pppt-gfm.jpg"
previewAlt: "A circular proximity region drawn over a city map, split into strips, with two points w and q inside it"
venue: "ACM Asia Conference on Computer and Communications Security (ASIA CCS '26), Bangalore, India"
keywords: [Fuzzy Private Set Intersection, Fuzzy Matching, Proximity Tracking]
links:
  - name: ACM Digital Library
    url: "https://dl.acm.org/doi/10.1145/3779208.3785374"
abstract: |
  Proximity testing is crucial to location-privacy applications, from discovering nearby friends to enabling UAV collision avoidance. In such settings, users must determine proximity without revealing their exact locations. This motivates privacy-preserving proximity testing (PPPT) protocols revealing only if the proximity condition holds, while hiding both parties' inputs. However, most existing PPPT protocols rely on strong assumptions (e.g., non-colluding servers) or require simultaneous interaction, limiting their practicality. Moreover, they typically define proximity using metric distances (e.g., Euclidean distance), failing to support richer membership queries for complex regions like buildings or parks.

  To address these, we introduce a new primitive called *Geometric Fuzzy Matching* (GFM), which generalizes fuzzy matching to arbitrary <i>n</i>-dimensional regions. In GFM, the receiver specifies a region and learns only whether the sender's location lies within it, without revealing either party's input. This approach captures both classical distance-based proximity checks (for any Minkowski ℓ<sub><i>p</i></sub> norm, 1 ≤ <i>p</i> ≤ ∞), as well as membership tests for complex regions, providing a unified framework for diverse proximity queries.

  In low-dimensional settings, our protocol improves on distance-based checks compared to state-of-the-art van Baarsen *et al.* (EUROCRYPT 2024) for ℓ<sub>∞</sub> and maintains stable practical efficiency for ℓ<sub><i>p</i></sub> norms under large distance thresholds or for <i>p</i> ≥ 4, where previous approaches quickly become computationally prohibitive. It is also the *first* to support fuzzy matching over arbitrary geometric regions, enabling proximity queries in complex spaces. Our implementation confirms these results and demonstrates the protocol's efficiency and applicability across diverse PPPT scenarios.
bibtex: |
  @inproceedings{KatisMP26,
    author    = {Ioannis Katis and Katerina Mitrokotsa and
                 Florias Papadopoulos},
    title     = {Privacy-preserving Proximity Testing from
                 Geometric Fuzzy Matching},
    booktitle = {ACM Asia Conference on Computer and
                 Communications Security (ASIA CCS '26)},
    address   = {Bangalore, India},
    publisher = {ACM},
    month     = jun,
    year      = {2026},
    isbn      = {979-8-4007-2356-8},
    doi       = {10.1145/3779208.3785374}
  }
# Listed in the Papers tab and the home page, but no page of its own: links go straight to the ACM page
build:
  render: never
  list: always
  publishResources: false
---
