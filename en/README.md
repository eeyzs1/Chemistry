# 🧪 Chemistry · Chemistry Self-Study Center

A fully offline, interactive chemistry study library. One folder per major branch, and one interactive HTML textbook per chapter — concepts are taught through animations, diagrams, and self-test questions. Double-click to start; no internet connection needed.

> 🌐 **Language**: this is the English mirror of the library; the Chinese original lives one level up — see [../README.md](../README.md). Every in-site page carries an **EN / 中文** toggle in the top-right corner for instant switching.

---

## 1. The Branch Map of Chemistry

Chemistry is traditionally built on **"The Five Pillars of Chemistry"** as its backbone (this is essentially how chemistry departments structure their curricula, in China and abroad), and numerous interdisciplinary and specialized branches grow out of that core. This library gives each major branch its own folder.

### 1. The Five Traditional Pillars (the core backbone)

| # | Branch | Subject Matter | Core Questions | Representative Topics (Sub-branches) | Folder |
|---|--------|----------|----------|--------------------|--------|
| 00 | **Foundations** | The common ground shared by the entire discipline | What is matter made of? How do we describe change quantitatively? | Atomic structure, chemical bonding, stoichiometry, solutions | [00-Foundations/](00-Foundations/index.html) |
| 01 | **Inorganic Chemistry** | All elements and compounds beyond carbon skeletons | How do element properties vary systematically across the periodic table? | The periodic law, s/p/d/f block elements, coordination chemistry, acid-base theory, inorganic solid-state chemistry | [01-Inorganic-Chemistry/](01-Inorganic-Chemistry/index.html) |
| 02 | **Organic Chemistry** | Hydrocarbons and their derivatives | How does carbon build molecular skeletons and functional groups? Why do reactions proceed the way they do? | Functional group chemistry, stereochemistry, reaction mechanisms, natural products | [02-Organic-Chemistry/](02-Organic-Chemistry/index.html) |
| 03 | **Analytical Chemistry** | Determining "what a substance contains and how much" | How do we obtain accurate, sensitive, reliable information? | Qualitative/quantitative analysis, titration analysis, spectroscopic analysis, chromatography, mass spectrometry | [03-Analytical-Chemistry/](03-Analytical-Chemistry/index.html) |
| 04 | **Physical Chemistry** | Studying the laws of chemistry with physical and mathematical tools | Why does a change happen? How fast? Where does it lead? | Chemical thermodynamics, chemical kinetics, electrochemistry, quantum chemistry and structural chemistry | [04-Physical-Chemistry/](04-Physical-Chemistry/index.html) |
| 05 | **Biochemistry** | The molecules and reactions inside living organisms | How do life's chemical machines operate? | Proteins/nucleic acids/sugars/lipids, enzymes and metabolism, molecular biology | [05-Biochemistry/](05-Biochemistry/index.html) |

### 2. Interdisciplinary and Specialized Branches (six independent tracks)

| # | Branch | Subject Matter | Intersects With | Folder |
|---|------|----------|----------|--------|
| 06 | **Polymer Chemistry** | Giant molecules built from repeating units | Organic + Materials | [06-Polymer-Chemistry/](06-Polymer-Chemistry/index.html) |
| 07 | **Materials Chemistry** | Design, synthesis, and structure of functional materials | Inorganic + Physical + Engineering | [07-Materials-Chemistry/](07-Materials-Chemistry/index.html) |
| 08 | **Environmental Chemistry** | Chemical processes in the atmosphere/water/soil and pollution control | All branches + Earth sciences | [08-Environmental-Chemistry/](08-Environmental-Chemistry/index.html) |
| 09 | **Theoretical & Computational Chemistry** | Modeling molecules with mathematics and computer simulation | Physical chemistry + Computer science | [09-Theoretical-and-Computational-Chemistry/](09-Theoretical-and-Computational-Chemistry/index.html) |
| 10 | **Medicinal Chemistry** | Designing and optimizing drug molecules | Organic + Biochemistry + Medicine | [10-Medicinal-Chemistry/](10-Medicinal-Chemistry/index.html) |
| 11 | **Nuclear & Radiochemistry** | Nuclear reactions, decay, and isotope applications | Physics + Medicine + Energy | [11-Nuclear-and-Radiochemistry/](11-Nuclear-and-Radiochemistry/index.html) |

### 3. Quick Reference: Where the Finer Sub-branches Belong

Once you have studied the main branches, every "finer direction" below has a clear home:

- **Electrochemistry** → Physical Chemistry (batteries, electrolysis, corrosion)
- **Spectroscopy / Chromatography** → Analytical Chemistry (UV, IR, NMR, GC-MS)
- **Stereochemistry** → Organic Chemistry (chirality and conformation)
- **Coordination chemistry** → Inorganic Chemistry (complexes and their central metals)
- **Surface and interface chemistry** → Physical Chemistry (catalysis, adsorption)
- **Chemical biology** → Biochemistry (studying life with chemical probes)
- **Protein engineering / Enzyme engineering** → Biochemistry
- **Nanochemistry** → Materials Chemistry
- **Green chemistry** → Environmental Chemistry (cleaner syntheses and processes)
- **Quantum chemistry** → Theoretical & Computational Chemistry / Physical Chemistry

