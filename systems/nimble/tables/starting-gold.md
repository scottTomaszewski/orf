---
id: nimble.tables.starting-gold
type: table
system: nimble
name: Starting gold by level
columns: [level, gold]
rows:
  - [1, 50]
  - [2, 100]
  - [3, 150]
  - [4, 200]
  - [5, 250]
  - [6, 300]
  - [7, 350]
  - [8, 400]
  - [9, 450]
  - [10, 500]
  - [11, 550]
  - [12, 600]
  - [13, 650]
  - [14, 700]
  - [15, 750]
  - [16, 800]
  - [17, 850]
  - [18, 900]
  - [19, 950]
  - [20, 1000]
---
A character created above level 1 starts with 50 gp × level (CR2 p.20). Exists in Phase 1 mainly
so `table("nimble.tables.starting-gold", level, "gold")` has a real target.