---

## 2. Directory Structure

```
F:\Chemistry\en\
├── README.md                                                 ← this file: branch map + study routes
├── index.html                                                ← portal page (enter any branch from here)
├── assets\                                                   ← shared styles and the interactive engine (style.css, tutor.js)
├── 00-Foundations\                                           ← start here: the common foundation (4 chapters)
├── 01-Inorganic-Chemistry\                                   (4 chapters)
├── 02-Organic-Chemistry\                                     (4 chapters)
├── 03-Analytical-Chemistry\                                  (3 chapters)
├── 04-Physical-Chemistry\                                    (4 chapters)
├── 05-Biochemistry\                                          (3 chapters)
└── 06-Polymer-Chemistry\ … 11-Nuclear-and-Radiochemistry\    (1 intro chapter each)
```

Inside each branch folder: `index.html` (the branch overview page — what you will study, why it matters, and chapter navigation) plus the numbered chapters. This `en\` tree mirrors the Chinese original at the repository root, branch by branch.

---

## 3. Suggested Study Routes

```
              ┌───────────────────────────────────────────────────────────┐
              │ 00 Foundations (atoms, bonds, stoichiometry, solutions)   │
              └──────┬──────────────────┬───────────────────────┬────────┘
                     │                  │                       │
              ┌──────▼───────┐   ┌──────▼───────┐        ┌──────▼───────┐
              │ 01 Inorganic │   │ 02 Organic   │        │ 04 Physical  │
              └──────┬───────┘   └──────┬───────┘        └──────┬───────┘
                     │            ┌─────┴────────┐              │
              ┌──────▼───────┐    │ 05 Biochemistry │    ┌──────▼─────────────┐
              │ 07 Materials │    └──────┬────────┘    │ 09 Theory & Computation │
              └──────────────┘           │             └────────────────────┘
                                  ┌──────▼───────┐
                                  │ 10 Medicinal │
                                  └──────────────┘
   03 Analytical: can be studied in parallel any time after 00 (draws on the solutions and stoichiometry of Foundations)
   06 Polymer / 08 Environmental / 11 Nuclear: study after 00 + the corresponding base branch
```

- **Systematic route (recommended)**: 00 → 01 → 02 → 04 → 03 → 05, then continue into 06–11 by interest
- **Quick interest route** (life & medicine): 00 → 02 → 05 → 10
- **Physical-sciences route** (materials & theory): 00 → 01 → 04 → 07 → 09

> Each branch's `index.html` states its **prerequisites** — when in doubt, read that first.

---

## 4. How to Use the Textbooks

1. **How to open**: double-click any `index.html` (or chapter file) to read it in your browser — fully offline, no server required.
2. **Every chapter has these components built in**:
   - 🪜 **Three-level explanation ladder**: `Intuition → Standard Treatment → Deeper Theory` — the same concept at whichever depth you can absorb, and you can move up or down at any time;
   - ⚠️ **Misconception Buster**: lists the most common wrong ideas about the topic and presents the correct picture;
   - 🪜 **Worked-Example Scaffold**: full worked demonstration → guided practice with hints → independent practice (answers expandable), with support fading step by step;
   - 💭 **Think prompts**: Socratic prompts — reason it out yourself first, then click to compare;
   - 🎬 **Interactive animations/simulations**: orbitals, titration curves, energy diagrams, radioactive decay and more, all operable with buttons and sliders;
   - ✅ **End-of-chapter self-test**: instant scoring + per-question explanations.
3. **Suggested pace**: 30–60 minutes per chapter; start with the intuition level, move up to the standard level once you can retell it, and move on after scoring 80%+ on the self-test.
4. **Progress tracking**: your end-of-chapter self-test scores are stored locally in your browser (localStorage — no network, no upload).
   Reopening the same chapter shows your "best score"; the chapter cards on the branch overview pages show ✓ Passed (≥80%) or your recent best score.
   Clear your browser data to reset progress.
5. **Accessibility & power saving**: the whole site respects the system reduced-motion setting (prefers-reduced-motion: animations switch to static result displays);
   persistent simulation animations run only while they are on screen and the page is in the foreground, auto-pausing as soon as they scroll out of view.

---

## 5. Pedagogy Notes

The making of this courseware drew on the following open-source teaching skills (agent skills):

- [socratic-teaching-scaffolds](https://skills.sh/lyndonkl/claude/socratic-teaching-scaffolds) (lyndonkl/claude): question ladders, misconception detection, Feynman-style multi-level explanations, faded worked-example scaffolds, cognitive apprenticeship;
- [gentle-teaching](https://skills.sh/jwynia/agent-skills/gentle-teaching) (jwynia/agent-skills): process over answers, scaffolded support;
- [teaching-resource-generator](https://skills.sh/partme-ai/full-stack-skills/teaching-resource-generator) (partme-ai/full-stack-skills): a textbook-production workflow of needs analysis → content design → format optimization.

The design specification follows the accessibility and typography criteria of the [ui-ux-pro-max](https://www.skills.sh) skill library (contrast ≥ 4.5:1, 16px body text, 1.7 line height, restrained animation that respects the system reduced-motion setting).
